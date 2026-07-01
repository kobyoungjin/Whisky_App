import React from "react";
import { InventoryItem } from "@/types/baserow";
import { Edit2, Trash2, Wine } from "lucide-react";

interface InventoryCardProps {
    item: InventoryItem;
    onEdit?: (item: InventoryItem) => void;
    onDelete?: (id: number) => void;
}

const unitFor = (category?: string) => {
    if (!category) return "ML";
    const c = category;
    if (c.includes("과일") || c.includes("기타") || c.includes("개")) return "EA";
    if (c.includes("가루")) return "MG";
    return "ML";
};

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onEdit, onDelete }) => {
    const thumbUrl = item.image?.[0]?.thumbnails?.small?.url || item.image?.[0]?.url;
    const cat = item.category?.value || "ETC";
    return (
        <div className="group flex items-center gap-3 py-2 px-2.5 rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all">
            {/* Thumbnail */}
            <div className="shrink-0 w-10 h-10 rounded-lg bg-black/30 border border-outline-variant/10 overflow-hidden flex items-center justify-center">
                {thumbUrl ? (
                    <img src={thumbUrl} alt={item.name} className="w-full h-full object-contain" />
                ) : (
                    <Wine className="w-5 h-5 text-on-surface-variant/30" />
                )}
            </div>

            {/* Name + category */}
            <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-headline font-bold text-on-surface group-hover:text-primary transition-colors truncate leading-tight">
                    {item.name}
                </h3>
                <span className="text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-black">
                    {cat}
                </span>
            </div>

            {/* Stats */}
            <div className="shrink-0 flex items-center gap-1.5">
                {item.abv > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-surface-variant/15 border border-outline-variant/10 text-[9px] font-bold text-on-surface-variant/70 tabular-nums">
                        {item.abv}%
                    </span>
                )}
                <span className="px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary tabular-nums flex items-baseline gap-0.5">
                    {item.volume || 0}
                    <span className="text-[7px] text-primary/60 uppercase tracking-tighter">{unitFor(cat)}</span>
                </span>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={() => onEdit?.(item)}
                    aria-label="Edit"
                    className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => onDelete?.(item.id)}
                    aria-label="Delete"
                    className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default InventoryCard;
