import { InventoryItem, RecipeItem } from "@/types/baserow";

// 대체 재료 매핑 룰: 키(원래 필요한 재료) -> 배열(사용 가능한 대체재들)
export const SUBSTITUTE_RULES: Record<string, string[]> = {
    "코인트로": ["트리플섹", "그랑 마니에르", "오렌지 리큐르"],
    "트리플섹": ["코인트로", "그랑 마니에르", "오렌지 리큐르"],
    "화이트 럼": ["골드 럼", "다크 럼 (풍미 변경 주의)"],
    "레몬 주스": ["라임 주스 (산미 변동)"],
    "라임 주스": ["레몬 주스 (산미 변동)", "깔라만시 즙"],
    "심플 시럽": ["설탕", "아가베 시럽", "꿀 (풍미 추가됨)"],
    "캄파리": ["아페롤 (조금 더 달고 가벼움)"],
    "드라이 베르무트": ["릴레 블랑", "건식 화이트 와인"],
    "스위트 베르무트": ["루비 포트", "스위트 셰리"],
};

export interface AvailabilityResult {
    isAvailable: boolean;
    missingIngredients: string[];
    substituteSuggestions: {
        missing: string;
        substitutesInInventory: string[];
        allSubstitutes: string[];
    }[];
    message: string;
}

/**
 * 재료 이름에서 '주스', '시럽' 앞의 수식어(풍미 키워드)를 추출
 */
function extractFlavorKeyword(norm: string, suffix: string): string {
    const idx = norm.indexOf(suffix);
    if (idx <= 0) return "";
    return norm.substring(0, idx).trim();
}

/**
 * [공통] 요구 재료(reqName)와 인벤토리 아이템(item)이 매치되는지 확인하는 정밀(Strict) 함수
 */
export function isIngredientMatched(reqName: string, item: InventoryItem): boolean {
    const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

    const reqLower = reqName.toLowerCase();
    const reqNorm = normalize(reqName);
    const itemName = item.name.toLowerCase();
    const itemNorm = normalize(item.name);
    const itemCat = (item.category?.value || "").toLowerCase();

    // 0. 완전 일치 여부 먼저 확인 (가장 우선)
    if (itemNorm === reqNorm) return true;

    // 0.5 [특수 케이스] '물'은 항상 있는 것으로 간주
    if (reqNorm === "물" || reqNorm === "water") return true;

    // 1. [특수 케이스] 진저 에일 / 진저 비어 (진(Gin)과의 오매칭 방지용)
    if (reqNorm.includes("진저") || reqNorm.includes("ginger")) {
        return itemNorm.includes("진저") || itemNorm.includes("ginger");
    }

    // 2. [특수 케이스] 주스류 (식별자: 주스, juice, 즙) - "라임주스"가 있다고 "오렌지주스" 매칭되면 안 됨
    if (reqNorm.includes("주스") || reqNorm.includes("juice") || reqNorm.includes("즙")) {
        // "즙"도 주스의 일종으로 취급 (레몬즙 = 레몬 주스)
        const suffix = reqNorm.includes("주스") ? "주스" : (reqNorm.includes("즙") ? "즙" : "juice");
        const reqFlavor = extractFlavorKeyword(reqNorm, suffix);
        const itemHasSuffix = itemNorm.includes("주스") || itemNorm.includes("juice") || itemNorm.includes("즙");

        if (!itemHasSuffix) return false; // 인벤토리 아이템이 주스/즙이 아니면 불일치

        const itemSuffix = itemNorm.includes("주스") ? "주스" : (itemNorm.includes("즙") ? "즙" : "juice");
        const itemFlavor = extractFlavorKeyword(itemNorm, itemSuffix);

        // 둘 다 주스인데, 풍미 키워드가 있으면 반드시 일치해야 함
        if (reqFlavor && itemFlavor) {
            return reqFlavor === itemFlavor ||
                reqFlavor.includes(itemFlavor) ||
                itemFlavor.includes(reqFlavor);
        }
        // 풍미 키워드가 없으면(그냥 "주스") 통과
        return !reqFlavor;
    }

    // 3. [특수 케이스] 시럽류 (정밀 매칭)
    if (reqNorm.includes("시럽") || reqNorm.includes("syrup")) {
        if (reqNorm === "심플시럽" || reqNorm === "시럽" || reqNorm === "설탕시럽") {
            return itemNorm.includes("시럽") || itemNorm.includes("syrup") ||
                itemNorm.includes("설탕") || itemNorm.includes("sugar");
        }
        const flavor = reqNorm.replace(/시럽|syrup/g, "").trim();
        if (flavor) {
            return itemNorm.includes(flavor);
        }
    }

    // 4. 이름 기반 매칭 (서로 포함관계 확인) - 짧은 공통 단어 오매칭 방지
    if (itemNorm.includes(reqNorm) || reqNorm.includes(itemNorm)) {
        // 매칭되는 공통 부분이 너무 짧으면(1자 이하) 무시 - 예: "진"이 "진저에일"에 매칭되는 것 방지
        const matchLen = Math.min(reqNorm.length, itemNorm.length);
        if (matchLen <= 1) {
            // "진", "럼" 처럼 1자 매칭은 브랜드명 형식일 때만 허용
            // "봄베이진" (item) vs "진" (req) -> EndsWith("진") OK
            // "진저에일" (item) vs "진" (req) -> EndsWith("진") 아님 -> Block
            if (itemNorm.endsWith(reqNorm) || reqNorm.endsWith(itemNorm)) {
               // 예외: "진저"는 "진"으로 취급하지 않음
               if (itemNorm.includes("진저") && !reqNorm.includes("진저")) return false;
               return true;
            }
            return itemNorm === reqNorm;
        }

        // 한쪽이 다른쪽에 포함될 때, 포함된 쪽과 포함하는 쪽의 길이 차이가 너무 크면 의심됨
        const longer = itemNorm.length > reqNorm.length ? itemNorm : reqNorm;
        const shorter = itemNorm.length > reqNorm.length ? reqNorm : itemNorm;
        const lenRatio = shorter.length / longer.length;

        if (lenRatio < 0.4) {
            // "호세쿠엘보데킬라"(8) vs "데킬라"(3) = 0.375 (0.4보다 작음)
            // 인벤토리 아이템이 요구 이름으로 끝나거나(브랜드명+술이름), 뒤에 괄호 정보 등이 있는 경우 허용
            if (itemNorm.endsWith(reqNorm) || reqNorm.endsWith(itemNorm)) return true;
            
            // "데킬라(화이트)" 처럼 뒤에 괄호가 붙은 경우
            if (longer.startsWith(shorter) && (longer[shorter.length] === '(' || longer[shorter.length] === '[')) return true;

            return itemNorm === reqNorm;
        }
        return true;
    }

    // 5. 카테고리 매칭 처리 (리큐르 등 넓은 범주)
    if (itemCat && (itemCat.includes(reqLower) || reqLower.includes(itemCat))) {
        if (itemCat.includes("리큐르") || reqLower.includes("리큐르")) {
            const coreKeyword = reqLower.replace(/리큐르|liqueur/g, "").trim();
            if (coreKeyword && (itemName.includes(coreKeyword) || coreKeyword.includes(itemName))) {
                return true;
            }
            if (!coreKeyword) return true;
            return false;
        }
        return true;
    }

    return false;
}

