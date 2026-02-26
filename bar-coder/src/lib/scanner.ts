import axios from "axios";

const VISION_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY;

export interface ExtractedBottleData {
    name: string;
    abv: number;
    volume: number;
    category: string;
    rawText: string;
}

/**
 * Google Vision API를 호출하여 이미지(Base64)에서 텍스트를 추출하는 함수
 */
export async function analyzeImageWithVisionAPI(base64Image: string): Promise<string> {
    if (!VISION_API_KEY) {
        console.warn("Vision API Key is missing. Returning dummy text.");
        // 더미 데이터 (비전 API 키 없이 테스트용)
        return "GLENFIDDICH\nSINGLE MALT SCOTCH WHISKY\nAGED 12 YEARS\n700ml 40% VOL";
    }

    // Base64 문자열에서 헤더(data:image/jpeg;base64,) 제거
    const base64Data = base64Image.split(",")[1] || base64Image;

    const requestBody = {
        requests: [
            {
                image: {
                    content: base64Data,
                },
                features: [
                    {
                        type: "TEXT_DETECTION",
                        maxResults: 10,
                    },
                ],
            },
        ],
    };

    try {
        const response = await axios.post(
            `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
            requestBody
        );

        const annotations = response.data.responses[0]?.textAnnotations;
        if (annotations && annotations.length > 0) {
            // annotations[0].description에 전체 텍스트가 줄바꿈으로 포함됨
            return annotations[0].description;
        }
        return "";
    } catch (error) {
        console.error("Vision API Error:", error);
        throw error;
    }
}

/**
 * 추출된 텍스트에서 이름, 도수, 용량, 카테고리를 추론하는 파싱 로직
 */
export function parseLabelText(text: string): ExtractedBottleData | null {
    if (!text) return null;

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const fullText = text.toUpperCase();

    // 1. 도수 파싱 (예: 40%, 43.1% vol, 40 % alc)
    let abv = 0;
    const abvMatch = fullText.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:%|VOL|ALC)/);
    if (abvMatch) {
        abv = parseFloat(abvMatch[1]);
    }

    // 2. 용량 파싱 (예: 700ml, 75cl, 1L)
    let volume = 0;
    const mlMatch = fullText.match(/(\d{2,4})\s*(?:ML)/);
    const clMatch = fullText.match(/(\d{2,3})\s*(?:CL)/);
    const lMatch = fullText.match(/(\d(?:\.\d)?)\s*(?:L|LITRE|LITER)/);

    if (mlMatch) volume = parseInt(mlMatch[1], 10);
    else if (clMatch) volume = parseInt(clMatch[1], 10) * 10;
    else if (lMatch) volume = parseFloat(lMatch[1]) * 1000;

    // 3. 카테고리 추론 (키워드 매칭)
    let category = "기타";
    if (fullText.includes("WHISKY") || fullText.includes("WHISKEY") || fullText.includes("BOURBON") || fullText.includes("SCOTCH")) category = "위스키";
    else if (fullText.includes("GIN")) category = "진";
    else if (fullText.includes("VODKA")) category = "보드카";
    else if (fullText.includes("RUM")) category = "럼";
    else if (fullText.includes("TEQUILA")) category = "데킬라";
    else if (fullText.includes("LIQUEUR")) category = "리큐르";
    else if (fullText.includes("BRANDY") || fullText.includes("COGNAC")) category = "브랜디";

    // 4. 이름 추론 (보통 가장 큰 글씨나 첫 번째 줄이 이름일 확률이 높음. 단순화하여 첫 줄 사용)
    let name = lines[0] || "Unknown Bottle";

    // 만약 첫 줄이 카테고리나 너무 짧다면 두번째 줄 시도
    if (name.length < 3 && lines.length > 1) {
        name = lines[1];
    }

    // 파싱 실패 판단 (필수 정보가 없으면 수동 입력을 유도하기 위해 null 반환)
    if (abv === 0 && volume === 0 && category === "기타") {
        return null;
    }

    return {
        name,
        abv,
        volume,
        category,
        rawText: text, // 디버깅 및 UI 확인용
    };
}
