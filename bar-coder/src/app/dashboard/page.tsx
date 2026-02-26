"use client";

import React, { useState, useEffect } from "react";
import DashboardStats from "@/components/dashboard/DashboardStats";
import CocktailGrid from "@/components/dashboard/CocktailGrid";
import SkeletonCard from "@/components/ui/SkeletonCard";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getInventory, getRecipes } from "@/lib/baserow";
import { InventoryItem, RecipeItem } from "@/types/baserow";
import { checkCocktailAvailability } from "@/lib/substitute";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [makeableCocktails, setMakeableCocktails] = useState<RecipeItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);
            try {
                const [invData, recData] = await Promise.all([
                    getInventory(user.uid),
                    getRecipes()
                ]);
                setInventory(invData);

                // 내 재고로 만들 수 있는(isAvailable) 칵테일 필터링
                const available = recData.filter(recipe => {
                    const result = checkCocktailAvailability(recipe, invData);
                    return result.isAvailable;
                });

                setMakeableCocktails(available);

            } catch (err: any) {
                console.error(err);
                setError(err.message || "데이터를 불러오는 중 문제가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        if (user && !authLoading) {
            fetchDashboardData();
        }
    }, [user, authLoading]);

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
                <div className="spinner w-8 h-8 text-[#d4a843] border-2 rounded-full border-t-current border-transparent" />
            </div>
        );
    }

    const displayedCocktails = isExpanded ? makeableCocktails : makeableCocktails.slice(0, 12);
    const hasMore = makeableCocktails.length > 12;

    return (
        <div className="px-4 py-8 max-w-md mx-auto animate-fade-in-up pb-24">
            {/* Header */}
            <div className="mb-6 px-2">
                <h2 className="text-xl font-bold text-[#f0ede8] mb-1">
                    반가워요, <span className="gold-text">{user.displayName || user.email?.split('@')[0] || "Home Bartender"}</span>님!
                </h2>
                <p className="text-[#a8a49d] text-xs">현재 홈바의 전체 재고 현황 요약입니다.</p>
            </div>

            {error && (
                <div className="mb-6 px-2">
                    <ErrorAlert message={error} onClose={() => setError(null)} />
                </div>
            )}

            {/* Dashboard Stats (with Scan Button) */}
            <div className="px-2">
                {!loading && <DashboardStats inventory={inventory} />}
            </div>

            {/* Makeable Cocktails Section */}
            <section className="mt-8 px-2">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-[#f0ede8]">지금 만들 수 있는 칵테일</h3>
                        <div className="gold-divider w-12 mt-1 opacity-100" />
                    </div>
                    {makeableCocktails.length > 0 && (
                        <span className="text-[10px] text-[#6b6761] mb-1">총 {makeableCocktails.length}개</span>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 glass-card skeleton-shimmer" />)}
                    </div>
                ) : makeableCocktails.length > 0 ? (
                    <>
                        {/* 4x4 Grid in Desktop, 2xX in mobile layout limits */}
                        <div className="mt-6">
                            <CocktailGrid cocktails={displayedCocktails} inventory={inventory} />
                        </div>

                        {hasMore && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-full mt-6 py-3 flex items-center justify-center gap-2 bg-[#2a2a2a] border border-[#d4a843]/30 rounded-xl text-sm font-bold text-[#d4a843] hover:bg-[#d4a843]/10 transition-colors"
                            >
                                {isExpanded ? (
                                    <>접기 <ChevronUp className="w-4 h-4" /></>
                                ) : (
                                    <>모두 보기 (+{makeableCocktails.length - 12}개) <ChevronDown className="w-4 h-4" /></>
                                )}
                            </button>
                        )}
                    </>
                ) : (
                    <div className="mt-6 col-span-full p-8 text-center text-[#6b6761] glass-card flex flex-col items-center justify-center">
                        <span className="text-3xl mb-3">🍸</span>
                        <p className="text-sm">현재 재고로 만들 수 있는 칵테일이 없어요.</p>
                        <Link href="/mypage" className="mt-2 text-xs text-[#d4a843] underline underline-offset-4">
                            스캔 기능을 통해 술을 등록해 보세요!
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}
