// ===== Inventory Types =====
export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    abv: number;
    origin: string;
    notes: string;
    imageUrl: string | null;
}

// ===== Recipe Types =====
export interface Recipe {
    id: string;
    name: string;
    category: string;
    ingredients: string[];
    garnish: string;
    glass: string;
    method: string;
    description: string;
}

// ===== Cocktail (Custom List) Types =====
export interface Cocktail extends Recipe {
    difficulty?: "Easy" | "Medium" | "Hard";
    rating?: number;
}

// ===== Merged Cocktail (for Dashboard Display) =====
export type MergedCocktail = Cocktail | Recipe;

// ===== Firebase User =====
export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

// ===== Navigation =====
export interface NavItem {
    label: string;
    href: string;
    icon: string;
}
