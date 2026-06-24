export interface InventoryItem {
    id: number;
    user_uid: string;
    name: string;
    abv: number;
    volume: number;
    category: { id: number; value: string }; // Baserow Select field format
    notes?: string;
    image_url?: string; // 커스텀 병 이미지 URL (AI 검색 또는 직접 업로드)
}


export interface RecipeItem {
    id: number;
    name: string;
    image?: { url: string }[]; // Baserow File field array
    ingredients: string; // Long text
    substitutes?: string; // JSON string
    instructions: string; // Long text
    technique?: string; // Optional technique (hero badge)
    make?: string; // 제조 방법 (쉐이킹, 스터링, 빌드 등) + prep time
    garnish?: string; // Optional garnish
    abv?: number | string; // Alcohol by volume (number or string)
    glass?: string; // Glass type
    info?: string; // Short description
}
