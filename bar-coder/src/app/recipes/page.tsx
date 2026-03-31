"use client";

import React, { useState, useEffect, useMemo } from "react";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getRecipes, getInventory, addRecipe, uploadFile } from "@/lib/baserow";
import { RecipeItem, InventoryItem } from "@/types/baserow";
import BentoCocktailGrid from "@/components/recipes/BentoCocktailGrid";

const BASE_SPIRITS = ["Whisky", "Gin", "Rum", "Vodka", "Tequila", "Wine"];
const SPIRIT_KOREAN_MAP: Record<string, string> = {
    "Whisky": "위스키",
    "Gin": "진",
    "Rum": "럼",
    "Vodka": "보드카",
    "Tequila": "데킬라",
    "Wine": "와인"
};
const FLAVORS = ["Sweet", "Sour", "Bitter", "Spicy"];
const DIFFICULTIES = ["Easy", "Intermediate", "Pro"];

// 맛 판별 로직
const getFlavorProfiles = (recipe: RecipeItem): string[] => {
    const text = `${recipe.name} ${recipe.ingredients}`.toLowerCase();
    const profiles: string[] = [];
    if (/설탕|시럽|꿀|주스|리큐르|sweet|sugar|syrup|honey|liqueur/.test(text)) profiles.push("Sweet");
    if (/레몬|라임|식초|사워|sour|lemon|lime/.test(text)) profiles.push("Sour");
    if (/캄파리|베르무트|비터|자몽|커피|bitter|vermouth|gin/.test(text)) profiles.push("Bitter"); // 진도 약간의 쓴맛 포함
    if (/진저|타바스코|고추|시나몬|매운|spicy|ginger|pepper/.test(text)) profiles.push("Spicy");
    return profiles;
};

// 난이도 판별 로직
const getDifficultyLevel = (recipe: RecipeItem): string => {
    const ingredientCount = recipe.ingredients.split(/[,;\n]/).filter(s => s.trim()).length;
    const methodText = `${recipe.instructions} ${recipe.make || ""}`.toLowerCase();
    
    if (ingredientCount >= 6 || /달걀|계란|레이어|infuse|egg|layer/.test(methodText)) return "Pro";
    if (ingredientCount <= 3 && !/쉐이킹|스터링|shake|stir/.test(methodText)) return "Easy";
    return "Intermediate";
};

