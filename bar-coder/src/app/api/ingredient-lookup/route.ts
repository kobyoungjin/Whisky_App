import { NextRequest, NextResponse } from "next/server";

// Baserow Category 값과 theCocktailDB type 문자열의 매핑 (Baserow 실제 옵션명과 일치시켜야 함)
const TYPE_TO_CATEGORY: Record<string, string> = {
    "Whisky": "위스키",
    "Whiskey": "위스키",
    "Single Malt Scotch": "위스키",
    "Blended Scotch Whisky": "위스키",
    "Scotch": "위스키",
    "Bourbon": "버번",
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
    "Beer": "음료",
    "Liqueur": "리큐르",
    "Vermouth": "리큐르",
    "Bitters": "비터",
    "Syrup": "시럽",
    "Juice": "주스",
    "Soda": "소다",
    "Water": "음료",
    "Fruit": "과일",
    "Other": "기타",
};

// TheCocktailDB에 strABV가 없을 때 타입 이름으로 추정하는 기본 도수 맵
const TYPE_DEFAULT_ABV: Record<string, number> = {
    "위스키": 43,
    "버번": 45,
    "진": 42,
    "보드카": 40,
    "럼": 40,
    "데킬라": 38,
    "브랜디": 40,
    "꼬냑": 40,
    "와인": 13,
    "리큐르": 25,
    "비터": 45,
};

// 알코올 타입인지 확인
const ALCOHOLIC_CATEGORIES = new Set([
    "위스키", "버번", "진", "보드카", "럼", "데킬라",
    "브랜디", "꼬냑", "와인", "리큐르", "비터",
    "전통주", "기타 증류주", "소주"
]);

// 한글 주류 타입 키워드 → { category, defaultAbv } 매핑 (Baserow 명칭 준수)
const KOREAN_TYPE_MAP: { keywords: string[], category: string, abv: number }[] = [
    { keywords: ["러셀 리저브 싱글배럴", "러셀 싱글배럴", "러셀리저브 싱글배럴"], category: "버번", abv: 55 },
    { keywords: ["스카치", "싱글몰트", "블렌디드", "글렌", "Glen", "맥캘란", "발렌타인", "시바스", "조니워커", "보모어", "라가불린", "달모어", "아드벡", "스프링뱅크", "탈리스커", "라프로익", "글렌드로나학", "발베니"], category: "위스키", abv: 43 },
    { keywords: ["버번", "테네시", "웰러", "버팔로", "블랜튼", "에반윌리엄스", "메이커스마크", "짐빔", "와일드터키", "포로지스", "러셀", "놉크릭", "바질헤이든", "엘라이자", "믹터스"], category: "버번", abv: 45 },
    { keywords: ["위스키", "whiskey", "whisky", "아이리쉬", "제임슨", "부쉬밀", "산토리", "야마자키", "히비키", "하쿠슈", "카발란"], category: "위스키", abv: 43 },
    { keywords: ["진", " gin", "헨드릭스", "탱커레이", "봄베이", "진마레", "몽키47"], category: "진", abv: 42 },
    { keywords: ["보드카", "vodka", "앱솔루트", "그레이구스", "스미노프", "벨베데레"], category: "보드카", abv: 40 },
    { keywords: ["럼", " rum ", "바카디", "하바나클럽", "캡틴모건"], category: "럼", abv: 40 },
    { keywords: ["데킬라", "테킬라", "tequila", "메스칼", "메즈칼", "호세쿠엘보", "패트론", "돈훌리오"], category: "데킬라", abv: 38 },
    { keywords: ["꼬냑", "코냑", "cognac", "헤네시", "레미마틴", "마텔", "까뮤"], category: "꼬냑", abv: 40 },
    { keywords: ["브랜디", "brandy", "아르마냑", "깔바도스"], category: "브랜디", abv: 40 },
    { keywords: ["리큐르", "리큐어", "liqueur", "캄파리", "코앵트로", "깔루아", "베일리스", "말리부", "볼스", "디카이퍼", "미도리", "피치트리", "슬로진", "아마레또"], category: "리큐르", abv: 25 },
    { keywords: ["베르무트", "vermouth", "마티니", "노일리프라"], category: "리큐르", abv: 18 },
    { keywords: ["와인", "wine", "샴페인", "프로세코", "스파클링"], category: "와인", abv: 13 },
    { keywords: ["맥주", "beer", "에일", "라거", "IPA", "기네스"], category: "음료", abv: 5 },
    { keywords: ["소주", "막걸리", "전통주", "청주", "참이슬", "진로", "화요"], category: "전통주", abv: 25 },
    { keywords: ["비터", "bitters", "앙고스투라", "페이쇼즈"], category: "비터", abv: 44 },
    { keywords: ["레몬주스", "라임주스", "오렌지주스", "자몽주스", "주스", "juice"], category: "주스", abv: 0 },
    { keywords: ["심플시럽", "단순시럽", "그레나딘", "아가베", "시럽", "syrup"], category: "시럽", abv: 0 },
    { keywords: ["소다수", "탄산수", "진저에일", "진저비어", "토닉워터", "소다", "soda", "tonic"], category: "소다", abv: 0 },
    { keywords: ["레몬", "라임", "오렌지", "과일", "fruit"], category: "과일", abv: 0 },
    { keywords: ["우유", "크림", "달걀", "계란"], category: "기타", abv: 0 },
    { keywords: ["설탕", "소금", "가루", "파우더", "허브", "향신료"], category: "기타", abv: 0 },
];

