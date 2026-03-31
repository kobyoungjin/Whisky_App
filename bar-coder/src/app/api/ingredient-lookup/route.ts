import { NextRequest, NextResponse } from "next/server";

// Baserow Category 값과 theCocktailDB type 문자열의 매핑
const TYPE_TO_CATEGORY: Record<string, string> = {
    "Whisky": "위스키",
    "Whiskey": "위스키",
    "Single Malt Scotch": "스카치 위스키",
    "Blended Scotch Whisky": "스카치 위스키",
    "Scotch": "스카치 위스키",
    "Bourbon": "버번 위스키",
    "Gin": "진",
    "Vodka": "보드카",
    "Rum": "럼",
    "Tequila": "데킬라",
    "Mezcal": "데킬라",
    "Brandy": "브랜디",
    "Cognac": "꼬냑",
    "Armagnac": "브랜디",
    "Wine": "와인",
    "Champagne": "와인",
    "Beer": "맥주",
    "Liqueur": "리큐르",
    "Vermouth": "베르무트",
    "Bitters": "비터",
    "Syrup": "시럽",
    "Juice": "주스",
    "Soda": "소다",
    "Water": "기타",
    "Fruit": "과일",
    "Other": "기타",
};

// TheCocktailDB에 strABV가 없을 때 타입 이름으로 추정하는 기본 도수 맵
const TYPE_DEFAULT_ABV: Record<string, number> = {
    "위스키": 43,
    "스카치 위스키": 43,
    "버번 위스키": 45,
    "진": 42,
    "보드카": 40,
    "럼": 40,
    "데킬라": 38,
    "브랜디": 40,
    "꼬냑": 40,
    "와인": 13,
    "맥주": 5,
    "리큐르": 25,
    "베르무트": 18,
    "비터": 45,
};

// 알코올 타입인지 확인
const ALCOHOLIC_CATEGORIES = new Set([
    "위스키", "스카치 위스키", "버번 위스키", "진", "보드카", "럼", "데킬라",
    "브랜디", "꼬냑", "와인", "맥주", "리큐르", "베르무트", "비터",
    "기타 증류주", "소주", "전통주"
]);