export default function RecipesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allRecipes, setAllRecipes] = useState<RecipeItem[]>([]);
    const [randomRecipes, setRandomRecipes] = useState<RecipeItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSpirits, setSelectedSpirits] = useState<string[]>([]);
    const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
    
    // Add Recipe Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<any>(null);
    const [newRecipe, setNewRecipe] = useState<any>({
        name: "",
        ingredients: "",
        instructions: "", 
        make: "",         
        glass: "",
        info: "",
        abv: 15,
        garnish: "",
        base: "",
        technique: "Easy"
    });

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

                // 랜덤으로 섞고 상위 12개만 추출 (Bento 그리드에 최적화)
                const shuffled = [...recData].sort(() => 0.5 - Math.random());
                const randomSample = shuffled.slice(0, 11);

                setAllRecipes(recData); // 전체 저장
                setRandomRecipes(randomSample); // 랜덤 12개 저장
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

    // 이미지 업로드 로직 (파일 선택)
    const handleFileUpload = async (file: File) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const data = await uploadFile(file);
            setUploadedImage(data);
            alert("이미지가 업로드되었습니다!");
        } catch (err) {
            console.error(err);
            alert("이미지 업로드에 실패했습니다.");
        } finally {
            setIsUploading(false);
        }
    };

    // 이미지 붙여넣기 핸들러
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    await handleFileUpload(blob);
                }
            }
        }
    };

    // 검색 로직 (베이스 스피릿 필터 적용)
    const displayedRecipes = useMemo(() => {
        let results = allRecipes.filter(r => r.name && r.name.trim());

        // 1. Text Search
        if (searchQuery.trim() !== "") {
            const queries = searchQuery.split(",")
                .map(q => q.trim().toLowerCase().replace(/\s+/g, "")) // 공백 제거
                .filter(q => q.length > 0);

            if (queries.length > 0) {
                results = results.filter(r => {
                    const searchTarget = `${r.name}${r.ingredients}`.toLowerCase().replace(/\s+/g, ""); // 공백 제거
                    return queries.every(q => searchTarget.includes(q));
                });
            }
        }

        // 2. Base Spirit Filter (Multi-select AND logic)
        if (selectedSpirits.length > 0) {
            results = results.filter(r => {
                const ingredientsLower = r.ingredients.toLowerCase();
                return selectedSpirits.every(spirit => {
                    const koreanSpirit = SPIRIT_KOREAN_MAP[spirit] || spirit;
                    return ingredientsLower.includes(koreanSpirit.toLowerCase());
                });
            });
        }

        // 3. Flavor Filter
        if (selectedFlavor) {
            results = results.filter(r => getFlavorProfiles(r).includes(selectedFlavor));
        }

        // 4. Difficulty Filter
        if (selectedDifficulty) {
            results = results.filter(r => getDifficultyLevel(r) === selectedDifficulty);
        }

        // If no search or filter, show random
        if (searchQuery.trim() === "" && selectedSpirits.length === 0 && !selectedFlavor && !selectedDifficulty) {
            return randomRecipes;
        }

        return results;
    }, [searchQuery, selectedSpirits, selectedFlavor, selectedDifficulty, allRecipes, randomRecipes]);

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
                <div className="spinner w-8 h-8 text-[#d4a843] border-2 rounded-full border-t-current border-transparent" />
            </div>
        );
    }

    const toggleSpirit = (spirit: string) => {
        setSelectedSpirits(prev => 
            prev.includes(spirit) 
                ? prev.filter(s => s !== spirit) 
                : [...prev, spirit]
        );
    };

    return (
        <div className="relative w-full">

            <div className="pt-20 pb-32 px-4 sm:px-6 animate-fade-in-up w-full overflow-x-hidden box-border">
                {error && (
                    <div className="mb-4">
                        <ErrorAlert message={error} onClose={() => setError(null)} />
                    </div>
                )}
 
                {/* Search Bar Section */}
                <section className="mb-6 w-full">
                    <div className="relative group w-full max-w-full">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors duration-300 pointer-events-none">search</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface-container-low border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 text-base sm:text-xl py-4 pl-12 sm:pl-14 pr-4 transition-all duration-400 font-headline italic placeholder:text-on-surface-variant/40 placeholder:font-body placeholder:not-italic outline-none text-on-surface box-border"
                            placeholder="칵테일 이름이나 재료를 검색해보세요"
                        />
                    </div>
                </section>
 
                {/* Filters Section */}
                <section className="space-y-4 mb-8 w-full">
                    {/* Base Spirit */}
                    <div className="space-y-1 sm:space-y-2">
                        <h3 className="font-headline text-[10px] sm:text-xs tracking-[0.2em] uppercase text-on-surface-variant/80 px-1">Base Spirit</h3>
                        <div className="flex flex-wrap gap-2 sm:gap-3 w-full">
                            {BASE_SPIRITS.map(spirit => (
                                <button
                                    key={spirit}
                                    onClick={() => toggleSpirit(spirit)}
                                    className={`px-3 sm:px-5 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                                        selectedSpirits.includes(spirit)
                                            ? "bg-primary/10 border border-primary/40 text-primary shadow-[0_0_15px_rgba(255,198,62,0.1)]"
                                            : "bg-surface-variant/30 backdrop-blur-md border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary"
                                    }`}
                                >
                                    {spirit}
                                </button>
                            ))}
                        </div>
                    </div>
 
                    {/* Flavor Profile (UI Only) */}
                    <div className="space-y-1 sm:space-y-2">
                        <h3 className="font-headline text-[10px] sm:text-xs tracking-[0.2em] uppercase text-on-surface-variant/80 px-1">Flavor Profile</h3>
                        <div className="flex flex-wrap gap-2 sm:gap-3 w-full">
                            {FLAVORS.map(flavor => (
                                <button
                                    key={flavor}
                                    onClick={() => setSelectedFlavor(selectedFlavor === flavor ? null : flavor)}
                                    className={`px-3 sm:px-5 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                                        selectedFlavor === flavor
                                            ? "bg-primary/10 border border-primary/40 text-primary shadow-[0_0_15px_rgba(255,198,62,0.1)]"
                                            : "bg-surface-variant/30 backdrop-blur-md border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary"
                                    }`}
                                >
                                    {flavor}
                                </button>
                            ))}
                        </div>
                    </div>
 
                    {/* Difficulty (UI Only) */}
                    <div className="space-y-1 sm:space-y-2">
                        <h3 className="font-headline text-[10px] sm:text-xs tracking-[0.2em] uppercase text-on-surface-variant/80 px-1">Difficulty</h3>
                        <div className="flex flex-wrap gap-2 sm:gap-3 w-full">
                            {DIFFICULTIES.map(difficulty => (
                                <button
                                    key={difficulty}
                                    onClick={() => setSelectedDifficulty(selectedDifficulty === difficulty ? null : difficulty)}
                                    className={`px-3 sm:px-5 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                                        selectedDifficulty === difficulty
                                            ? "bg-primary/10 border border-primary/40 text-primary shadow-[0_0_15px_rgba(255,198,62,0.1)]"
                                            : "bg-surface-variant/30 backdrop-blur-md border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary"
                                    }`}
                                >
                                    {difficulty}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Search Results Grid */}
                <section>
                    <div className="flex items-end justify-between mb-6 sm:mb-8">
                        <h2 className="font-headline text-xl sm:text-3xl italic text-on-surface">Curated Matches</h2>
                        {displayedRecipes.length > 0 && (
                            <span className="text-on-surface-variant text-[10px] sm:text-sm tracking-widest uppercase pb-1 sm:pb-0">{displayedRecipes.length} Results</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`rounded-xl bg-surface-container-low skeleton-shimmer border border-outline-variant/10 ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`} />
                            ))}
                        </div>
                    ) : displayedRecipes.length > 0 ? (
                        <BentoCocktailGrid cocktails={displayedRecipes} inventory={inventory} />
                    ) : (
                        <div className="p-12 text-center text-on-surface-variant bg-surface-container-low border border-outline-variant/10 rounded-xl">
                            <span className="material-symbols-outlined text-4xl mb-4 text-primary opacity-60">search_off</span>
                            <p className="font-body text-sm sm:text-base">조건에 맞는 결과가 없습니다.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Add Recipe Floating Action Button (FAB) */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-[130px] right-6 z-[80] w-14 h-14 rounded-full bg-primary text-black shadow-[0_4px_24px_rgba(212,168,67,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
            >
                <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform duration-300">add</span>
            </button>

            {/* Recipe Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
                        onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                    />
                    <div className="relative w-full max-w-lg bg-surface-container-high border border-outline-variant/20 rounded-[2rem] shadow-2xl p-6 sm:p-8 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-headline font-bold text-on-surface">New Recipe</h3>
                                <p className="text-xs text-on-surface-variant/60 tracking-widest uppercase mt-1">Share your mixology secret</p>
                            </div>
                            <button 
                                onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                                className="p-2 hover:bg-surface-variant/30 rounded-full transition-colors text-on-surface-variant"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (isSubmitting) return;

                                // 유효성 검사
                                if (!newRecipe.name.trim() || !newRecipe.ingredients.trim()) {
                                    alert("이름과 재료를 모두 입력해 주세요.");
                                    return;
                                }

                                // 중복 체크
                                const isDuplicate = allRecipes.some(r => r.name.toLowerCase() === newRecipe.name.toLowerCase());
                                if (isDuplicate) {
                                    alert("이미 존재하는 레시피 이름입니다. 고유한 이름을 사용해 주세요!");
                                    return;
                                }

                                setIsSubmitting(true);
                                try {
                                    // 이미지에서 요청하신 JSON 구조 생성 (Substitutes 필드에 저장)
                                    const substitutesJson = JSON.stringify({
                                        garnish: newRecipe.garnish || "",
                                        base: newRecipe.base || ""
                                    });

                                    const payload: any = {
                                        name: newRecipe.name.trim(),
                                        ingredients: newRecipe.ingredients.trim(),
                                        instructions: newRecipe.instructions.trim(), // TECHNIQUE 라벨
                                        make: newRecipe.make.trim(),                 // INSTRUCTIONS 라벨
                                        glass: newRecipe.glass.trim(),
                                        abv: Number(newRecipe.abv) || 0,
                                        substitutes: substitutesJson, // JSON 문자열로 저장
                                        technique: newRecipe.technique || "Easy",
                                        info: newRecipe.info || `${newRecipe.name} 레시피`
                                    };

                                    // 업로드된 이미지가 있으면 우선 적용
                                    if (uploadedImage) {
                                        payload.image = [uploadedImage];
                                    }

                                    console.log("[Recipe Add] Final Payload:", payload);

                                    await addRecipe(payload);
                                    alert("레시피가 성공적으로 등록 되었습니다!");
                                    setIsAddModalOpen(false);
                                    setUploadedImage(null);
                                    localStorage.removeItem("bar_coder_recipes_cache_v2");
                                    window.location.reload();
                                } catch (err: any) {
                                    console.error("[Recipe Add] Error Detail:", err.response?.data || err);
                                    alert("등록 실패 (400): 필드 형식을 확인해 주세요.");
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }} 
                            onPaste={handlePaste}
                            className="space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar px-1"
                        >
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Cocktail Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newRecipe.name}
                                    onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                                    placeholder="예: 미드나잇 마티니"
                                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Technique (instruct.)</label>
                                    <input
                                        type="text"
                                        value={newRecipe.instructions}
                                        onChange={(e) => setNewRecipe({...newRecipe, instructions: e.target.value})}
                                        placeholder="예: Shaking / instructions 필드 저장"
                                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Glassware (glass)</label>
                                    <input
                                        type="text"
                                        value={newRecipe.glass}
                                        onChange={(e) => setNewRecipe({...newRecipe, glass: e.target.value})}
                                        placeholder="예: Coupette / glass 필드 저장"
                                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Image (Upload or Paste)</label>
                                <div className="relative group">
                                    <div className={`w-full h-32 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden bg-surface-container ${isUploading ? 'border-primary animate-pulse' : 'border-outline-variant/30 hover:border-primary/50'}`}>
                                        {uploadedImage ? (
                                            <img src={uploadedImage.url} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">image</span>
                                                <p className="text-[10px] text-on-surface-variant/60 font-medium">Click to upload or Ctrl+V to paste</p>
                                            </>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                        />
                                    </div>
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Garnish (subst.)</label>
                                    <input
                                        type="text"
                                        value={newRecipe.garnish}
                                        onChange={(e) => setNewRecipe({...newRecipe, garnish: e.target.value})}
                                        placeholder="예: 체리, 오렌지 껍질"
                                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Base (subst.)</label>
                                    <input
                                        type="text"
                                        value={newRecipe.base}
                                        onChange={(e) => setNewRecipe({...newRecipe, base: e.target.value})}
                                        placeholder="예: 논 알코올, 위스키"
                                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">ABV (%)</label>
                                <input
                                    type="number"
                                    value={newRecipe.abv}
                                    onChange={(e) => setNewRecipe({...newRecipe, abv: Number(e.target.value)})}
                                    placeholder="도수 (예: 15)"
                                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Ingredients (ingredients)</label>
                                <textarea
                                    required
                                    value={newRecipe.ingredients}
                                    onChange={(e) => setNewRecipe({...newRecipe, ingredients: e.target.value})}
                                    placeholder="재료와 용량 / ingredients 필드 저장"
                                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors h-20 resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">Instructions (make)</label>
                                <textarea
                                    required
                                    value={newRecipe.make}
                                    onChange={(e) => setNewRecipe({...newRecipe, make: e.target.value})}
                                    placeholder="만드는 법 단계 / make 필드 저장"
                                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none transition-colors h-20 resize-none"
                                />
                            </div>

                            {/* Substitutes JSON 매핑 완료로 기존 텍스트 영역 제거 */}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-4"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="material-symbols-outlined">publish</span>}
                                {isSubmitting ? "Submitting..." : "Add to Server"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