// 한글 → 영문 브랜드명 일부 변환 (TheCocktailDB 영문 검색용)
const KOREAN_BRAND_TO_EN: [RegExp, string][] = [
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
    [/탈리스커/i, "Talisker"],
    [/라프로익/i, "Laphroaig"],
    [/글렌드로나학/i, "Glendronach"],
    [/글렌파클라스/i, "Glenfarclas"],
    [/글렌그랜트/i, "Glengrant"],
    [/아벨라워/i, "Aberlour"],
    [/오반/i, "Oban"],
    [/웰러/i, "Weller"],
    [/버팔로트레이스/i, "Buffalo Trace"],
    [/블랜튼/i, "Blanton"],
    [/에반윌리엄스/i, "Evan Williams"],
    [/메이커스마크/i, "Maker's Mark"],
    [/짐빔/i, "Jim Beam"],
    [/와일드터키/i, "Wild Turkey"],
    [/포로지스/i, "Four Roses"],
    [/로완스크릭/i, "Rowan's Creek"],
    [/노아스밀/i, "Noah's Mill"],
    [/이글레어/i, "Eagle Rare"],
    [/불릿/i, "Bulleit"],
    [/엔젤스엔비/i, "Angel's Envy"],
    [/러셀리저브/i, "Russell's Reserve"],
    [/러셀\s*리저브/i, "Russell's Reserve"],
    [/놉크릭/i, "Knob Creek"],
    [/바질헤이든/i, "Basil Hayden"],
    [/엘라이자크레이그/i, "Elijah Craig"],
    [/우드포드리저브/i, "Woodford Reserve"],
    [/믹터스/i, "Michter's"],
    [/부커스/i, "Booker's"],
    [/스테그/i, "Stagg"],
    [/윌렛/i, "Willet"],
    [/헨드릭스/i, "Hendrick's"],
    [/탱커레이/i, "Tanqueray"],
    [/봄베이/i, "Bombay Sapphire"],
    [/진마레/i, "Gin Mare"],
    [/몽키47/i, "Monkey 47"],
    [/앱솔루트/i, "Absolut"],
    [/그레이구스/i, "Grey Goose"],
    [/스미노프/i, "Smirnoff"],
    [/벨베데레/i, "Belvedere"],
    [/바카디/i, "Bacardi"],
    [/하바나클럽/i, "Havana Club"],
    [/캡틴모건/i, "Captain Morgan"],
    [/헤네시/i, "Hennessy"],
    [/레미마틴/i, "Remy Martin"],
    [/마텔/i, "Martell"],
    [/까뮤/i, "Camus"],
    [/캄파리/i, "Campari"],
    [/코앵트로/i, "Cointreau"],
    [/깔루아/i, "Kahlua"],
    [/베일리스/i, "Baileys"],
    [/말리부/i, "Malibu"],
    [/피치트리/i, "Peachtree"],
    [/미도리/i, "Midori"],
    [/볼스/i, "Bols"],
    [/디카이퍼/i, "De Kuyper"],
    [/아마레또/i, "Amaretto"],
    [/디사론노/i, "Disaronno"],
];

function translateToEnglish(text: string): string {
    let result = text;
    let hasChanged = false;
    for (const [pattern, replacement] of KOREAN_BRAND_TO_EN) {
        if (pattern.test(result)) {
            result = result.replace(pattern, replacement);
            hasChanged = true;
        }
    }
    if (/(\d+)\s*년/.test(result)) {
        result = result.replace(/(\d+)\s*년/g, "$1y");
        hasChanged = true;
    }
    if (hasChanged) {
        result = result.replace(/[가-힣]+/g, "").trim();
    }
    return result || text;
}

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
    if (!abvStr || abvStr.trim() === "" || abvStr === "null") return -1;
    const num = parseFloat(abvStr.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? -1 : Math.round(num * 10) / 10;
}

function parseVolumeFromName(name: string): number {
    const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*ml/i);
    if (mlMatch) return Math.round(parseFloat(mlMatch[1]));
    const lMatch = name.match(/(\d+(?:\.\d+)?)\s*l\b/i);
    if (lMatch) return Math.round(parseFloat(lMatch[1]) * 1000);
    return -1;
}

