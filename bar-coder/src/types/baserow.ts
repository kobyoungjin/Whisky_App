export interface InventoryItem {
    id: number;
    user_uid: string;
    name: string;
    abv: number;
    volume: number;
    category: { id: number; value: string }; // Baserow Select field format
    notes?: string;
    image?: { url: string; name?: string; thumbnails?: any }[]; // Baserow file field — bottle image (PNG with bg removed)
    Order?: number; // Display order on shelf (drag-and-drop reordering)
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
