import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: "이미지 데이터가 필요합니다." }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key가 없습니다." }, { status: 500 });
        }

        const model = process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash";

        const prompt = `이 이미지에 있는 술병을 분석해 주세요.
반드시 아래 형식으로만 답변하세요. 다른 내용은 출력하지 마세요.

NAME: (술의 정확한 이름, 없으면 "인식 불가")
CATEGORY: (위스키/진/럼/보드카/데킬라/와인/소주/리큐르/맥주/기타 중 하나)
ABV: (도수 숫자만, 모르면 0)
VOLUME: (용량 ml 숫자만, 모르면 700)
INFO: (이 술에 대한 짧은 설명, 1-2문장)`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, "")
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 512,
                    }
                }),
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error("Gemini Vision Error:", data.error);
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!rawText) {
            return NextResponse.json({ error: "AI가 이미지를 분석하지 못했습니다." }, { status: 500 });
        }

        // 파싱
        const nameMatch = rawText.match(/NAME:\s*(.+)/i);
        const categoryMatch = rawText.match(/CATEGORY:\s*(.+)/i);
        const abvMatch = rawText.match(/ABV:\s*(\d+\.?\d*)/i);
        const volumeMatch = rawText.match(/VOLUME:\s*(\d+)/i);
        const infoMatch = rawText.match(/INFO:\s*([\s\S]+)/i);

        const name = nameMatch?.[1]?.trim() || "인식 불가";
        const category = categoryMatch?.[1]?.trim() || "기타";
        const abv = parseFloat(abvMatch?.[1] || "0");
        const volume = parseInt(volumeMatch?.[1] || "700");
        const info = infoMatch?.[1]?.trim() || "";

        return NextResponse.json({ name, category, abv, volume, info });

    } catch (error: any) {
        console.error("Scan API Error:", error);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
