import { NextResponse } from "next/server";
import { getInventory } from "@/lib/baserow";
import { searchRecipes } from "@/lib/rag";
import Groq from "groq-sdk";

const GROQ_MODEL = process.env.GROQ_MODEL || "groq/compound";
const RETRIEVAL_TOP_K = 6;

const SYSTEM_PROMPT = `당신은 한국어로만 답하는 바텐더입니다. 사용자 질문에 직접 답하세요. 마크다운 기호 사용 금지. 참고 레시피가 제공되면 그 안의 칵테일 이름만 사용하고, 관련 없는 질문에는 무시하세요.`;

// Simple heuristic to detect intent from the user's latest message.
// This is only used to decide *whether to include* retrieval / inventory
// context — the LLM makes the final decision on what to say.
function needsInventoryContext(text: string): boolean {
    return /내\s*재고|내가\s*가진|우리\s*집|술장|보유|가지고\s*있는/.test(text);
}

function looksLikeRecipeQuery(text: string): boolean {
    // Never attach RAG when the user is asking about price / market info —
    // that must be answered via price-link shortcut, not our recipe DB.
    if (isPriceQuery(text)) return false;
    // Positive signals: cocktail/food pairing keywords.
    if (/칵테일|안주|어울리는|추천|같이|페어링|마실|드시|드실|추천해|먹을|레시피|만드는\s*법/.test(text)) {
        return true;
    }
    // Fallback: very short prompts might be bare item names — but only if they
    // don't contain interrogative particles that suggest a knowledge question.
    if (text.length < 20 && !/뭐야|무엇|뭔가|알려|설명|어떤|어떻게|왜/.test(text)) {
        return true;
    }
    return false;
}

function buildContextBlock(sections: { title: string; body: string }[]): string {
    return sections
        .filter(s => s.body.trim().length > 0)
        .map(s => `<${s.title}>\n${s.body}\n</${s.title}>`)
        .join("\n\n");
}

// Match questions asking about price / availability / where to buy.
function isPriceQuery(text: string): boolean {
    if (/얼마|가격|값|시세|판매|사는\s*곳|파는\s*곳|구매|배송|주문|재고\s*있/.test(text)) return true;
    // Loose "어디 ... (사|살|파|팔|구할|구입|구매)" match — allows "어디서 살 수 있어"
    if (/어디.{0,8}(사|살|팔|파|구할|구입|구매)/.test(text)) return true;
    return false;
}

