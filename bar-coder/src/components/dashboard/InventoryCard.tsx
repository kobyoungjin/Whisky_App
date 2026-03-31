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
        <div className="bg-surface-container-low border border-outline-variant/10 p-3 rounded-2xl group hover:border-primary/40 transition-all duration-300 flex flex-col gap-2 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-[8px] uppercase tracking-[0.25em] text-on-surface-variant/40 font-black truncate">
                        {item.category?.value || "ETC"}
                    </span>
                    <h3 className="text-sm font-headline font-bold text-on-surface group-hover:text-primary transition-all duration-300 truncate">
                        {item.name}
                    </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {item.abv > 0 && (
                        <div className="px-2 py-0.5 rounded-md bg-surface-variant/10 border border-outline-variant/10 transition-all duration-300">
                            <span className="text-[9px] text-on-surface-variant/60 font-bold">
                                {item.abv}%
                            </span>
                        </div>
                    )}
                    <div className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-1 transition-all duration-300">
                        <span className="text-[9px] font-bold text-primary">{item.volume || 0}</span>
                        <span className="text-[8px] text-primary/70 font-bold uppercase tracking-tighter">
                            {item.category?.value.includes("과il") || item.category?.value.includes("개") ? "EA" : item.category?.value.includes("가루") ? "MG" : "ML"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/5 relative z-10">
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit?.(item)}
                        className="flex items-center gap-1 text-[9px] font-bold text-on-surface-variant/50 hover:text-primary transition-colors py-1"
                    >
                        <Edit2 className="w-3 h-3" />
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete?.(item.id)}
                        className="flex items-center gap-1 text-[9px] font-bold text-on-surface-variant/50 hover:text-red-400 transition-colors py-1"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete
                    </button>
                </div>
 
                <button
                    onClick={() => onAddToShoppingList?.(item.name)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-black text-[9px] font-black uppercase tracking-widest transition-all border border-primary/20"
                >
                    <ShoppingCart className="w-3 h-3" />
                    List
                </button>
            </div>
        </div>
    );
};

export default InventoryCard;
