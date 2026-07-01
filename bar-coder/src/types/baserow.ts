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


export interface TastingNote {
    id: number;
    name: string;             // 위스키 이름 (편의용, 사실상 inventory_id로 조인)
    user_uid: string;
    inventory_id: number;     // 연결된 인벤토리 row id
    date?: string;            // YYYY-MM-DD (Baserow date field)
    nose?: string;
    palate?: string;
    finish?: string;
    rating?: number | string; // 0~5, 소수점 2자리
    overall?: string;
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
    embedding?: string; // JSON-serialized 1024-dim Cohere embedding for RAG
}
