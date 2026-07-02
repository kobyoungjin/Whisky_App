import { NextResponse } from "next/server";
import { getInventory, getAllTastingNotes } from "@/lib/baserow";
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

// Match questions asking the bot to analyze the user's taste / suggest
// new bottles based on their history. When this fires we attach the user's
// inventory + tasting notes so the LLM can reason over actual data instead
// of hallucinating.
function isTasteAnalysisQuery(text: string): boolean {
    // "my preferences" family
    if (/내\s*취향|나\s*취향|취향\s*분석|취향을?\s*알려|내가\s*좋아|어떤\s*스타일|내\s*스타일|내\s*노트\s*분석|내\s*(평점|별점)|내\s*컬렉션|내\s*재고\s*분석/.test(text)) return true;
    // "next / new bottle" family
    if (/(다음|다음번|이번에|앞으로|새로|새).{0,15}(위스키|보틀|술|병)/.test(text)) return true;
    // "recommend a whisky" family (bare recommendation intent)
    if (/(위스키|보틀).{0,15}(추천|사면\s*좋|사야|살\s*만|살\s*까)/.test(text)) return true;
    return false;
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
        // Skip when the user is asking for taste analysis — that flow is about
        // whiskies, not cocktail recipes, and mixing both contexts confuses
        // the model (it starts recommending cocktails instead of bottles).
        let retrievedForCards: { name: string; detail: string; ingredients?: string; make?: string }[] = [];
        let recipeContext = "";
        if (!isTasteAnalysisQuery(lastUser) && looksLikeRecipeQuery(lastUser)) {
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

        // --- Taste analysis: attach inventory + all tasting notes ---
        // Triggered by "내 취향", "다음에 뭐 사", "내 노트 분석" 등.
        // We do this branch *before* the plain inventory attach because taste
        // analysis needs both inventory and notes, and needs the LLM to be
        // instructed to reason over them.
        let inventoryContext = "";
        let tastingContext = "";
        let tasteAnalysisMode = false;

        if (isTasteAnalysisQuery(lastUser)) {
            tasteAnalysisMode = true;
            try {
                const [inv, notes] = await Promise.all([
                    getInventory(uid),
                    getAllTastingNotes(uid),
                ]);
                inventoryContext = inv.map(i =>
                    `- ${i.name} (${i.category?.value || "기타"}, ABV ${i.abv}%)`
                ).join("\n");

                // Aggregate to a compact per-bottle summary to keep prompt tokens
                // well under Groq's free-tier TPM (~8k). We only include the
                // latest note per bottle (with average rating across all notes),
                // and truncate long free-text fields.
                const truncate = (s: string | undefined, max: number) =>
                    !s ? "" : (s.length > max ? s.slice(0, max) + "…" : s);
                const notesByItem = new Map<number, typeof notes>();
                for (const n of notes) {
                    if (!n.inventory_id) continue;
                    const list = notesByItem.get(n.inventory_id) ?? [];
                    list.push(n);
                    notesByItem.set(n.inventory_id, list);
                }
                const noteBlocks: string[] = [];
                for (const item of inv) {
                    const list = notesByItem.get(item.id);
                    if (!list || list.length === 0) continue;
                    const ratings = list
                        .map(n => (n.rating !== undefined && n.rating !== null && n.rating !== "") ? Number(n.rating) : null)
                        .filter((r): r is number => r !== null);
                    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;
                    const avgLine = avg !== null ? `별점 평균 ${(avg * 20).toFixed(0)}%` : "";
                    // Take just the most recent note (list is already newest-first from Baserow).
                    const latest = list[0];
                    const parts: string[] = [];
                    if (avgLine) parts.push(avgLine);
                    if (latest.nose) parts.push(`향: ${truncate(latest.nose, 80)}`);
                    if (latest.palate) parts.push(`맛: ${truncate(latest.palate, 80)}`);
                    if (latest.finish) parts.push(`여운: ${truncate(latest.finish, 60)}`);
                    if (latest.overall) parts.push(`총평: ${truncate(latest.overall, 100)}`);
                    noteBlocks.push(`- ${item.name} (${list.length}회 기록) — ${parts.join(" / ")}`);
                }
                tastingContext = noteBlocks.join("\n");
            } catch (e) {
                console.warn("Taste analysis fetch failed:", (e as Error).message);
            }
        } else if (needsInventoryContext(lastUser)) {
            // Regular inventory attach (not analysis).
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
            { title: "사용자 테이스팅 노트", body: tastingContext },
        ]);

        // Compose messages: system prompt (with context appended) + conversation.
        const analysisDirective = tasteAnalysisMode ? `

지금 사용자는 자신의 취향 분석 또는 다음에 마셔볼 위스키 추천을 요청하고 있습니다. 아래 <사용자 재고>와 <사용자 테이스팅 노트>를 근거로 다음을 답변에 포함하세요:
1. 별점이 높은 위스키에서 반복되는 향·맛·여운 키워드로 추정한 사용자 취향 요약 (예: "달콤한 셰리 계열을 선호하는 경향")
2. 아직 시도하지 않은 스타일 또는 재고에 없는 카테고리 언급 (예: "피트 위스키는 아직 없네요")
3. 다음에 사볼 만한 실제 위스키 2~3개 구체적 추천, 이유와 함께
답변은 마크다운 없이 6~10문장으로 정리하세요.` : "";

        const finalSystem = contextBlock
            ? `${SYSTEM_PROMPT}${analysisDirective}\n\n다음은 이번 답변에 참고할 수 있는 정보입니다. 반드시 필요한 경우에만 활용하세요.\n\n${contextBlock}`
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
        // Taste analysis never needs web search — its whole job is to reason
        // over the user's local data. Route it to a strong non-compound model:
        // - 70B has better real-whisky knowledge (fewer hallucinated names)
        // - Bypasses compound's low TPM which the note context easily exceeds
        // Fallback to 8b if 70B rate-limits.
        const FALLBACK_MODEL = "llama-3.1-8b-instant";
        const TASTE_MODEL = "llama-3.3-70b-versatile";
        const activeModel = tasteAnalysisMode ? TASTE_MODEL : GROQ_MODEL;
        const isCompound = /compound/.test(activeModel);
        let completion;
        try {
            completion = await groq.chat.completions.create(
                isCompound
                    ? ({ model: activeModel, messages } as any)
                    : { model: activeModel, messages, temperature: 0.7, max_tokens: 1500 }
            );
        } catch (e: any) {
            const status = e?.status;
            // 413 = compound web search results too big
            // 400 = compound rejected params
            // 429 = rate limit (both compound and 70B have tight free-tier TPM)
            const shouldFallback = (isCompound && (status === 413 || status === 400)) || status === 429;
            if (shouldFallback && activeModel !== FALLBACK_MODEL) {
                console.warn(`[Chatbot] ${activeModel} returned ${status} — falling back to ${FALLBACK_MODEL}`);
                completion = await groq.chat.completions.create({
                    model: FALLBACK_MODEL,
                    messages: [
                        ...messages,
                        { role: "system", content: "제공된 컨텍스트만으로 답변하세요. 위스키 이름을 지어내지 말고 확실히 아는 실존 위스키만 언급하세요. 확신이 없다면 특정 이름 대신 스타일 설명만 하세요." }
                    ],
                    temperature: 0.5,
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
