"use client";

import React, { useState, useEffect, useMemo } from "react";
import CocktailGrid from "@/components/dashboard/CocktailGrid";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getRecipes, getInventory } from "@/lib/baserow";
import { RecipeItem, InventoryItem } from "@/types/baserow";

export default function RecipesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allRecipes, setAllRecipes] = useState<RecipeItem[]>([]);
    const [randomRecipes, setRandomRecipes] = useState<RecipeItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);
            try {
                const [recData, invData] = await Promise.all([
                    getRecipes(),
                    getInventory(user.uid)
                ]);

                // 랜덤으로 섞고 20개만 추출
                const shuffled = [...recData].sort(() => 0.5 - Math.random());
                const randomSample = shuffled.slice(0, 20);

                setAllRecipes(recData); // 전체 저장
                setRandomRecipes(randomSample); // 랜덤 20개 저장
                setInventory(invData);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "레시피 데이터를 불러오는 중 문제가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        if (user && !authLoading) {
            fetchData();
        }
    }, [user, authLoading]);

    // 검색 로직 (쉼표 분리 후 복수 키워드 AND 검색, 공백 무시)
    const displayedRecipes = useMemo(() => {
        if (searchQuery.trim() === "") return randomRecipes;

        const queries = searchQuery.split(",")
            .map(q => q.trim().toLowerCase().replace(/\s+/g, "")) // 공백 제거
            .filter(q => q.length > 0);

        if (queries.length === 0) return randomRecipes;

        return allRecipes.filter(r => {
            const searchTarget = `${r.name}${r.ingredients}`.toLowerCase().replace(/\s+/g, ""); // 공백 제거
            return queries.every(q => searchTarget.includes(q));
        });
    }, [searchQuery, allRecipes, randomRecipes]);

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
                <div className="spinner w-8 h-8 text-[#d4a843] border-2 rounded-full border-t-current border-transparent" />
            </div>
        );
    }

    return (
        <div className="px-4 py-8 max-w-md mx-auto animate-fade-in-up pb-24">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#f0ede8] mb-1">
                    칵테일 <span className="gold-text">레시피</span>
                </h2>
                <p className="text-[#a8a49d] text-sm">홈바에서 즐길 수 있는 다양한 칵테일 컬렉션입니다.</p>
            </div>

            {error && (
                <div className="mb-6">
                    <ErrorAlert message={error} onClose={() => setError(null)} />
                </div>
            )}

            {/* Search Bar */}
            <div className="relative mb-8 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-[#6b6761] group-focus-within:text-[#d4a843] transition-colors" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="칵테일 이름이나 재료(리큐르)를 검색해보세요..."
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[#f0ede8] placeholder:text-[#6b6761] focus:outline-none focus:border-[#d4a843]/50 focus:ring-1 focus:ring-[#d4a843]/50 transition-all shadow-inner"
                />
            </div>

            {/* Cocktail Recommendation Section */}
            <section>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-[#f0ede8]">
                            {searchQuery.trim() !== "" ? "검색 결과" : "공통 칵테일 리스트"}
                        </h3>
                        <div className="gold-divider w-12 mt-1 opacity-100" />
                    </div>
                    {searchQuery.trim() !== "" && (
                        <span className="text-[10px] text-[#6b6761] mb-1">총 {displayedRecipes.length}개</span>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4 mt-6">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-2xl glass-card skeleton-shimmer" />
                        ))}
                    </div>
                ) : displayedRecipes.length > 0 ? (
                    <CocktailGrid cocktails={displayedRecipes} inventory={inventory} />
                ) : (
                    <div className="p-8 text-center text-[#6b6761] glass-card mt-4">
                        <p>검색 결과가 없습니다.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