// Strip the price-related noise so the leftover is a clean product name.
function extractProductName(text: string): string {
    return text
        .replace(/[?？!!。.,、\n]+/g, " ")
        // "어디 ... (사|살|팔|파|구할|구입|구매) ... (수 있어|수 있을까|있나요)"
        .replace(/어디.{0,8}(사|살|팔|파|구할|구입|구매)(\s*(수|을))?(\s*(있|없))?(어|을까|나요|을까요|어\?|어요)?/g, " ")
        .replace(/얼마야|얼마|가격이|가격|값이|값|시세|판매하는|판매|사는\s*곳|파는\s*곳|구매|배송|주문|재고|알려줘|알려|어때|어떤|어떻게|한\s*병|1\s*병|정도/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

interface PriceLink {
    title: string;
    url: string;
    site: string;
}

function buildPriceLinks(query: string): PriceLink[] {
    const q = encodeURIComponent(query);
    return [
        {
            site: "naver",
            title: "네이버 쇼핑",
            url: `https://search.shopping.naver.com/search/all?query=${q}`,
        },
        {
            site: "dailyshot",
            title: "데일리샷",
            url: `https://www.google.com/search?q=${q}+site%3Adailyshot.co`,
        },
        {
            site: "ehomebar",
            title: "이홈바",
            url: `https://www.google.com/search?q=${q}+site%3Aehomebar.com`,
        },
        {
            site: "google",
            title: "구글 검색",
            url: `https://www.google.com/search?q=${q}+%EA%B0%80%EA%B2%A9`,
        },
    ];
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const uid: string | undefined = body.uid;
        const clientMessages: { role: "user" | "assistant"; content: string }[] = body.messages || [];

        if (!uid) return NextResponse.json({ error: "User UID is required." }, { status: 400 });
        if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
            return NextResponse.json({ error: "messages array required" }, { status: 400 });
        }
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: "GROQ_API_KEY missing on server" }, { status: 500 });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const lastUser = [...clientMessages].reverse().find(m => m.role === "user")?.content || "";

        // --- Price / where-to-buy shortcut ---
        // We can't fetch live prices reliably, and letting the LLM guess produces
        // hallucinated numbers. Instead, hand off to real marketplaces via links.
        if (isPriceQuery(lastUser)) {
            const productName = extractProductName(lastUser) || lastUser.trim();
            const priceLinks = buildPriceLinks(productName);
            return NextResponse.json({
                answer: `실시간 가격은 판매처마다 다르고 자주 바뀌어서 정확한 시세를 알려드리기는 어려워요. "${productName}" 아래 판매처 링크에서 바로 확인해 보세요.`,
                recipeCards: [],
                priceLinks,
            });
        }

        // --- Retrieval: attach top-K similar recipes as context ---
        let retrievedForCards: { name: string; detail: string; ingredients?: string; make?: string }[] = [];
        let recipeContext = "";
        if (looksLikeRecipeQuery(lastUser)) {
            try {
                const results = await searchRecipes(lastUser, { topK: RETRIEVAL_TOP_K });
                if (results.length > 0) {
                    recipeContext = results.map((r, i) => {
                        const parts = [`${i + 1}. ${r.name}`];
                        if (r.ingredients) parts.push(`   재료: ${r.ingredients}`);
                        if (r.make || r.instructions) parts.push(`   제조법: ${r.make || r.instructions}`);
                        if (r.glass) parts.push(`   잔: ${r.glass}`);
                        return parts.join("\n");
                    }).join("\n\n");

                    retrievedForCards = results.map(r => ({
                        name: r.name,
                        ingredients: r.ingredients,
                        make: r.make || r.instructions,
                        detail: [
                            r.info ? r.info : "",
                            r.ingredients ? `[재료]\n${r.ingredients}` : "",
                            (r.make || r.instructions) ? `[제조법]\n${r.make || r.instructions}` : "",
                            r.glass ? `[잔] ${r.glass}` : "",
                        ].filter(Boolean).join("\n\n"),
                    }));
                }
            } catch (e) {
                console.warn("RAG search failed, continuing without context:", (e as Error).message);
            }
        }

        // --- Inventory: attach only when user seems to want it ---
        let inventoryContext = "";
        if (needsInventoryContext(lastUser)) {
            try {
                const inv = await getInventory(uid);
                inventoryContext = inv.map(i => `- ${i.name} (${i.category?.value || "기타"})`).join("\n");
            } catch (e) {
                console.warn("Inventory fetch failed:", (e as Error).message);
            }
        }

        const contextBlock = buildContextBlock([
            { title: "참고 레시피", body: recipeContext },
            { title: "사용자 재고", body: inventoryContext },
        ]);

        // Compose messages: system prompt (with context appended) + conversation.
        const finalSystem = contextBlock
            ? `${SYSTEM_PROMPT}\n\n다음은 이번 답변에 참고할 수 있는 정보입니다. 반드시 필요한 경우에만 활용하세요.\n\n${contextBlock}`
            : SYSTEM_PROMPT;

        const messages: any[] = [
            { role: "system", content: finalSystem },
            ...clientMessages.map(m => ({ role: m.role, content: m.content })),
        ];

        // Compound models manage their own generation params (temperature,
        // max_tokens, tool rounds) — passing them triggers 400/413. So for
        // compound we only pass model + messages; plain LLMs get the extras.
        //
        // Groq compound sometimes returns 413 (Request Entity Too Large) when
        // web-search results balloon (common for price / market queries on the
        // free tier). Fall back to a plain LLM so the user still gets *some*
        // answer instead of an error.
        const isCompound = /compound/.test(GROQ_MODEL);
        const FALLBACK_MODEL = "llama-3.1-8b-instant";
        let completion;
        try {
            completion = await groq.chat.completions.create(
                isCompound
                    ? ({ model: GROQ_MODEL, messages } as any)
                    : { model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: 1500 }
            );
        } catch (e: any) {
            const status = e?.status;
            if (isCompound && (status === 413 || status === 400)) {
                console.warn(`[Chatbot] compound returned ${status} — falling back to ${FALLBACK_MODEL}`);
                completion = await groq.chat.completions.create({
                    model: FALLBACK_MODEL,
                    messages: [
                        ...messages,
                        { role: "system", content: "웹 검색을 사용할 수 없어요. 알고 있는 지식으로만 답변하세요. 최신 가격이나 시세는 정확히 알 수 없으니, 대략적인 참고 정보만 제공하고 정확한 가격은 판매처를 직접 확인하라고 안내하세요." }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500,
                });
            } else {
                throw e;
            }
        }
        const rawText = completion.choices[0]?.message?.content || "";
        const answer = rawText.replace(/\*\*|##|---|`/g, "").trim();

        // Only surface cards for recipes the assistant actually mentioned by name.
        const mentioned = retrievedForCards.filter(r =>
            answer.includes(r.name)
        );
        const recipeCards = mentioned.map(({ name, detail }) => ({ name, detail }));

        return NextResponse.json({ answer, recipeCards });
    } catch (error: any) {
        console.error("[Chatbot RAG Error]", error?.stack || error);
        return NextResponse.json({ error: "서버 오류", message: error?.message }, { status: 500 });
    }
}
