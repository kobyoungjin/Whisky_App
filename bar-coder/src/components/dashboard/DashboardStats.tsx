import React from "react";
import { InventoryItem } from "@/types/baserow";
import { ScanLine } from "lucide-react";
import Link from "next/link";

interface DashboardStatsProps {
    inventory: InventoryItem[];
}

export default function DashboardStats({ inventory }: DashboardStatsProps) {
    // 데이터 연산 로직
    const bottles = inventory.filter((item) => item.abv > 0 && !item.category?.value.includes("시럽"));
    const ingredients = inventory.filter((item) => item.abv === 0 || item.category?.value.includes("시럽") || item.category?.value.includes("주스") || item.category?.value.includes("과일"));

    // 용량이 150ml 이하이거나 (단위가 개수일 경우) 수량이 2개 이하인 것들을 Low Stock으로 간주
    const lowStock = inventory.filter((item) => {
        // 단위가 ml/cl/L 가 아닌 과일 등일 경우 (보통 volume을 개수로 씀)
        if (item.category?.value.includes("과일") || item.category?.value.includes("기타 재료")) {
            return item.volume <= 2;
        }
        // 일반적인 액체류의 경우
        return item.volume > 0 && item.volume <= 150;
    });

    return (
        <div className="w-full bg-surface-container-low border border-outline-variant/20 rounded-[2rem] p-6 sm:p-8 mb-8 flex items-center justify-between mx-auto max-w-2xl shadow-2xl relative">

            {/* 1. BOTTLES */}
            <div className="flex-1 flex flex-col items-center justify-center group relative cursor-help">
                <span className="text-4xl sm:text-5xl font-black text-primary mb-1">{bottles.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest group-hover:text-on-surface-variant transition-colors">
                    Bottles
                </span>

                {/* Tooltip */}
                <div className="absolute top-full lg:left-1/2 lg:-translate-x-1/2 left-0 mt-4 w-48 bg-surface-container-high border border-primary/30 rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-2xl">
                    <div className="text-xs font-bold text-primary mb-2 pb-2 border-b border-outline-variant/30 uppercase tracking-widest text-center">
                        보유 주류 목록
                    </div>
                    <ul className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
                        {bottles.length > 0 ? bottles.map(b => (
                            <li key={b.id} className="flex justify-between items-center text-[10px] sm:text-xs">
                                <span className="text-on-surface truncate max-w-[100px]" title={b.name}>{b.name}</span>
                                <span className="text-on-surface-variant shrink-0 font-medium">{b.volume} ml</span>
                            </li>
                        )) : (
                            <li className="text-[10px] text-on-surface-variant/50 text-center italic">등록된 술이 없습니다.</li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-outline-variant/30 mx-2 sm:mx-6" />

            {/* 2. INGREDIENTS */}
            <div className="flex-1 flex flex-col items-center justify-center group relative cursor-help">
                <span className="text-4xl sm:text-5xl font-black text-primary mb-1">{ingredients.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest group-hover:text-on-surface-variant transition-colors">
                    Ingredients
                </span>

                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-surface-container-high border border-primary/30 rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-2xl">
                    <div className="text-xs font-bold text-primary mb-2 pb-2 border-b border-outline-variant/30 uppercase tracking-widest text-center">
                        부재료 목록
                    </div>
                    <ul className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
                        {ingredients.length > 0 ? ingredients.map(i => (
                            <li key={i.id} className="flex justify-between items-center text-[10px] sm:text-xs">
                                <span className="text-on-surface truncate max-w-[100px]" title={i.name}>{i.name}</span>
                                <span className="text-on-surface-variant shrink-0 font-medium">
                                    {i.volume} {i.category?.value.includes("과일") ? "개" : "ml"}
                                </span>
                            </li>
                        )) : (
                            <li className="text-[10px] text-on-surface-variant/50 text-center italic">등록된 부재료가 없습니다.</li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-outline-variant/30 mx-2 sm:mx-6" />

            {/* 3. LOW STOCK */}
            <div className="flex-1 flex flex-col items-center justify-center group relative cursor-help">
                <span className="text-4xl sm:text-5xl font-black text-[#ff3333] mb-1">{lowStock.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-[#ff3333] uppercase tracking-widest transition-colors whitespace-nowrap">
                    Low Stock
                </span>


                {/* Tooltip */}
                <div className="absolute top-full lg:right-1/2 lg:translate-x-1/2 right-0 mt-4 w-48 bg-surface-container-high border border-[#ff3333]/30 rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-2xl">
                    <div className="text-xs font-bold text-[#ff3333] mb-2 pb-2 border-b border-outline-variant/30 uppercase tracking-widest text-center">
                        재고 부족 경고
                    </div>
                    <ul className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
                        {lowStock.length > 0 ? lowStock.map(l => (
                            <li key={l.id} className="flex justify-between items-center text-[10px] sm:text-xs">
                                <span className="text-on-surface truncate max-w-[100px]" title={l.name}>{l.name}</span>
                                <span className="text-[#ff3333] shrink-0 font-bold">
                                    {l.volume} {l.category?.value.includes("과일") ? "개" : "ml"}
                                </span>
                            </li>
                        )) : (
                            <li className="text-[10px] text-on-surface-variant/50 text-center italic">재고가 모두 넉넉합니다! 🎉</li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-outline-variant/30 mx-2 sm:mx-6" />

            {/* 4. SCAN BUTTON */}
            <button 
                onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-scan-modal')); }} 
                className="flex-1 flex flex-col items-center justify-center group relative cursor-pointer appearance-none bg-transparent border-none p-0 focus:outline-none"
            >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-high border border-outline-variant/50 rounded-full flex items-center justify-center mb-1 group-hover:bg-primary/10 group-hover:border-primary/50 transition-all duration-300">
                    <ScanLine className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest transition-colors">
                    Scan
                </span>
            </button>

        </div>
    );
}
