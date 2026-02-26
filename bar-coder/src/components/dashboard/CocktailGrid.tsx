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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4">
                {cocktails.map((cocktail) => (
                    <div
                        key={cocktail.id}
                        onClick={() => setSelectedCocktail(cocktail)}
                        className="group flex flex-col items-center cursor-pointer"
                    >
                        {/* 1:1 Aspect Ratio Image Box */}
                        <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border border-white/5 flex items-center justify-center group-hover:border-[#d4a843]/50 group-hover:shadow-[0_0_15px_rgba(212,168,67,0.15)] transition-all duration-300 relative overflow-hidden mb-2">
                            {cocktail.image && cocktail.image.length > 0 ? (
                                <img
                                    src={cocktail.image[0].url}
                                    alt={cocktail.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <GlassWater className="w-8 h-8 md:w-10 md:h-10 text-[#d4a843] opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                            )}

                            {/* Gradient Overlay for style */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>

                        {/* Name Label */}
                        <div className="w-full text-center">
                            <h3 className="text-[10px] md:text-xs font-bold text-[#f0ede8] group-hover:text-[#d4a843] transition-colors duration-300 line-clamp-2 leading-tight px-1">
                                {cocktail.name}
                            </h3>
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
