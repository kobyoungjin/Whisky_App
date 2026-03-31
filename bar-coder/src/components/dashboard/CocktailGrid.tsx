"use client";

import React, { useState } from "react";
import { GlassWater } from "lucide-react";
import { RecipeItem, InventoryItem } from "@/types/baserow";
import CocktailDetailModal from "@/components/dashboard/CocktailDetailModal";

interface CocktailGridProps {
    cocktails: RecipeItem[];
    inventory?: InventoryItem[]; // Made optional if used in places without inventory initially
}

const CocktailGrid: React.FC<CocktailGridProps> = ({ cocktails, inventory = [] }) => {
    const [selectedCocktail, setSelectedCocktail] = useState<RecipeItem | null>(null);

    if (!cocktails || cocktails.length === 0) {
        return (
            <div className="glass-card p-8 text-center text-[#a8a49d] flex flex-col items-center justify-center">
                <GlassWater className="w-8 h-8 opacity-50 mb-3" />
                <p>추천 칵테일이 없습니다.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {cocktails.map((cocktail) => (
                    <div
                        key={cocktail.id}
                        onClick={() => setSelectedCocktail(cocktail)}
                        className="group flex flex-col cursor-pointer bg-surface-container-low border border-outline-variant/10 rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-500 shadow-md hover:shadow-primary/5"
                    >
                        {/* Dramatic Aspect Ratio Image Box */}
                        <div className="w-full aspect-[4/3] bg-surface-container flex items-center justify-center relative overflow-hidden">
                            {cocktail.image && cocktail.image.length > 0 ? (
                                <img
                                    src={cocktail.image[0].url}
                                    alt={cocktail.name}
                                    className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                                />
                            ) : (
                                <GlassWater className="w-10 h-10 text-primary opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                            )}

                            {/* Gradient Overlay for style */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
                        </div>

                        {/* Text Content */}
                        <div className="w-full p-4 flex flex-col justify-between flex-1">
                            <div>
                                <h3 className="text-sm md:text-base font-headline font-bold text-on-surface group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight mb-1">
                                    {cocktail.name}
                                </h3>
                                <p className="text-[10px] md:text-xs font-body text-on-surface-variant line-clamp-1">
                                    {cocktail.ingredients ? cocktail.ingredients.split('\n')[0].replace(/[-*]\s*/g, '') : "Spirits & Mixers"}
                                </p>
                            </div>
                            <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="text-[9px] font-label font-bold text-primary uppercase tracking-widest">View Recipe</span>
                                <span className="material-symbols-outlined text-[12px] text-primary">arrow_forward</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <CocktailDetailModal
                isOpen={!!selectedCocktail}
                onClose={() => setSelectedCocktail(null)}
                cocktail={selectedCocktail}
                inventory={inventory}
            />
        </>
    );
};

export default CocktailGrid;
