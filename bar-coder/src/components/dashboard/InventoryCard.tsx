import React from "react";

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    notes: string;
}

interface InventoryCardProps {
    item: InventoryItem;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item }) => {
    return (
        <div className="glass-card p-5 group hover:border-[#d4a843]/40 transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#6b6761] font-bold">
                        {item.category}
                    </span>
                    <h3 className="text-lg font-semibold text-[#f0ede8] group-hover:gold-text transition-all duration-300">
                        {item.name}
                    </h3>
                </div>
                <div className="text-right">
                    <span className="text-xl font-bold gold-text">{item.quantity}</span>
                    <span className="text-xs text-[#a8a49d] ml-1">{item.unit}</span>
                </div>
            </div>
            <p className="text-sm text-[#a8a49d] line-clamp-2 leading-relaxed italic">
                "{item.notes}"
            </p>
            <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
                <span className="text-[10px] text-[#6b6761]">재고 원활</span>
            </div>
        </div>
    );
};

export default InventoryCard;
