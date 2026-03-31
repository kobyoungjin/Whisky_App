"use client";

import React, { useState, useEffect } from "react";
import DashboardStats from "@/components/dashboard/DashboardStats";
import BentoCocktailGrid from "@/components/recipes/BentoCocktailGrid";
import SkeletonCard from "@/components/ui/SkeletonCard";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getInventory, getRecipes } from "@/lib/baserow";
import { InventoryItem, RecipeItem } from "@/types/baserow";
import { checkCocktailAvailability } from "@/lib/substitute";
import Link from "next/link";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [makeableCocktails, setMakeableCocktails] = useState<RecipeItem[]>([]);
    const [almostMakeableCocktails, setAlmostMakeableCocktails] = useState<RecipeItem[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAlmostExpanded, setIsAlmostExpanded] = useState(false);

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

                // 레시피 분류: Ready to Mix (100% 또는 대체 가능) & Almost Perfect (1~2개 부족)
                const ready: RecipeItem[] = [];
                const almost: RecipeItem[] = [];

                recData.forEach(recipe => {
                    // 이름이 없는 유효하지 않은 데이터는 건너뜀
                    if (!recipe.name || !recipe.name.trim()) return;

                    const result = checkCocktailAvailability(recipe, invData);
                    
                    // 1. Ready to Mix: 완전 가능하거나 모든 부족분이 대체품으로 해결 가능할 때
                    const canSubstituteAll = result.missingIngredients.length > 0 && 
                      result.missingIngredients.every(missing => 
                        result.substituteSuggestions.some(sug => sug.missing === missing && sug.substitutesInInventory.length > 0)
                      );

                    if (result.isAvailable || canSubstituteAll) {
                        ready.push(recipe);
                    } 
                    // 2. Almost Perfect: 대체 불가능한 부족 재료가 딱 1개일 때
                    else if (result.missingIngredients.length === 1) {
                        almost.push(recipe);
                    }
                });

                setMakeableCocktails(ready);
                setAlmostMakeableCocktails(almost);

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

    const displayedCocktails = isExpanded ? makeableCocktails : makeableCocktails.slice(0, 6);
    const hasMore = makeableCocktails.length > 6;

    return (
        <div className="relative w-full">

            <div className="pt-24 pb-32 px-4 sm:px-6 animate-fade-in-up w-full overflow-x-hidden box-border">

                {/* Header */}
                <div className="mb-12 text-center sm:text-left px-1">
                    <span className="text-primary/70 text-[10px] uppercase tracking-[0.3em] font-bold mb-3 block">Private Bar Dashboard</span>
                    <h2 className="text-3xl sm:text-5xl font-headline italic text-on-surface leading-tight mb-2">
                        Welcome back,<br />
                        <span className="text-primary not-italic font-black tracking-tighter decoration-primary/30 decoration-wavy underline underline-offset-8">
                            {user.displayName || user.email?.split('@')[0] || "Mixologist"}
                        </span>
                    </h2>
                    <p className="text-on-surface-variant font-body text-sm tracking-wide mt-6 opacity-80">현재 홈바의 정교한 재고 현황과 큐레이션입니다.</p>
                </div>

                {error && (
                    <div className="mb-8">
                        <ErrorAlert message={error} onClose={() => setError(null)} />
                    </div>
                )}

                {/* Dashboard Stats (with Scan Button) */}
                {!loading && <DashboardStats inventory={inventory} />}

                {/* Makeable Cocktails Section */}
                <section className="mt-16 mb-20">
                    <div className="flex items-end justify-between mb-8 sm:mb-10 px-1">
                        <div>
                            <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-bold mb-2 block">100% Match</span>
                            <h2 className="font-headline text-2xl sm:text-3xl italic text-on-surface">Ready to Mix</h2>
                        </div>
                        {makeableCocktails.length > 0 && (
                            <span className="text-on-surface-variant text-[10px] sm:text-xs tracking-widest uppercase pb-1">
                                {makeableCocktails.length} Curations
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl bg-surface-container-low skeleton-shimmer border border-outline-variant/10" />
                            ))}
                        </div>
                    ) : makeableCocktails.length > 0 ? (
                        <>
                            <div className="mt-6">
                                <BentoCocktailGrid cocktails={displayedCocktails} inventory={inventory} featured={false} />
                            </div>

                            {hasMore && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full mt-10 py-5 flex items-center justify-center gap-3 bg-surface-container-low/40 backdrop-blur-md border border-outline-variant/20 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/10 transition-all duration-300 shadow-lg"
                                >
                                    {isExpanded ? (
                                        <>Close Library <ChevronUp className="w-4 h-4" /></>
                                    ) : (
                                        <>Explore Full Selection (+{makeableCocktails.length - 6} more) <ChevronDown className="w-4 h-4" /></>
                                    )}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="mt-6 w-full p-16 text-center text-on-surface-variant bg-surface-container-low/40 border-2 border-dashed border-outline-variant/30 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/5 opacity-50 blur-3xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-1000 pointer-events-none"></div>
                            <span className="material-symbols-outlined text-5xl mb-6 text-primary/40 group-hover:text-primary transition-colors duration-500 pointer-events-none" style={{ fontVariationSettings: "'FILL' 0" }}>liquor</span>
                            <h3 className="text-xl font-headline italic text-on-surface mb-3">Your Bar is Quiet</h3>
                            <p className="text-sm font-body text-on-surface-variant max-w-[200px] mb-8 opacity-70">현재 재고로 만들 수 있는 칵테일이 없습니다. 재료를 더 추가해 볼까요?</p>
                            <button onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-scan-modal')); }} className="bg-primary text-black px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                                Register Spirits
                            </button>
                        </div>
                    )}
                </section>
                
                {/* Almost Perfect Section */}
                <section className="mb-20">
                    <div className="flex items-center gap-4 mb-10 px-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] tracking-[0.2em] uppercase text-primary/70 font-bold mb-1 block">90% Match</span>
                            <h2 className="font-headline text-2xl sm:text-3xl italic text-on-surface">Almost Perfect</h2>
                        </div>
                        <span className="h-[1px] flex-grow bg-primary/10"></span>
                        {almostMakeableCocktails.length > 0 && (
                            <span className="text-on-surface-variant text-[10px] tracking-widest uppercase">
                                {almostMakeableCocktails.length} Items Found
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl bg-surface-container-low skeleton-shimmer border border-outline-variant/10" />
                            ))}
                        </div>
                    ) : almostMakeableCocktails.length > 0 ? (
                        <>
                            <div className="mt-6">
                                <BentoCocktailGrid 
                                    cocktails={isAlmostExpanded ? almostMakeableCocktails : almostMakeableCocktails.slice(0, 6)} 
                                    inventory={inventory} 
                                    featured={false} 
                                />
                            </div>

                            {almostMakeableCocktails.length > 6 && (
                                <button
                                    onClick={() => setIsAlmostExpanded(!isAlmostExpanded)}
                                    className="w-full mt-10 py-5 flex items-center justify-center gap-3 bg-surface-container-low/40 backdrop-blur-md border border-outline-variant/20 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/10 transition-all duration-300 shadow-lg"
                                >
                                    {isAlmostExpanded ? (
                                        <>Close Insights <ChevronUp className="w-4 h-4" /></>
                                    ) : (
                                        <>See Everything (+{almostMakeableCocktails.length - 6} more) <ChevronDown className="w-4 h-4" /></>
                                    )}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="relative group bg-surface-container-low/20 backdrop-blur-sm rounded-[2.5rem] overflow-hidden border border-outline-variant/5 p-12 text-center">
                            <Sparkles className="w-8 h-8 text-primary/20 mx-auto mb-6 opacity-40" />
                            <p className="text-on-surface-variant text-sm font-body max-w-xs mx-auto leading-relaxed italic opacity-60">
                                "조금 더 재료를 채우면<br />
                                새로운 추천 칵테일들이 이곳에 나타납니다."
                            </p>
                        </div>
                    )}
                </section>
                
            </div>
        </div>
    );
}
