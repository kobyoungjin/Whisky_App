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
        <div className="glass-card p-4 group hover:border-[#d4a843]/40 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                        <span className="text-[9px] uppercase tracking-wider text-[#6b6761] font-bold block mb-0.5">
                            {item.category?.value || "Unknown"}
                        </span>
                        <h3 className="text-base font-semibold text-[#f0ede8] group-hover:gold-text transition-all duration-300 truncate">
                            {item.name}
                        </h3>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                        <div className="flex items-baseline">
                            <span className="text-lg font-bold gold-text">{item.volume || 0}</span>
                            <span className="text-[10px] text-[#a8a49d] ml-0.5">
                                {item.category?.value.includes("과일") ? "개" : "ml"}
                            </span>
                        </div>
                        <span className="text-[9px] text-[#6b6761]">
                            {item.abv > 0 ? `ABV ${item.abv}%` : "Non-Alcohol"}
                        </span>
                    </div>
                </div>
                {item.notes && (
                    <p className="text-[11px] text-[#6b6761] line-clamp-1 italic mb-3">
                        "{item.notes}"
                    </p>
                )}
            </div>

            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-end gap-1.5">
                <button
                    onClick={() => onAddToShoppingList?.(item.name)}
                    className="p-1.5 rounded-md bg-[#d4a843]/5 text-[#d4a843]/60 hover:bg-[#d4a843] hover:text-black transition-all"
                    title="장보기 추가"
                >
                    <ShoppingCart className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onEdit?.(item)}
                    className="p-1.5 rounded-md bg-blue-500/5 text-blue-400/60 hover:bg-blue-500 hover:text-white transition-all"
                    title="수정"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete?.(item.id)}
                    className="p-1.5 rounded-md bg-red-500/5 text-red-400/60 hover:bg-red-500 hover:text-white transition-all"
                    title="삭제"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default InventoryCard;
