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
 * [공통] 요구 재료(reqName)와 인벤토리 아이템(item)이 매치되는지 확인하는 정밀(Strict) 함수
 */
export function isIngredientMatched(reqName: string, item: InventoryItem): boolean {
    // 공백 제거 및 소문자화하여 비교 (더 유연한 매칭)
    const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

    const reqLower = reqName.toLowerCase();
    const reqNorm = normalize(reqName);
    const itemName = item.name.toLowerCase();
    const itemNorm = normalize(item.name);
    const itemCat = (item.category?.value || "").toLowerCase();

    // 1. [특수 케이스] 진저 에일 / 진저 비어 (진(Gin)과의 오매칭 방지용)
    if (reqNorm.includes("진저") || reqNorm.includes("ginger")) {
        // 요구사항이 진저 계열이면, 인벤토리 아이템 이름에 반드시 '진저' 또는 'ginger'가 있어야 함
        return itemNorm.includes("진저") || itemNorm.includes("ginger");
    }

    // 2. [특수 케이스] 시럽류 (정밀 매칭)
    if (reqNorm.includes("시럽") || reqNorm.includes("syrup")) {
        // 2-1. 심플 시럽 (단순 설탕물)
        if (reqNorm === "심플시럽" || reqNorm === "시럽" || reqNorm === "설탕시럽") {
            return itemNorm.includes("시럽") || itemNorm.includes("syrup") ||
                itemNorm.includes("설탕") || itemNorm.includes("sugar");
        }
        // 2-2. 향 시럽 (그레나딘, 바닐라 등)
        // 시럽 자르기 (예: "그레나딘시럽" -> "그레나딘")
        const flavor = reqNorm.replace(/시럽|syrup/g, "").trim();
        if (flavor) {
            return itemNorm.includes(flavor);
        }
    }

    // 3. 이름 기반 매칭 (서로 포함관계 확인)
    if (itemNorm.includes(reqNorm) || reqNorm.includes(itemNorm)) {
        // [추가 검증] '진'이 '진저에일'에 매칭되는 것과 같은 케이스를 한번 더 걸러냄
        // 인벤토리 이름이 너무 짧은데(예: '진') 긴 요구사항('진저에일')에 포함되는 경우, 
        // 위에서 처리되지 않은 다른 케이스들도 있을 수 있으므로 길이를 체크하거나 
        // 베이스 스피릿 이름인지 확인하는 등의 보수적 접근이 필요할 수 있음. 
        // 현재는 진저와 시럽이 가장 크므로 우선 통과.
        return true;
    }

    // 4. 카테고리 매칭 처리 (리큐르 등 넓은 범주)
    if (itemCat && (itemCat.includes(reqLower) || reqLower.includes(itemCat))) {
        // [엄격한 과일/향 리큐르 검증 (Strict Liqueur Matching)]
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

    // 간단한 파싱: 레시피의 ingredients 텍스트를 줄바꿈이나 쉼표로 분리
    const requiredIngredients = recipe.ingredients
        .split(/,|\n/)
        .map((item) => item.trim())
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
