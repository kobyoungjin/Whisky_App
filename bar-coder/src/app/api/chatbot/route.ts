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

        const model = process.env.GOOGLE_GEMINI_MODEL || "gemini-2.0-flash";

        let prompt = "";

        if (searchMode === "all" || searchMode === "inventory") {
            const recipeNames = recipes ? recipes.map((r: any) => r.name).join(", ") : "전체 레시피";
            const inventorySection = searchMode === "inventory"
                ? `보유 주류:\n${liquorList}\n\n`
                : "";

            prompt =
                `당신은 전문 바텐더입니다. 안주와 어울리는 칵테일 2~3개를 추천해 주세요.

안주: ${food}
${inventorySection}후보 레시피: ${recipeNames}

아래 형식을 그대로 따라 답변하세요. 형식 이외 다른 내용은 출력하지 마세요.
각 항목과 단계 사이에는 반드시 한 줄씩 띄우세요.

ANSWER: (안주에 대한 짧고 위트있는 바텐더 멘트)

COCKTAIL: (칵테일 이름)
[제조 순서와 용량]:
(1번 단계 내용)

(2번 단계 내용)

(3번 단계 내용)

[대체제]: (대체 재료 팁 1)

(대체 재료 팁 2)

[편의점 추천]: (편의점에서 구할 수 있는 대안 또는 추천 안주)

COCKTAIL: (두 번째 칵테일 이름)
[제조 순서와 용량]:
(1번 단계 내용)

(2번 단계 내용)

[대체제]: (대체 재료 팁)

[편의점 추천]: (편의점에서 구할 수 있는 대안 또는 추천 안주)`;
        } else if (searchMode === "food_recommendation") {
            prompt = `당신은 전문 바텐더입니다. 사용자가 입력한 칵테일(${food})의 맛과 향의 특징을 분석하고, 이와 가장 잘 어울리는 안주 궁합을 2~3가지 추천해 주세요. 
            
추천에는 다음 내용이 포함되어야 합니다:
1. 해당 칵테일의 특징 (짧게)
2. 추천하는 일반 안주 요리
3. 편의점에서 쉽게 구할 수 있는 최고의 안주 조합

마크다운 없이 친절하고 위트 있는 대화체로 답변해 주세요.`;
        } else {
            prompt = `당신은 바텐더입니다. 안주(${food})와 어울리는 칵테일 하나를 마크다운 없이 대화체로 추천해 주세요.`;
        }

        console.log("Chatbot Prompt Length:", prompt.length);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Referer": "http://localhost:3000",
                    "Origin": "http://localhost:3000"
                },
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

        if (!response.ok) {
            console.error(`[Gemini API Error] Status: ${response.status}`, JSON.stringify(data));
            return NextResponse.json({ 
                error: `API Call Failed (${response.status})`,
                details: data.error?.message || "Check server logs"
            }, { status: 500 });
        }

        const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!rawText) {
            console.error("[Gemini API Empty Response]", JSON.stringify(data));
            return NextResponse.json({ error: "AI 응답 생성 실패 (Empty)" }, { status: 500 });
        }

        // 마크다운 기호 제거
        const cleanText = rawText.replace(/\*\*|###|---|`/g, "").trim();

        if (searchMode === "all" || searchMode === "inventory") {
            // ... (생략된 기존 파싱 로직)
            // 1. ANSWER: 부분 추출
            const answerMatch = cleanText.match(/ANSWER:\s*([\s\S]*?)(?=COCKTAIL:|$)/i);
            const answer = answerMatch ? answerMatch[1].trim() : "추천 결과를 확인해 보세요!";

            const cocktailBlocks = cleanText.split(/COCKTAIL:\s*/i).slice(1);
            const recommendations = cocktailBlocks.map((block) => {
                const lines = block.split("\n");
                const name = lines[0].trim();
                const detail = lines.slice(1).join("\n").trim();
                // 텍스트 보정: 라벨 뒤에 즉시 내용이 다음 줄에 오도록 (\n 하나만)
                const fixedDetail = detail
                    .replace(/\[제조 순서와 용량\]:\s*/i, "[제조 순서와 용량]:\n")
                    .replace(/\[대체제\]:\s*/i, "[대체제]:\n")
                    .replace(/\[편의점 추천\]:\s*/i, "[편의점 추천]:\n")
                    .trim();

                return { name, detail: fixedDetail };
            }).filter(r => r.name.length > 0);

            return NextResponse.json({ answer, recommendations });
        }

        return NextResponse.json({ answer: cleanText });

    } catch (error: any) {
        console.error("[Chatbot API Critical Error]", error.stack || error);
        return NextResponse.json({ 
            error: "서버 내부 오류", 
            message: error.message 
        }, { status: 500 });
    }
}
