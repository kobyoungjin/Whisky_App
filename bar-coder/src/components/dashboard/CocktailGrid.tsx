import React from "react";
import { Star, Flame } from "lucide-react";

interface Cocktail {
    id: string;
    name: string;
    category: string;
    difficulty: string;
    rating: number;
    description: string;
}

interface CocktailGridProps {
    cocktails: Cocktail[];
}

const CocktailGrid: React.FC<CocktailGridProps> = ({ cocktails }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cocktails.map((cocktail) => (
                <div
                    key={cocktail.id}
                    className="glass-card overflow-hidden group hover:translate-y-[-4px] transition-all duration-300"
                >
                    <div className="h-32 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] relative">
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md">
                            <Star className="w-3 h-3 text-[#d4a843] fill-[#d4a843]" />
                            <span className="text-[10px] font-bold text-[#f0ede8]">
                                {cocktail.rating}
                            </span>
                        </div>
                    </div>
                    <div className="p-5">
                        <span className="text-[10px] font-bold text-[#d4a843]/60 uppercase tracking-widest">
                            {cocktail.category}
                        </span>
                        <h3 className="text-lg font-bold text-[#f0ede8] mt-1 mb-2 group-hover:gold-text transition-all duration-300">
                            {cocktail.name}
                        </h3>
                        <p className="text-xs text-[#a8a49d] line-clamp-2 mb-4 leading-relaxed">
                            {cocktail.description}
                        </p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-[10px] text-[#a8a49d]">
                                    난이도: {cocktail.difficulty}
                                </span>
                            </div>
                            <button className="text-[10px] font-bold gold-text underline underline-offset-4 decoration-[#d4a843]/30 hover:decoration-[#d4a843]">
                                상세보기
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CocktailGrid;
