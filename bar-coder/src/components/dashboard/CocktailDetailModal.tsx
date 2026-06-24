"use client";

import React, { useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RecipeItem, InventoryItem } from "@/types/baserow";
import { isIngredientMatched } from "@/lib/substitute";

interface CocktailDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    cocktail: RecipeItem | null;
    inventory: InventoryItem[];
}

export default function CocktailDetailModal({
    isOpen,
    onClose,
    cocktail,
    inventory,
}: CocktailDetailModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 스크롤 잠금 (Scroll Lock)
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // 재료 파싱 및 보유 여부 계산
    const parsedIngredients = useMemo(() => {
        if (!cocktail?.ingredients) return [];
        const reqs = cocktail.ingredients.split(/[,;\n]/).map(r => r.trim()).filter(Boolean);

        return reqs.map((reqInfo) => {
            // 용량 및 단위 제거 로직 (substitute.ts와 동기화)
            const baseName = reqInfo
                .replace(/\d+(\.\d+)?\s*(ml|oz|cl|tsp|tbsp|dash|drop|g|쪽|개|적|조금|약간|티스푼|큰술|작은술|to\s+taste)/gi, "") // 단위 제거
                .replace(/^\d+\s*/, "") // 앞의 숫자 제거
                .split('(')[0] // 괄호 뒤 메모 제거
                .trim()
                .toLowerCase();

            const hasStock = inventory.some((item) => isIngredientMatched(baseName, item));
            return {
                rawText: reqInfo,
                nameForShopping: baseName,
                hasStock,
            };
        }).filter(ing => !ing.rawText.includes("드라이쉐이킹 후 쉐이킹"));
    }, [cocktail, inventory]);

    // Garnish / Substitutes Logic
    const parsedSubstitutes = useMemo(() => {
        if (!cocktail?.substitutes) return null;
        try {
            const parsed = JSON.parse(cocktail.substitutes);
            const garnishText = parsed.garnish?.trim();
            return garnishText ? garnishText : null;
        } catch (e) {
            const rawText = cocktail.substitutes.trim();
            return rawText ? rawText : null;
        }
    }, [cocktail?.substitutes]);

    if (!isOpen || !cocktail || !mounted) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Baserow 데이터에서 직접 가져오기
    const abv = cocktail.abv ? `${cocktail.abv}` : null;
    const glassType = cocktail.glass || null;
    const makeMethod = cocktail.make || cocktail.technique || null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md transition-opacity"
            onClick={handleBackdropClick}
        >
            <div className="w-full sm:max-w-[440px] h-full sm:h-[90vh] bg-background text-on-surface font-manrope flex flex-col animate-fade-in-up overflow-hidden sm:rounded-3xl border border-outline-variant/20 shadow-2xl relative">
                
                {/* Header (Floating) */}
                <header className="absolute top-0 w-full z-20 flex justify-between items-center px-6 h-16 bg-gradient-to-b from-black/60 to-transparent">
                    <button 
                        onClick={onClose}
                        className="active:scale-95 transition-transform duration-400 text-[#D4AF37] p-2 bg-black/20 backdrop-blur-lg rounded-full"
                    >
                        <span className="material-symbols-outlined block">arrow_back</span>
                    </button>
                    <div /> {/* Spacer for title */}
                    <button className="active:scale-95 transition-transform duration-400 text-[#D4AF37] p-2 bg-black/20 backdrop-blur-lg rounded-full">
                        <span className="material-symbols-outlined block">favorite</span>
                    </button>
                </header>

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-12">
                    
                    {/* Hero Section */}
                    <section className="relative h-[480px] w-full overflow-hidden">
                        {cocktail.image?.[0]?.url ? (
                            <img 
                                alt={cocktail.name} 
                                className="w-full h-full object-cover scale-105" 
                                src={cocktail.image[0].url} 
                            />
                        ) : (
                            <div className="w-full h-full bg-surface-container flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-outline-variant">liquor</span>
                            </div>
                        )}
                        <div className="absolute inset-0 hero-gradient"></div>
                        <div className="absolute bottom-0 left-0 w-full p-8 space-y-2">
                            <div className="flex gap-2 mb-4">
                                <span className="bg-surface-variant/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold text-primary">
                                    {cocktail.technique || "Spirit-Forward"}
                                </span>
                                <span className="bg-surface-variant/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold text-primary">
                                    Classic
                                </span>
                            </div>
                            <h2 className="font-noto-serif text-5xl font-bold tracking-tight text-on-surface leading-tight">{cocktail.name}</h2>
                            <p className="font-manrope text-on-surface-variant max-w-lg leading-relaxed text-sm opacity-90">
                                {cocktail.info || `${cocktail.name} - 완벽한 밸런스와 복합적인 미감을 선사하는 클래식 칵테일입니다.`}
                            </p>
                        </div>
                    </section>

                    {/* Quick Stats Grid */}
                    <section className="px-6 -mt-8 relative z-10 grid grid-cols-3 gap-4">
                        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
                            <span className="material-symbols-outlined text-primary mb-1">local_bar</span>
                            <span className="text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">Glass</span>
                            <span className="text-xs font-bold truncate w-full">{glassType || "-"}</span>
                        </div>
                        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
                            <span className="material-symbols-outlined text-primary mb-1">percent</span>
                            <span className="text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">ABV</span>
                            <span className="text-xs font-bold">{abv ? `${abv}%` : "-"}</span>
                        </div>
                        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
                            <span className="material-symbols-outlined text-primary mb-1">timer</span>
                            <span className="text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">Prep</span>
                            <span className="text-xs font-bold truncate w-full">
                                {cocktail.instructions && !cocktail.instructions.includes('1.') ? cocktail.instructions : (cocktail.make && !cocktail.make.includes('1.') ? cocktail.make : "3분")}
                            </span>
                        </div>
                    </section>

                    {/* Tasting Notes */}
                    <section className="px-6 py-12">
                        <h3 className="font-noto-serif text-xl mb-6 flex items-center gap-3">
                            <span className="h-px flex-1 bg-outline-variant/20"></span>
                            테이스팅 노트
                            <span className="h-px flex-1 bg-outline-variant/20"></span>
                        </h3>
                        <div className="flex justify-center gap-8">
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center mb-2 bg-primary/5">
                                    <span className="text-[10px] font-bold text-primary italic">Btr</span>
                                </div>
                                <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant font-bold">Bitter</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center mb-2 bg-primary/5">
                                    <span className="text-[10px] font-bold text-primary italic">Swt</span>
                                </div>
                                <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant font-bold">Sweet</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center mb-2 bg-primary/5">
                                    <span className="text-[10px] font-bold text-primary italic">Hrb</span>
                                </div>
                                <span className="text-[10px] uppercase tracking-tighter text-on-surface-variant font-bold">Herbal</span>
                            </div>
                        </div>
                    </section>

                    {/* Content Section: Ingredients & Instructions */}
                    <div className="px-6 space-y-12">
                        {/* Ingredients */}
                        <section>
                            <h3 className="font-noto-serif text-2xl mb-8 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">inventory_2</span>
                                필요한 재료
                            </h3>
                            <ul className="space-y-4">
                                {parsedIngredients.map((ing, idx) => {
                                    return (
                                        <li key={idx} className="flex items-center justify-between group py-2">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${ing.hasStock ? "bg-primary/20 text-primary border border-primary/30" : "bg-surface-container border border-outline-variant/20 text-outline-variant"}`}>
                                                    <span className="material-symbols-outlined text-sm">{ing.hasStock ? "check" : "liquor"}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold text-sm ${ing.hasStock ? "text-on-surface" : "text-outline"}`}>{ing.rawText}</span>
                                                </div>
                                            </div>
                                            {ing.hasStock && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase italic">In Bar</span>}
                                        </li>
                                    );
                                })}
                            </ul>
                            
                            <button className="mt-10 w-full py-4 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                                나의 홈바에 담기
                            </button>
                        </section>

                        {/* Instructions */}
                        <section>
                            <h3 className="font-noto-serif text-2xl mb-8 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">menu_book</span>
                                제조 방법
                            </h3>
                            
                            <div className="space-y-8 relative">
                                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-outline-variant/30"></div>
                                
                                {/* Step 1: Logic to find technique string regardless of column */}
                                {(() => {
                                    const technique = (!cocktail.instructions?.includes('1.') ? cocktail.instructions : (cocktail.make && !cocktail.make.includes('1.') ? cocktail.make : null));
                                    if (technique) {
                                        return (
                                            <div className="relative flex gap-6">
                                                <div className="z-10 w-10 h-10 rounded-full bg-surface-container border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-noto-serif italic font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                                    1
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <p className="text-on-surface font-bold text-base opacity-95">{technique}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Main Steps from either make or instructions (whichever has the numbers) */}
                                {(() => {
                                    const rawSteps = (cocktail.make?.includes('1.') ? cocktail.make : (cocktail.instructions?.includes('1.') ? cocktail.instructions : ""));
                                    let steps = rawSteps.split(/\d+\.\s*/).filter(step => step.trim().length > 0);
                                    
                                    // Amaretto Sour 특수 패치: 드라이쉐이킹 단계 삽입
                                    if (cocktail.name.includes("아마레또") && cocktail.ingredients.includes("드라이쉐이킹")) {
                                        // 3번과 4번 사이에 삽입 (0-indexed array 기준 3번째 인덱스 뒤)
                                        if (steps.length >= 3) {
                                            steps.splice(3, 0, "드라이쉐이킹 후 쉐이킹 (Dry Shake then Shake)");
                                        } else {
                                            steps.push("드라이쉐이킹 후 쉐이킹 (Dry Shake then Shake)");
                                        }
                                    }
                                    const hasTechnique = (!cocktail.instructions?.includes('1.') ? cocktail.instructions : (cocktail.make && !cocktail.make.includes('1.') ? cocktail.make : null));
                                    
                                    return steps.map((step, idx) => {
                                        const stepNumber = hasTechnique ? idx + 2 : idx + 1;
                                        return (
                                            <div key={idx} className="relative flex gap-6">
                                                <div className="z-10 w-10 h-10 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center text-primary font-noto-serif italic font-bold">
                                                    {stepNumber}
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <p className="text-on-surface leading-relaxed text-sm opacity-90">{step.trim()}</p>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </section>
                    </div>

                    {/* Expert Tip Section */}
                    <section className="mt-20 px-6">
                        <div className="bg-surface-container-high rounded-3xl p-8 border border-outline-variant/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <span className="material-symbols-outlined text-[100px]">lightbulb</span>
                            </div>
                            <div className="relative z-10">
                                <h4 className="font-noto-serif text-lg mb-4 text-primary italic">믹솔로지스트의 팁</h4>
                                <p className="text-on-surface-variant leading-relaxed italic text-sm">
                                    {parsedSubstitutes || "완벽한 칵테일을 위해 최고급 재료만을 사용하세요. 신선한 오렌지 껍질에서 나오는 에센셜 오일이 칵테일의 풍미를 더욱 깊게 만들어줍니다."}
                                </p>
                                <div className="mt-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                        <span className="material-symbols-outlined text-sm text-primary">person</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest font-black text-on-surface">Master Bartender</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>,
        document.body
    );
}
