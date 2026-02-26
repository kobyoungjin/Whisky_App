"use client";

import React, { useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, XCircle, ShoppingCart } from "lucide-react";
import { RecipeItem, InventoryItem } from "@/types/baserow";
import { useShoppingList } from "@/hooks/useShoppingList";
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
    const { addItem, items: shoppingList } = useShoppingList();
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

        // Cleanup function for unmount
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // 재료 파싱 및 보유 여부 계산
    const parsedIngredients = useMemo(() => {
        if (!cocktail?.ingredients) return [];
        // 예: "위스키 (45ml), 스위트 베르무트 (30ml)"
        // 단순 줄바꿈이나 쉼표로 분리되어 있다고 가정. 필요에 따라 정규식/split 로직 고도화 가능
        const reqs = cocktail.ingredients.split(/[,;\n]/).map(r => r.trim()).filter(Boolean);

        return reqs.map((reqInfo) => {
            // 이름 추출 (괄호 전까지를 보통 재료 이름으로 봄, 이 규칙은 데이터 형식에 따라 다름)
            const baseName = reqInfo.split('(')[0].trim().toLowerCase();

            // 엄격한 매치 알고리즘(Strict Liqueur Matching)을 통해 확인
            const hasStock = inventory.some((item) => isIngredientMatched(baseName, item));

            return {
                rawText: reqInfo,
                nameForShopping: baseName, // 장바구니 추가용 이름
                hasStock,
            };
        });
    }, [cocktail, inventory]);

    // Garnish (JSON Parsing) Logic
    const parsedSubstitutes = useMemo(() => {
        if (!cocktail?.substitutes) return null;
        try {
            // Attempt to parse JSON
            const parsed = JSON.parse(cocktail.substitutes);
            const garnishText = parsed.garnish?.trim();
            return garnishText ? garnishText : "없음";
        } catch (e) {
            // If not valid JSON, treat as raw text
            const rawText = cocktail.substitutes.trim();
            return rawText ? rawText : "없음";
        }
    }, [cocktail?.substitutes]);

    if (!isOpen || !cocktail || !mounted) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={handleBackdropClick}
        >
            <div className="w-full sm:max-w-md max-h-[85vh] bg-[#1a1a1a] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl flex flex-col animate-fade-in-up overflow-hidden">

                {/* Header */}
                <div className="relative border-b border-white/5 bg-[#2a2a2a]/50">
                    {cocktail.image && cocktail.image.length > 0 && (
                        <div className="w-full h-40 sm:h-48 overflow-hidden relative">
                            <img
                                src={cocktail.image[0].url}
                                alt={cocktail.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
                        </div>
                    )}
                    <div className="flex items-center justify-between p-6 absolute top-0 w-full">
                        {/* Empty space for flex alignment if image exists, otherwise minimal padding */}
                    </div>

                    <div className={`p-6 ${cocktail.image && cocktail.image.length > 0 ? "pt-0 absolute bottom-0 w-full" : "flex items-center justify-between"}`}>
                        <h2 className="text-xl sm:text-2xl font-bold text-[#f0ede8] gold-text drop-shadow-md">{cocktail.name}</h2>
                        {!(cocktail.image && cocktail.image.length > 0) && (
                            <button
                                onClick={onClose}
                                className="p-2 bg-[#333] hover:bg-[#444] rounded-full text-[#a8a49d] hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    {/* Close button layered on top if there's an image */}
                    {cocktail.image && cocktail.image.length > 0 && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black/60 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body (Scrollable) */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {/* Ingredients Checklist */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-[#f0ede8] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843]"></span>
                            Ingredients Check
                        </h3>

                        <ul className="space-y-3">
                            {parsedIngredients.map((ing, idx) => {
                                const isAlreadyInCart = shoppingList.includes(ing.nameForShopping);

                                return (
                                    <li key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#2a2a2a] border border-white/5">
                                        <div className="flex items-center gap-3">
                                            {ing.hasStock ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                            <span className={`text-sm ${ing.hasStock ? "text-[#f0ede8]" : "text-[#a8a49d]"}`}>
                                                {ing.rawText}
                                            </span>
                                        </div>

                                        {/* 장바구니 버튼 (재고 없을 때만 표시) */}
                                        {!ing.hasStock && (
                                            <button
                                                onClick={() => addItem(ing.nameForShopping)}
                                                disabled={isAlreadyInCart}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isAlreadyInCart
                                                    ? "bg-[#333] text-[#6b6761] cursor-not-allowed"
                                                    : "bg-[#d4a843]/10 text-[#d4a843] hover:bg-[#d4a843]/20 border border-[#d4a843]/30"
                                                    }`}
                                            >
                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                {isAlreadyInCart ? "담김" : "리스트에 담기"}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Instructions */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#f0ede8] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843]"></span>
                            Instructions
                        </h3>
                        <div className="p-4 rounded-xl bg-[#2a2a2a]/50 border border-white/5">
                            <p className="text-sm text-[#a8a49d] leading-relaxed whitespace-pre-wrap">
                                {cocktail.instructions}
                            </p>
                        </div>
                    </div>

                    {/* Substitutes / Garnish Information */}
                    {parsedSubstitutes && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-[#f0ede8] uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843]"></span>
                                Garnish / Substitutes
                            </h3>
                            <div className="p-4 rounded-xl bg-[#2a2a2a]/50 border border-white/5">
                                <p className="text-sm text-[#d4a843] italic">
                                    {parsedSubstitutes}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Technique (If exists) */}
                    {cocktail.technique && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-[#f0ede8] uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843]"></span>
                                Technique
                            </h3>
                            <div className="p-4 rounded-xl bg-[#2a2a2a]/50 border border-white/5">
                                <p className="text-sm text-[#d4a843] font-medium">
                                    {cocktail.technique}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Garnish (If exists) */}
                    {cocktail.garnish && (
                        <div>
                            <h3 className="text-sm font-bold text-[#f0ede8] uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843]"></span>
                                Garnish
                            </h3>
                            <div className="p-4 rounded-xl bg-[#2a2a2a]/50 border border-white/5">
                                <p className="text-sm text-[#a8a49d] italic">
                                    {cocktail.garnish}
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>,
        document.body
    );
}
