import React, { useState, useEffect } from "react";
import { InventoryItem } from "@/types/baserow";

interface DashboardStatsProps {
    inventory: InventoryItem[];
}

export default function DashboardStats({ inventory }: DashboardStatsProps) {
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // 외부 클릭 시 툴팁 닫기
    useEffect(() => {
        const handleClickOutside = () => setActiveTooltip(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    // 데이터 연산 로직
    const bottles = inventory.filter((item) => item.abv > 0 && !item.category?.value.includes("시럽"));
    const ingredients = inventory.filter((item) => item.abv === 0 || item.category?.value.includes("시럽") || item.category?.value.includes("주스") || item.category?.value.includes("과일"));
    const lowStock = inventory.filter((item) => {
        if (item.category?.value.includes("과일") || item.category?.value.includes("기타 재료")) {
            return item.volume <= 2;
        }
        return item.volume > 0 && item.volume <= 150;
    });

    const toggleTooltip = (e: React.MouseEvent, type: string) => {
        e.stopPropagation();
        setActiveTooltip(activeTooltip === type ? null : type);
    };

    return (
        <div className="w-full bg-surface-container-low border border-outline-variant/20 rounded-[2.5rem] p-6 sm:p-8 mb-12 flex items-center justify-between mx-auto max-w-2xl shadow-2xl relative">
            
            {/* 1. BOTTLES */}
            <div 
                className="flex-1 flex flex-col items-center justify-center group relative cursor-pointer"
                onClick={(e) => toggleTooltip(e, "bottles")}
            >
                <span className="text-4xl sm:text-5xl font-black text-primary mb-1 select-none">{bottles.length}</span>
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors select-none ${activeTooltip === "bottles" ? "text-primary" : "text-on-surface-variant/60"}`}>
                    Bottles
                </span>

                {/* Tooltip */}
                <div className={`absolute top-full lg:left-1/2 lg:-translate-x-1/2 left-0 mt-4 w-52 bg-surface-container-high border border-primary/30 rounded-[1.5rem] p-4 transition-all duration-300 z-50 shadow-2xl backdrop-blur-xl ${activeTooltip === "bottles" ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
                    <div className="text-xs font-bold text-primary mb-3 pb-2 border-b border-outline-variant/30 uppercase tracking-widest text-center">
                        보유 주류 목록
                    </div>
                    <ul className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        {bottles.length > 0 ? bottles.map(b => (
                            <li key={b.id} className="flex justify-between items-center text-[11px] hover:bg-white/5 py-1 px-2 rounded-lg transition-colors">
                                <span className="text-on-surface truncate max-w-[110px]" title={b.name}>{b.name}</span>
                                <span className="text-on-surface-variant shrink-0 font-medium">{b.volume}ml</span>
                            </li>
                        )) : (
                            <li className="text-[10px] text-on-surface-variant/50 text-center italic">등록된 술이 없습니다.</li>
                        )}
                    </ul>
                </div>
            </div>

            <div className="w-px h-10 bg-outline-variant/20 mx-1 sm:mx-4" />

            {/* 2. INGREDIENTS */}
            <div 
                className="flex-1 flex flex-col items-center justify-center group relative cursor-pointer"
                onClick={(e) => toggleTooltip(e, "ingredients")}
            >
                <span className="text-4xl sm:text-5xl font-black text-primary mb-1 select-none">{ingredients.length}</span>
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors select-none ${activeTooltip === "ingredients" ? "text-primary" : "text-on-surface-variant/60"}`}>
                    Ingredients
                </span>

                {/* Tooltip */}
                <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 w-52 bg-surface-container-high border border-primary/30 rounded-[1.5rem] p-4 transition-all duration-300 z-50 shadow-2xl backdrop-blur-xl ${activeTooltip === "ingredients" ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
                    <div className="text-xs font-bold text-primary mb-3 pb-2 border-b border-outline-variant/30 uppercase tracking-widest text-center">
                        부재료 목록
                    </div>
                    <ul className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        {ingredients.length > 0 ? ingredients.map(i => (
                            <li key={i.id} className="flex justify-between items-center text-[11px] hover:bg-white/5 py-1 px-2 rounded-lg transition-colors">
                                <span className="text-on-surface truncate max-w-[110px]" title={i.name}>{i.name}</span>
                                <span className="text-on-surface-variant shrink-0 font-medium">
                                    {i.volume}{i.category?.value.includes("과일") ? "개" : "ml"}
                                </span>
                            </li>
                        )) : (
                            <li className="text-[10px] text-on-surface-variant/50 text-center italic">등록된 부재료가 없습니다.</li>
                        )}
                    </ul>
                </div>
            </div>

            <div className="w-px h-10 bg-outline-variant/20 mx-1 sm:mx-4" />

            {/* 3. LOW STOCK */}
            <div 
                className="flex-1 flex flex-col items-center justify-center group relative cursor-pointer"
                onClick={(e) => toggleTooltip(e, "lowstock")}
            >
                <span className="text-4xl sm:text-5xl font-black text-[#ff4444] mb-1 select-none">{lowStock.length}</span>
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors select-none ${activeTooltip === "lowstock" ? "text-[#ff4444]" : "text-on-surface-variant/60"}`}>
                    Low Stock
                </span>

                {/* Tooltip */}
                <div className={`absolute top-full lg:right-1/2 lg:translate-x-1/2 right-0 mt-4 w-52 bg-surface-container-high border border-[#ff4444]/30 rounded-[1.5rem] p-4 transition-all duration-300 z-50 shadow-2xl backdrop-blur-xl ${activeTooltip === "lowstock" ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
                    <div className="text-xs font-bold text-[#ff4444] mb-3 pb-2 border-b border-outline-variant/30 uppercase tracking-widest text-center">
                        재고 부족 알림
                    </div>
                    <ul className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        {lowStock.length > 0 ? lowStock.map(l => (
                            <li key={l.id} className="flex justify-between items-center text-[11px] hover:bg-red-400/5 py-1 px-2 rounded-lg transition-colors">
                                <span className="text-on-surface truncate max-w-[110px]" title={l.name}>{l.name}</span>
                                <span className="text-[#ff4444] shrink-0 font-bold">
                                    {l.volume}{l.category?.value.includes("과일") ? "개" : "ml"}
                                </span>
                            </li>
                        )) : (
                            <li className="text-[10px] text-on-surface-variant/50 text-center italic">재고가 모두 넉넉합니다! 🎉</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
