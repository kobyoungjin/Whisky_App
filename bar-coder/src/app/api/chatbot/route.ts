import { NextResponse } from "next/server";
import { getInventory } from "@/lib/baserow";

export async function POST(req: Request) {
    try {
        const { food, uid, recipes, searchMode } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: "User UID is required." }, { status: 400 });
        }

        const inventory = await getInventory(uid);
        const liquorList = inventory
            .map(item => `- ${item.name} (${item.category?.value || "기타"})`)
            .join("\n");

        if (!liquorList && !recipes && searchMode !== "all") {
            return NextResponse.json({
                answer: "현재 술장에 등록된 술이 없네요! 술을 먼저 등록해 주시면 안주에 딱 맞는 칵테일을 추천해 드릴 수 있어요. 🥃"
            });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Google API Key is missing." }, { status: 500 });
        }

        const model = process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash";

        let prompt = "";

        if (searchMode === "all" || searchMode === "inventory") {
            const recipeNames = recipes ? recipes.map((r: any) => r.name).join(", ") : "전체 레시피";
            const inventorySection = searchMode === "inventory"
                ? `보유 주류:\n${liquorList}\n\n`
                : "";

            // 주의: 이 템플릿 문자열 내의 들여쓰기는 AI에게 전달됩니다.
            // 절대로 들여쓰기를 추가하지 마세요.
            prompt =
                `당신은 전문 바텐더입니다. 안주와 어울리는 칵테일 2~3개를 추천해 주세요.

안주: ${food}
${inventorySection}후보 레시피: ${recipeNames}

아래 형식을 그대로 따라 답변하세요. 형식 이외 다른 내용은 출력하지 마세요.
각 항목과 단계 사이에는 반드시 한 줄씩 띄우세요.

ANSWER: (안주에 대한 짧고 위트있는 바텐더 멘트)

COCKTAIL: (칵테일 이름)
[제조 순서와 용량]: (1번 단계 내용)

(2번 단계 내용)

(3번 단계 내용)

[대체제]: (대체 재료 팁 1)

(대체 재료 팁 2)

[편의점 추천]: (편의점에서 구할 수 있는 대안 또는 추천 안주)

COCKTAIL: (두 번째 칵테일 이름)
[제조 순서와 용량]: (1번 단계 내용)

(2번 단계 내용)

[대체제]: (대체 재료 팁)

[편의점 추천]: (편의점에서 구할 수 있는 대안 또는 추천 안주)`;
        } else {
            prompt = `당신은 바텐더입니다. 안주(${food})와 어울리는 칵테일 하나를 마크다운 없이 대화체로 추천해 주세요.`;
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 8192,
                    }
                }),
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", JSON.stringify(data.error));
            return NextResponse.json({ error: `API 오류: ${data.error.message}` }, { status: 500 });
        }

        const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!rawText) {
            console.error("Gemini 빈 응답:", JSON.stringify(data));
            return NextResponse.json({ error: "AI가 응답을 생성하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
        }

        // 마크다운 기호 제거
        const cleanText = rawText.replace(/\*\*|###|---|`/g, "").trim();

        if (searchMode === "all" || searchMode === "inventory") {
            // 1. ANSWER: 부분 추출
            const answerMatch = cleanText.match(/ANSWER:\s*([\s\S]*?)(?=COCKTAIL:|$)/i);
            const answer = answerMatch ? answerMatch[1].trim() : "칵테일 추천 결과를 확인해 보세요!";

            // 2. 각 COCKTAIL: 블록 추출
            const cocktailBlocks = cleanText.split(/COCKTAIL:\s*/i).slice(1);

            const recommendations = cocktailBlocks.map((block) => {
                const lines = block.split("\n");
                const name = lines[0].trim();
                const detail = lines.slice(1).join("\n").trim();

                // 단일 줄바꿈을 이중 줄바꿈으로 보정 (AI 불일치 대응)
                const fixedDetail = detail.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");

                return { name, detail: fixedDetail };
            }).filter(r => r.name.length > 0);

            return NextResponse.json({ answer, recommendations });
        }

        return NextResponse.json({ answer: cleanText });

    } catch (error: any) {
        console.error("Chatbot API Error:", error);
        return NextResponse.json({ error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
    }
}
