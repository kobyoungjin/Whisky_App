import { NextResponse } from "next/server";
import { getInventory } from "@/lib/baserow";

export async function POST(req: Request) {
    try {
        const { food, scenario, uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: "User UID is required." }, { status: 400 });
        }

        // 1. Baserow에서 재고 가져오기
        const inventory = await getInventory(uid);
        const liquorList = inventory
            .map(item => `- ${item.name} (${item.category?.value || "기타"})`)
            .join("\n");

        if (!liquorList) {
            return NextResponse.json({
                answer: "현재 술장에 등록된 술이 없네요! 술을 먼저 등록해 주시면 안주에 딱 맞는 칵테일을 추천해 드릴 수 있어요. 🥃"
            });
        }

        // 2. OpenAI API 호출
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API Key is missing." }, { status: 500 });
        }

        const prompt = `
당신은 친근하고 위트 있는 전문 바텐더입니다. 사용자의 상황과 보유한 술, 그리고 안주 정보를 바탕으로 최고의 칵테일을 추천해 주세요.

[상황]
${scenario}

[보유 주류 목록]
${liquorList}

[사용자가 입력한 안주]
${food}

위 정보를 바탕으로 다음 내용을 포함해 답변해 주세요:
1. 술장에 있는 술을 활용한 칵테일 레시피 1개 추천.
2. 편의점에서 쉽게 살 수 있는 부재료(쿨피스, 우유, 아이스크림, 탄산수 등)를 활용한 '꿀조합' 팁 1개 포함.
3. 말투는 친근하고 센스 있는 바텐더 스타일로 (한글로 답변).

답변은 마크다운 형식을 적절히 사용하여 읽기 편하게 작성해 주세요.
`.trim();

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "당신은 위트 있는 전문 바텐더입니다." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error("OpenAI API Error:", data.error);
            return NextResponse.json({ error: "AI 추천을 가져오는 중 오류가 발생했습니다." }, { status: 500 });
        }

        const answer = data.choices[0].message.content;

        return NextResponse.json({ answer });
    } catch (error: any) {
        console.error("Chatbot API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