// 한글 주류 타입 키워드 → { category, defaultAbv } 매핑
const KOREAN_TYPE_MAP: { keywords: string[], category: string, abv: number }[] = [
    { keywords: ["스카치", "싱글몰트", "블렌디드", "스카치위스키", "글렌", "Glen", "맥캘란", "발렌타인", "시바스", "조니워커", "보모어", "라가불린", "달모어", "아드벡", "스프링뱅크"], category: "스카치 위스키", abv: 43 },
    { keywords: ["버번", "테네시", "웰러", "버팔로트레이스", "버팔로 트레이스", "블랜튼", "에반윌리엄스", "메이커스마크", "짐빔", "와일드터키", "포로지스", "로완스크릭"], category: "버번 위스키", abv: 45 },
    { keywords: ["위스키", "whiskey", "whisky"], category: "위스키", abv: 43 },
    { keywords: ["진", " gin", "헨드릭스", "탱커레이", "봄베이"], category: "진", abv: 42 },
    { keywords: ["보드카", "vodka", "앱솔루트", "그레이구스", "스미노프"], category: "보드카", abv: 40 },
    { keywords: ["럼", " rum ", "바카디"], category: "럼", abv: 40 },
    { keywords: ["데킬라", "테킬라", "tequila", "메스칼", "메즈칼"], category: "데킬라", abv: 38 },
    { keywords: ["꼬냑", "코냑", "cognac", "헤네시", "레미마틴", "마텔"], category: "꼬냑", abv: 40 },
    { keywords: ["브랜디", "brandy", "아르마냑"], category: "브랜디", abv: 40 },
    { keywords: ["리큐르", "리큐어", "캄파리", "코앵트로", "깔루아", "베일리스", "말리부"], category: "리큐르", abv: 25 },
    { keywords: ["베르무트", "vermouth", "마티니", "노일리프라"], category: "베르무트", abv: 18 },
    { keywords: ["와인", "wine", "샴페인", "프로세코", "스파클링"], category: "와인", abv: 13 },
    { keywords: ["맥주", "beer", "에일", "라거", "IPA"], category: "맥주", abv: 5 },
    { keywords: ["소주", "막걸리", "전통주", "청주", "참이슬", "진로", "처음처럼"], category: "소주", abv: 25 },
    { keywords: ["비터", "bitters", "앙고스투라", "페이쇼즈", "오렌지비터", "페이쇼", "페이쇼즈비터"], category: "비터", abv: 44 },
    // 비알코올 재료
    { keywords: ["레몬주스", "라임주스", "오렌지주스", "자몽주스", "파인애플주스", "크랜베리주스", "토마토주스", "애플주스", "포도주스", "주스", "juice"], category: "주스", abv: 0 },
    { keywords: ["심플시럽", "단순시럽", "그레나딘", "라즈베리시럽", "바닐라시럽", "아가베", "메이플시럽", "오르쟈", "오르자", "시럽", "syrup"], category: "시럽", abv: 0 },
    { keywords: ["소다수", "탄산수", "진저에일", "진저비어", "토닉워터", "클럽소다", "스파클링워터", "소다", "soda", "tonic"], category: "소다", abv: 0 },
    { keywords: ["레몬", "라임", "오렌지", "자몽", "체리", "민트", "바질", "로즈마리", "딸기", "블루베리", "파인애플", "수박", "멜론", "복숭아", "망고", "패션푸르트", "사과", "배", "포도", "과일", "fruit"], category: "과일", abv: 0 },
    { keywords: ["우유", "크림", "헤비크림", "코코넛크림", "아이스크림", "요거트", "달걀", "에그화이트", "계란흰자"], category: "기타", abv: 0 },
    { keywords: ["설탕", "소금", "가루", "파우더", "스피릿", "허브", "향신료", "후추", "계피", "시나몬", "넛맥"], category: "기타", abv: 0 },
];

// 한글 → 영문 브랜드명 일부 변환 (TheCocktailDB 영문 검색용)
const KOREAN_BRAND_TO_EN: [RegExp, string][] = [
    // 스카치 위스키
    [/글렌피딕/i, "Glenfiddich"],
    [/맥캘란/i, "Macallan"],
    [/발렌타인/i, "Ballantine"],
    [/시바스/i, "Chivas Regal"],
    [/조니워커/i, "Johnnie Walker"],
    [/라가불린/i, "Lagavulin"],
    [/달모어/i, "Dalmore"],
    [/아드벡/i, "Ardbeg"],
    [/스프링뱅크/i, "Springbank"],
    [/보모어/i, "Bowmore"],
    [/글렌리벳/i, "Glenlivet"],
    [/글렌모렌지/i, "Glenmorangie"],
    [/발베니/i, "Balvenie"],
    // 버번·미국 위스키
    [/웰러/i, "Weller"],
    [/버팔로트레이스/i, "Buffalo Trace"],
    [/블랜튼/i, "Blanton"],
    [/에반윌리엄스/i, "Evan Williams"],
    [/메이커스마크/i, "Maker's Mark"],
    [/짐빔/i, "Jim Beam"],
    [/와일드터키/i, "Wild Turkey"],
    [/포로지스/i, "Four Roses"],
    [/로완스크릭/i, "Rowan's Creek"],
    // 진
    [/헨드릭스/i, "Hendrick's"],
    [/탱커레이/i, "Tanqueray"],
    [/봄베이/i, "Bombay Sapphire"],
    // 보드카
    [/앱솔루트/i, "Absolut"],
    [/그레이구스/i, "Grey Goose"],
    [/스미노프/i, "Smirnoff"],
    // 럼
    [/바카디/i, "Bacardi"],
    // 꼬냑
    [/헤네시/i, "Hennessy"],
    [/레미마틴/i, "Remy Martin"],
    [/마텔/i, "Martell"],
    // 리큐르
    [/캄파리/i, "Campari"],
    [/코앵트로/i, "Cointreau"],
    [/깔루아/i, "Kahlua"],
    [/베일리스/i, "Baileys"],
];