/**
 * 칵테일을 만들 수 있는지, 부족하다면 대체 가능한지 판별하는 함수
 */
export function checkCocktailAvailability(
    recipe: RecipeItem,
    inventory: InventoryItem[]
): AvailabilityResult {
    const inventoryNames = inventory.map((item) => item.name.toLowerCase());
    const inventoryCategories = inventory.map((item) => (item.category?.value || "").toLowerCase());

    // 재료 파싱: 줄바꿈/쉼표로 분리 후, 용량(숫자 + 단위) 및 불필요한 문자 제거
    const requiredIngredients = recipe.ingredients
        .split(/,|\n/)
        .map((item) => item.trim())
        // 용량 표기 제거: "오렌지 주스 90ml" -> "오렌지 주스", "2 oz 라임 주스" -> "라임 주스"
        .map((item) => item.replace(/\d+(\.\d+)?\s*(ml|oz|cl|tsp|tbsp|dash|drop|g|쪽|개|적|조금|약간|to\s+taste)/gi, "").trim())
        .map((item) => item.replace(/^\d+\s*/, "").trim()) // 앞에 숫자만 남은 경우 제거
        .filter(Boolean);


    const missingIngredients: string[] = [];
    const substituteSuggestions: AvailabilityResult["substituteSuggestions"] = [];

    for (const required of requiredIngredients) {
        const reqLower = required.toLowerCase();

        // 요구사항(reqLower)이 인벤토리와 엄격한 규칙으로 일치하는지 판별
        const exactMatch = inventory.some((item) => isIngredientMatched(reqLower, item));

        if (exactMatch) continue;

        // 2. 매치되지 않았으므로 부족한 재료로 등록
        missingIngredients.push(required);

        // 3. 대체품 룰 체크
        let foundSubstitutes: string[] = [];
        let rulesForMissing: string[] = [];

        // 룰 딕셔너리에서 가장 잘 맞는 키 찾기
        for (const [key, subs] of Object.entries(SUBSTITUTE_RULES)) {
            if (reqLower.includes(key.toLowerCase()) || key.toLowerCase().includes(reqLower)) {
                rulesForMissing = subs;
                // 인벤토리에 대체품이 존재하는지 확인
                const availableSubs = subs.filter((sub) =>
                    inventoryNames.some((name) => name.includes(sub.toLowerCase())) ||
                    inventoryCategories.some((cat) => cat.includes(sub.toLowerCase()))
                );
                foundSubstitutes = [...foundSubstitutes, ...availableSubs];
            }
        }

        if (rulesForMissing.length > 0) {
            substituteSuggestions.push({
                missing: required,
                substitutesInInventory: foundSubstitutes,
                allSubstitutes: rulesForMissing
            });
        }
    }

    const isAvailable = missingIngredients.length === 0;
    let message = "";

    if (isAvailable) {
        message = "모든 재료가 준비되어 있습니다! 바로 만들어 보세요.";
    } else {
        const canSubstituteAll = missingIngredients.every(missing =>
            substituteSuggestions.some(sug => sug.missing === missing && sug.substitutesInInventory.length > 0)
        );

        if (canSubstituteAll) {
            message = "재료가 모자라지만, 보유하신 대체 술로 만들 수 있어요!";
        } else {
            message = `재료가 부족합니다. 장보기가 필요해요. (${missingIngredients.length}개 부족)`;
        }
    }

    return {
        isAvailable,
        missingIngredients,
        substituteSuggestions,
        message
    };
}
