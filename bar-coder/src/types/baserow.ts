export interface InventoryItem {
    id: number;
    user_uid: string;
    name: string;
    abv: number;
    volume: number;
    category: { id: number; value: string }; // Baserow Select field format
    notes?: string;
}

export interface RecipeItem {
    id: number;
    name: string;
    image?: { url: string }[]; // Baserow File field array
    ingredients: string; // Long text
    substitutes?: string; // JSON string
    instructions: string; // Long text
    technique?: string; // Optional technique
    garnish?: string; // Optional garnish
}