// 한글이 포함된 검색어를 영문으로 최대한 변환
function translateToEnglish(text: string): string {
    let result = text;
    for (const [pattern, replacement] of KOREAN_BRAND_TO_EN) {
        result = result.replace(pattern, replacement);
    }
    // 숫자+"년" → 숫자+"y" (예: 12년 → 12y)
    result = result.replace(/(\d+)\s*년/g, "$1y");
    // 한글만 남은 부분 제거
    result = result.replace(/[가-힣]+/g, "").trim();
    return result || text; // 완전히 비면 원본 반환
}

// 한글 포함 검색어에서 카테고리/ABV 추정
function detectKoreanCategory(text: string): { category: string, abv: number } | null {
    const lower = text.toLowerCase();
    for (const entry of KOREAN_TYPE_MAP) {
        if (entry.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
            return { category: entry.category, abv: entry.abv };
        }
    }
    return null;
}

function guessCategory(type: string, name: string): string {
    const combined = `${type} ${name}`.toLowerCase();
    for (const [key, val] of Object.entries(TYPE_TO_CATEGORY)) {
        if (combined.includes(key.toLowerCase())) return val;
    }
    return "기타";
}

function parseAbv(abvStr: string | null | undefined): number {
    if (!abvStr || abvStr.trim() === "" || abvStr === "null") return -1; // -1 = 없음 표시
    const num = parseFloat(abvStr.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? -1 : Math.round(num * 10) / 10;
}

// 검색어나 제품명에서 용량(ml/L) 직접 파싱
function parseVolumeFromName(name: string): number {
    // e.g. "Balvenie 12y 700ml" or "Glenfiddich 1L"
    const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*ml/i);
    if (mlMatch) return Math.round(parseFloat(mlMatch[1]));
    const lMatch = name.match(/(\d+(?:\.\d+)?)\s*l\b/i);
    if (lMatch) return Math.round(parseFloat(lMatch[1]) * 1000);
    return -1; // 없음
}

