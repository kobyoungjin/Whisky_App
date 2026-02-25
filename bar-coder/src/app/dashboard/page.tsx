"use client";

import React, { useState, useEffect } from "react";
import InventoryCard from "@/components/dashboard/InventoryCard";
import CocktailGrid from "@/components/dashboard/CocktailGrid";
import SkeletonCard from "@/components/ui/SkeletonCard";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// 더미 데이터 로드 (Baserow 연동 전)
import inventoryData from "@/data/cocktail-inventory.json";
import cocktailData from "@/data/cocktails.json";

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        // API 호출 시뮬레이션
        const timer = setTimeout(() => {
            setLoading(false);
            // 의도적으로 에러를 발생시키려면 아래 주석 해제
            // setError("데이터를 불러오는 중 문제가 발생했습니다. (Baserow API 연결 오류)");
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
                <div className="spinner w-8 h-8 text-[#d4a843] border-2 rounded-full border-t-current border-transparent" />
            </div>
        );
    }

    return (
        <div className="px-6 py-8 max-w-5xl mx-auto animate-fade-in-up">
            {/* Header */}
            <div className="mb-10">
                <h2 className="text-2xl font-bold text-[#f0ede8] mb-1">
                    반가워요, <span className="gold-text">{user.displayName || "Home Bartender"}</span>님!
                </h2>
                <p className="text-[#a8a49d] text-sm">현재 홈바의 상태와 추천 레시피입니다.</p>
            </div>

            {error && (
                <div className="mb-8">
                    <ErrorAlert message={error} onClose={() => setError(null)} />
                </div>
            )}

            {/* Inventory Section */}
            <section className="mb-12">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-[#f0ede8]">재고 현황</h3>
                        <div className="gold-divider w-12 mt-1 opacity-100" />
                    </div>
                    <button className="text-xs font-semibold text-[#d4a843] hover:text-[#e8c06a] transition-colors">
                        전체보기 &rarr;
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading
                        ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
                        : inventoryData.slice(0, 3).map((item) => (
                            <InventoryCard key={item.id} item={item} />
                        ))}
                </div>
            </section>

            {/* Cocktail Recommendation Section */}
            <section>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-[#f0ede8]">추천 칵테일</h3>
                        <div className="gold-divider w-12 mt-1 opacity-100" />
                    </div>
                    <button className="text-xs font-semibold text-[#6b6761] hover:text-[#a8a49d] transition-colors">
                        필터링
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="glass-card h-64 skeleton-shimmer" />
                        ))}
                    </div>
                ) : (
                    <CocktailGrid cocktails={cocktailData} />
                )}
            </section>
        </div>
    );
}
