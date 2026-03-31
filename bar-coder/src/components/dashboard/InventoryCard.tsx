import React from "react";
import { InventoryItem } from "@/types/baserow";
import { Edit2, Trash2, ShoppingCart } from "lucide-react";

interface InventoryCardProps {
    item: InventoryItem;
    onEdit?: (item: InventoryItem) => void;
    onDelete?: (id: number) => void;
    onAddToShoppingList?: (name: string) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onEdit, onDelete, onAddToShoppingList }) => {
    return (
        <div className="bg-surface-container-low border border-outline-variant/10 p-3.5 rounded-2xl group hover:border-primary/40 transition-all duration-400 flex flex-col justify-between h-full relative overflow-hidden hover:shadow-[0_0_20px_rgba(255,198,62,0.05)]">
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col gap-1.5">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] uppercase tracking-[0.25em] text-on-surface-variant/40 font-black truncate">
                        {item.category?.value || "ETC"}
                    </span>
                    <h3 className="text-sm sm:text-base font-headline font-bold text-on-surface group-hover:text-primary transition-all duration-300 line-clamp-2 leading-tight min-h-[2.5rem]">
                        {item.name}
                    </h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                    {item.abv > 0 && (
                        <div className="px-3 py-1.5 rounded-full bg-surface-variant/10 border border-outline-variant/10 transition-all duration-300">
                            <span className="text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-widest">
                                {item.abv}%
                            </span>
                        </div>
                    )}
                    <div className="px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 flex items-center gap-1 transition-all duration-300">
                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{item.volume || 0}</span>
                        <span className="text-[9px] text-primary/70 font-bold uppercase tracking-widest">
                            {item.category?.value.includes("과일") ? "EA" : item.category?.value.includes("가루") ? "MG" : "ML"}
                        </span>
                    </div>
                </div>
            </div>
 
            <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between gap-1 relative z-10">
                <div className="flex gap-1">
                    <button
                        onClick={() => onEdit?.(item)}
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-primary/20 text-on-surface-variant/60 hover:text-primary transition-all duration-300 border border-outline-variant/5 hover:border-primary/30"
                        title="수정"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onDelete?.(item.id)}
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-red-500/10 text-on-surface-variant/60 hover:text-red-400 transition-all duration-300 border border-outline-variant/5 hover:border-red-400/30"
                        title="삭제"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
 
                <button
                    onClick={() => onAddToShoppingList?.(item.name)}
                    className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20 transition-all duration-300 flex items-center justify-center border border-primary/30"
                    title="장보기 추가"
                >
                    <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
            </div>
        </div>
    );
};

export default InventoryCard;