// Gemini AI를 사용해 주류 정보 추론 (TheCocktailDB 실패 시 폴백)
async function lookupWithGemini(query: string): Promise<{
    name: string; category: string; abv: number; volume: number;
} | null> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.GOOGLE_GEMINI_MODEL || "gemini-2.5-flash";

    // 유효한 카테고리 목록
    const validCategories = [
        "위스키", "스카치 위스키", "버번 위스키", "진", "보드카", "럼", "데킬라",
        "브랜디", "꼬냑", "와인", "맥주", "리큐르", "베르무트", "비터",
        "소주", "전통주", "기타 증류주", "과일", "주스", "시럽", "소다", "기타"
    ].join(", ");

    const prompt = `당신은 세계의 모든 주류와 바 재료에 대해 박식한 전문 바텐더입니다.
"${query}"에 대한 정보를 아래 JSON 형식으로만 반환하세요. 다른 텍스트는 출력하지 마세요.

{"name":"정식 이름(영문 또는 원어 표기)","category":"아래 목록 중 하나","abv":숫자,"volume":숫자}

category는 반드시 다음 중 하나여야 합니다: ${validCategories}
abv: 알코올 도수(%), 비알코올이면 0
volume: 일반적인 병 용량(ml), 비주류면 200ml 기준

찾을 수 없거나 확실하지 않은 재료라면: {"name":"${query}","category":"기타","abv":0,"volume":200}`;

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
                }),
            }
        );
        const data = await resp.json();
        const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // JSON만 추출 (```json ... ``` 형식 대응)
        const jsonStr = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        return {
            name: parsed.name || query,
            category: parsed.category || "기타",
            abv: typeof parsed.abv === "number" ? parsed.abv : 0,
            volume: typeof parsed.volume === "number" ? parsed.volume : 700,
        };
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim() === "") {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const volumeFromQuery = parseVolumeFromName(query);
    // 한글 포함 시 영문으로 번역해서 API 조회
    const queryForApi = translateToEnglish(query);
    // 한글 키워드 기반 카테고리/ABV 사전 감지 (fallback용)
    const korDetect = detectKoreanCategory(query);

    try {
        const searchUrl = `https://www.thecocktaildb.com/api/json/v1/1/search.php?i=${encodeURIComponent(queryForApi)}`;
        const res = await fetch(searchUrl, { next: { revalidate: 3600 } });

        if (!res.ok) {
            return NextResponse.json({ error: "Upstream API error" }, { status: 502 });
        }

        const data = await res.json();

        if (!data.ingredients || data.ingredients.length === 0) {
            // TheCocktailDB 실패 → Gemini AI 폴백
            const geminiResult = await lookupWithGemini(query);

            if (geminiResult) {
                const isAlc = ALCOHOLIC_CATEGORIES.has(geminiResult.category);
                // Gemini가 알코올 카테고리인데 ABV=0으로 반환하면 타입 기본값으로 교정
                const correctedAbv = (!isAlc) ? 0
                    : (geminiResult.abv > 0 ? geminiResult.abv
                    : (korDetect?.abv ?? TYPE_DEFAULT_ABV[geminiResult.category] ?? 40));
                // 비주류인데 volume이 700이면 200으로 교정
                const correctedVolume = volumeFromQuery > 0 ? volumeFromQuery
                    : isAlc ? (geminiResult.volume > 0 ? geminiResult.volume : 700) : 200;
                return NextResponse.json({
                    found: false,
                    source: "gemini",
                    name: geminiResult.name,
                    category: geminiResult.category,
                    abv: correctedAbv,
                    volume: correctedVolume,
                });
            }

            // 최종 한글 키워드 감지 fallback
            const cat = korDetect?.category ?? guessCategory("", query);
            const detectedAbv = korDetect?.abv ?? null;
            const isAlc = ALCOHOLIC_CATEGORIES.has(cat);
            return NextResponse.json({
                found: false,
                name: query,
                category: cat,
                abv: !isAlc ? 0 : (detectedAbv ?? TYPE_DEFAULT_ABV[cat] ?? 40),
                volume: volumeFromQuery > 0 ? volumeFromQuery : (isAlc ? 700 : 200),
            });
        }

        // TheCocktailDB 결과 사용
        const ing = data.ingredients[0];
        const rawAbv = parseAbv(ing.strABV);
        // DB 카테고리와 한글 감지 카테고리 중 적절한 것을 선택
        const dbCategory = guessCategory(ing.strType || "", ing.strIngredient || "");
        const category = (dbCategory !== "기타" ? dbCategory : null) ?? korDetect?.category ?? "기타";

        const isAlcoholic =
            (ing.strAlcohol || "").toLowerCase() === "yes" ||
            ALCOHOLIC_CATEGORIES.has(category);

        // ABV: DB값 → 한글 감지 기본값 → 타입별 기본값 순서로 fallback
        const abv = !isAlcoholic ? 0
            : rawAbv >= 0 ? rawAbv
            : (korDetect?.abv ?? TYPE_DEFAULT_ABV[category] ?? 40);

        const volume = volumeFromQuery > 0 ? volumeFromQuery
            : isAlcoholic ? 700 : 200;

        return NextResponse.json({
            found: true,
            source: "cocktaildb",
            name: ing.strIngredient || query,
            category,
            abv,
            volume,
            description: (ing.strDescription || "").slice(0, 200),
        });

    } catch (err: any) {
        console.error("[ingredient-lookup] Error:", err);
        return NextResponse.json({ error: "Internal error", detail: err.message }, { status: 500 });
    }
}