async function lookupWithGemini(query: string): Promise<{
    name: string; category: string; abv: number; volume: number;
} | null> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return null;
    const model = process.env.GOOGLE_GEMINI_MODEL || "gemini-2.0-flash";

    const CATEGORIES = {
        base: ["위스키", "버번", "진", "럼", "보드카", "데킬라", "테킬라", "브랜디", "꼬냑", "코냑", "와인", "소주", "전통주", "기타 증류주"],
        liqueur: ["리큐르", "베르무트", "비터"],
        ingredient: ["과일", "주스", "시럽", "소다", "음료", "기타", "가루"],
    };
    const validCategories = [...CATEGORIES.base, ...CATEGORIES.liqueur, ...CATEGORIES.ingredient].join(", ");

    const prompt = `당신은 세계의 모든 주류와 바 재료에 대해 박식한 전문 바텐더입니다.
사용자가 검색한 "${query}"에 대한 정확한 Specs를 아래 JSON 형식으로만 반환하세요.

{"name":"알려진 정식 명칭(한글과 영문 병기 권장, 예: 발베니 12년 The Balvenie 12y)","category":"아래 목록 중 하나","abv":숫자,"volume":숫자}

category는 반드시 다음 중 하나여야 합니다: ${validCategories}
abv: 해당 제품의 정확한 공식 알코올 도수(%), 예: "러셀 리저브 싱글배럴"은 반드시 55.0(%)여야 함.
volume: 해당 제품의 표준 판매 용량(ml), 보통 위스키는 700 또는 750임.

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
    const queryForApi = translateToEnglish(query);
    const korDetect = detectKoreanCategory(query);

    // 브랜드/제품명이 포함된 구체적인 검색어인지 판별
    // (한글 브랜드명이 영문으로 변환됐거나, 숫자/특수어가 포함된 경우 = 구체적 제품)
    const isSpecificProduct = queryForApi !== query || /\d+(y|년|ml|l\b)/i.test(query) || /싱글배럴|싱글몰트|더블우드|피트|셰리|포트|피니시/i.test(query);

    try {
        // ── 1단계: 구체적인 제품명이면 Gemini를 먼저 호출 (ABV/Volume 정확도 우선) ──
        if (isSpecificProduct) {
            const geminiResult = await lookupWithGemini(query);
            if (geminiResult) {
                const isAlc = ALCOHOLIC_CATEGORIES.has(geminiResult.category);
                const correctedAbv = !isAlc ? 0
                    : geminiResult.abv > 0 ? geminiResult.abv
                    : (korDetect?.abv ?? TYPE_DEFAULT_ABV[geminiResult.category] ?? 40);
                const correctedVolume = volumeFromQuery > 0 ? volumeFromQuery
                    : isAlc ? (geminiResult.volume > 0 ? geminiResult.volume : 700) : 200;
                return NextResponse.json({
                    found: true,
                    source: "gemini",
                    name: geminiResult.name,
                    category: geminiResult.category,
                    abv: correctedAbv,
                    volume: correctedVolume,
                });
            }
        }

        // ── 2단계: TheCocktailDB 호출 (일반 재료명 또는 Gemini 실패 시) ──
        const searchUrl = `https://www.thecocktaildb.com/api/json/v1/1/search.php?i=${encodeURIComponent(queryForApi)}`;
        const res = await fetch(searchUrl, { next: { revalidate: 3600 } });
        if (!res.ok) return NextResponse.json({ error: "Upstream API error" }, { status: 502 });
        const data = await res.json();

        if (!data.ingredients || data.ingredients.length === 0) {
            // ── 3단계: TheCocktailDB 실패 → Gemini 폴백 ──
            const geminiResult = await lookupWithGemini(query);
            if (geminiResult) {
                const isAlc = ALCOHOLIC_CATEGORIES.has(geminiResult.category);
                const correctedAbv = !isAlc ? 0
                    : geminiResult.abv > 0 ? geminiResult.abv
                    : (korDetect?.abv ?? TYPE_DEFAULT_ABV[geminiResult.category] ?? 40);
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
            // ── 4단계: 최종 키워드 감지 fallback ──
            const cat = korDetect?.category ?? guessCategory("", query);
            const isAlc = ALCOHOLIC_CATEGORIES.has(cat);
            return NextResponse.json({
                found: false,
                name: query,
                category: cat,
                abv: !isAlc ? 0 : (korDetect?.abv ?? TYPE_DEFAULT_ABV[cat] ?? 40),
                volume: volumeFromQuery > 0 ? volumeFromQuery : (isAlc ? 700 : 200),
            });
        }

        // TheCocktailDB 결과 사용 (일반 재료)
        const ing = data.ingredients[0];
        const rawAbv = parseAbv(ing.strABV);
        const dbCategory = guessCategory(ing.strType || "", ing.strIngredient || "");
        const category = (dbCategory !== "기타" ? dbCategory : null) ?? korDetect?.category ?? "기타";
        const isAlcoholic = (ing.strAlcohol || "").toLowerCase() === "yes" || ALCOHOLIC_CATEGORIES.has(category);
        const abv = !isAlcoholic ? 0 : rawAbv >= 0 ? rawAbv : (korDetect?.abv ?? TYPE_DEFAULT_ABV[category] ?? 40);
        const volume = volumeFromQuery > 0 ? volumeFromQuery : isAlcoholic ? 700 : 200;

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
        return NextResponse.json({ error: "Internal error", detail: err.message }, { status: 500 });
    }
}
