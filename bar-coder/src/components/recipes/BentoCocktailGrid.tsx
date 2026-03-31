import React, { useState } from "react";
import { RecipeItem, InventoryItem } from "@/types/baserow";
import { GlassWater, Check, AlertCircle, Info } from "lucide-react";
import CocktailDetailModal from "@/components/dashboard/CocktailDetailModal";
import { checkCocktailAvailability } from "@/lib/substitute";

interface Props {
    cocktails: RecipeItem[];
    inventory: InventoryItem[];
    featured?: boolean;
}

export default function BentoCocktailGrid({ cocktails, inventory, featured = true }: Props) {
    const [selectedCocktail, setSelectedCocktail] = useState<RecipeItem | null>(null);

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {cocktails.map((cocktail, index) => {
                    const isFirst = index === 0 && featured;
                    const availability = checkCocktailAvailability(cocktail, inventory);
                    
                    // 상세 상태 판별
                    const isPerfect = availability.isAvailable;
                    const canSubstituteAll = !isPerfect && availability.missingIngredients.length > 0 && 
                        availability.missingIngredients.every(missing => 
                            availability.substituteSuggestions.some(sug => sug.missing === missing && sug.substitutesInInventory.length > 0)
                        );
                    const missingCount = availability.missingIngredients.length;

                    return (
                        <div
                            key={cocktail.id}
                            onClick={() => setSelectedCocktail(cocktail)}
                            className={`relative group overflow-hidden rounded-xl bg-surface-container border border-outline-variant/10 cursor-pointer ${
                                isFirst ? "col-span-2 row-span-2 aspect-auto sm:aspect-square" : "aspect-square"
                            }`}
                        >
                            {/* Match Badge */}
                            <div className="absolute top-3 right-3 z-30 flex gap-1">
                                {isPerfect ? (
                                    <div className="bg-primary/90 backdrop-blur-md text-[#1a1a1a] p-1.5 rounded-full shadow-lg border border-primary/20 scale-90 group-hover:scale-100 transition-transform">
                                        <Check className="w-3 h-3 stroke-[4]" />
                                    </div>
                                ) : canSubstituteAll ? (
                                    <div className="bg-[#e8c678]/90 backdrop-blur-md text-[#1a1a1a] px-2 py-1 rounded-full shadow-lg border border-primary/20 flex items-center gap-1 scale-90 group-hover:scale-100 transition-transform">
                                        <Info className="w-2.5 h-2.5 stroke-[3]" />
                                        <span className="text-[8px] font-black uppercase tracking-tighter">Substitute</span>
                                    </div>
                                ) : missingCount > 0 ? (
                                    <div className="bg-surface-container-highest/80 backdrop-blur-md text-primary px-2 py-1 rounded-full shadow-lg border border-primary/20 flex items-center gap-1 scale-90 group-hover:scale-100 transition-transform">
                                        <AlertCircle className="w-2.5 h-2.5 stroke-[3]" />
                                        <span className="text-[8px] font-black uppercase tracking-tighter">{missingCount} Missing</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className={`relative w-full h-full ${isFirst ? 'min-h-[300px]' : ''}`}>
                                {cocktail.image && cocktail.image.length > 0 ? (
                                    <img
                                        src={cocktail.image[0].url}
                                        alt={cocktail.name}
                                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isFirst ? 'opacity-80 group-hover:scale-105' : 'group-hover:scale-110 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100'}`}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low">
                                        <GlassWater className="w-10 h-10 text-primary opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                                    </div>
                                )}

                                {/* Gradient Overlays */}
                                {isFirst ? (
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent opacity-80 pointer-events-none" />
                                )}
                            </div>

                            {/* Text Content */}
                            {isFirst ? (
                                <div className="absolute bottom-0 left-0 p-6 sm:p-8 space-y-1 sm:space-y-2 pointer-events-none w-full">
                                    <span className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-primary font-bold">Recommended</span>
                                    <h3 className="text-2xl sm:text-4xl font-headline italic text-on-surface line-clamp-1">{cocktail.name}</h3>
                                    <p className="text-on-surface-variant text-xs sm:text-sm line-clamp-2 pr-4">{cocktail.info || cocktail.ingredients.split('\n')[0].replace(/[-*]\s*/g, '')}</p>
                                </div>
                            ) : (
                                <div className="absolute bottom-0 left-0 w-full p-3 sm:p-4 pointer-events-none flex flex-col justify-end h-full">
                                    <h4 className="font-headline text-base sm:text-lg italic text-on-surface line-clamp-2 leading-tight drop-shadow-md">{cocktail.name}</h4>
                                    <div className="flex items-center mt-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-primary drop-shadow-md">
                                        <span className="truncate">{cocktail.glass || "Cocktail"}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedCocktail && (
                <CocktailDetailModal
                    isOpen={!!selectedCocktail}
                    cocktail={selectedCocktail}
                    inventory={inventory}
                    onClose={() => setSelectedCocktail(null)}
                />
            )}
        </>
    );
}
