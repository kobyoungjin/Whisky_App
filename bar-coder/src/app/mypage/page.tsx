"use client";

import React, { useState, useEffect, useMemo } from "react";
import InventoryCard from "@/components/dashboard/InventoryCard";
import SkeletonCard from "@/components/ui/SkeletonCard";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRouter } from "next/navigation";
import { getInventory, addInventoryItem, getInventoryFields, deleteInventoryItem, updateInventoryItem } from "@/lib/baserow";
import { InventoryItem } from "@/types/baserow";
import { ShoppingCart, LogOut, Check, Trash2, Settings, X, Plus, Beaker, Wine, Droplets, ChevronDown, ExternalLink } from "lucide-react";

export default function MyPage() {
    const { user, logOut, loading: authLoading } = useAuth();
    const router = useRouter();
    const { items: shoppingList, addItem, removeItem, isLoaded: shoppingLoaded } = useShoppingList();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ id: number; value: string; color?: string }[]>([]);


    const [activeInventoryTab, setActiveInventoryTab] = useState<"base" | "liqueur" | "ingredient">("base");
    const [activeShoppingTab, setActiveShoppingTab] = useState<"base" | "liqueur" | "ingredient">("base");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        abv: 40,
        volume: 700,
        category: "위스키"
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 카테고리 분류 상수 (Baserow Select Option Values와 일치해야 함)
    const CATEGORIES = {
        base: ["위스키", "스카치 위스키", "버번 위스키", "진", "럼", "보드카", "데킬라", "테킬라", "브랜디", "꼬냑", "와인", "소주", "전통주", "기타 증류주"],
        liqueur: ["리큐르", "베르무트", "리큐어"],
        ingredient: ["과일", "주스", "쥬스", "시럽", "소다", "탄산수", "비터", "설탕", "맥주", "음료", "기타"]
    };


    const categorize = (name: string = "", categoryValue: string = "") => {
        const n = name.toLowerCase();
        const c = categoryValue.toLowerCase();

        // 보강된 키워드 세트
        const baseKeywords = [...CATEGORIES.base, "whisky", "whiskey", "blended", "single malt", "scotch", "bourbon", "스카치", "버번", "싱글몰트", "블렌디드", "발렌타인", "맥캘란", "glen", "글렌", "springbank", "스프링뱅크", "cognac", "wine", "wine", "cognac", "와인", "꼬냑"];

        const liqueurKeywords = [...CATEGORIES.liqueur, "liqueur", "bols", "de kuyper", "깔루아", "베일리", "말리부", "트리플", "섹", "디카이퍼"];

        // 1순위: 카테고리 값 기준 (Baserow 설정값 우선)
        if (CATEGORIES.base.some(b => c.includes(b))) return "base";
        if (CATEGORIES.liqueur.some(l => c.includes(l))) return "liqueur";
        if (CATEGORIES.ingredient.some(i => c.includes(i))) return "ingredient";

        // 2순위: 이름 기준 (주로 장보기 목록이나 카테고리가 '기타'인 경우)
        if (baseKeywords.some(b => n.includes(b.toLowerCase()))) return "base";
        if (liqueurKeywords.some(l => n.includes(l.toLowerCase()))) return "liqueur";

        return "ingredient";
    };

    // 필터링된 인벤토리
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => categorize(item.name, item.category?.value) === activeInventoryTab);
    }, [inventory, activeInventoryTab]);

    // 장보기 목록 자동 분류 및 카운트
    const shoppingCounts = useMemo(() => {
        const counts = { base: 0, liqueur: 0, ingredient: 0 };
        shoppingList.forEach(itemName => {
            counts[categorize(itemName)]++;
        });
        return counts;
    }, [shoppingList]);

    const filteredShoppingList = useMemo(() => {
        return shoppingList.filter(itemName => categorize(itemName) === activeShoppingTab);
    }, [shoppingList, activeShoppingTab]);

    // 인벤토리 카운트
    const inventoryCounts = useMemo(() => {
        const counts = { base: 0, liqueur: 0, ingredient: 0 };
        inventory.forEach(item => {
            counts[categorize(item.name, item.category?.value)]++;
        });
        return counts;
    }, [inventory]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const [invData, fieldsData] = await Promise.all([
                getInventory(user.uid),
                getInventoryFields()
            ]);
            setInventory(invData);

            // Find category field options
            const categoryField = fieldsData.find((f: any) => f.name === "category");
            if (categoryField && categoryField.select_options) {
                setCategoryOptions(categoryField.select_options);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "데이터를 불러오는 중 문제가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user && !authLoading) {
            fetchData();
        }
    }, [user, authLoading]);

    // 탭 변경 시 폼 기본 카테고리 업데이트 (Add 모드일 때만)
    useEffect(() => {
        if (!editingItem && !isAddModalOpen) {
            setFormData(prev => ({
                ...prev,
                category: activeInventoryTab === "base" ? "위스키" : activeInventoryTab === "liqueur" ? "리큐르" : "시럽"
            }));
        }
    }, [activeInventoryTab, editingItem, isAddModalOpen]);

    // [New] 과일, 주스, 시럽 카테고리 선택 시 도수 0으로 자동 변경
    useEffect(() => {
        const cat = formData.category.toLowerCase();
        if (cat.includes("과일") || cat.includes("주스") || cat.includes("쥬스") || cat.includes("시럽")) {
            setFormData(prev => ({ ...prev, abv: 0 }));
        }
    }, [formData.category]);

    // [New] 모달 오픈 시 배경 스크롤 방지
    useEffect(() => {
        if (isAddModalOpen || editingItem) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isAddModalOpen, editingItem]);

    const handleLogout = async () => {
        if (confirm("정말 로그아웃 하시겠습니까?")) {
            await logOut();
            router.push("/");
        }
    };

    // --- Action Handlers ---
    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            abv: item.abv,
            volume: item.volume,
            category: item.category?.value || (activeInventoryTab === "base" ? "위스키" : activeInventoryTab === "liqueur" ? "리큐르" : "시럽")
        });
    };


    const handleDelete = async (id: number) => {
        if (!confirm("정말 이 재고를 삭제하시겠습니까?")) return;
        try {
            await deleteInventoryItem(id);
            await fetchData();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("재고 삭제 중 오류가 발생했습니다.");
        }
    };

    const handleAddToShoppingList = (name: string) => {
        addItem(name);
        alert(`"${name}" 항목이 장보기 목록에 추가되었습니다.`);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.name.trim()) {
            alert("이름을 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Find existing category ID for the selected category value
            const matchedOption = categoryOptions.find(opt => opt.value === formData.category);
            const categoryValue = matchedOption ? matchedOption.id : formData.category;


            const payload = {
                name: formData.name,
                abv: Number(formData.abv),
                volume: Number(formData.volume),
                category: categoryValue as any,
            };

            if (editingItem) {
                await updateInventoryItem(editingItem.id, payload);
                setEditingItem(null);
            } else {
                await addInventoryItem(user.uid, payload as any);
                setIsAddModalOpen(false);
            }

            setFormData({ ...formData, name: "" }); // Reset name
            await fetchData(); // Refresh list
        } catch (err: any) {
            console.error("Form submission failed:", err);
            alert("작업 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
                <div className="spinner w-8 h-8 text-[#d4a843] border-2 rounded-full border-t-current border-transparent" />
            </div>
        );
    }

    return (
        <div className="px-4 md:px-6 py-8 max-w-6xl mx-auto animate-fade-in-up pb-24">
            {/* Header / Profile section */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#333] border-2 border-[#d4a843] flex items-center justify-center overflow-hidden">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl">👤</span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#f0ede8]">
                            {user.displayName || "Home Bartender"}
                        </h2>
                        <p className="text-xs text-[#a8a49d]">{user.email}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="p-2 rounded-lg bg-[#333] text-[#a8a49d] hover:text-[#f0ede8] transition-colors"
                        title="대시보드 가기"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg bg-[#333] text-red-400 hover:text-red-300 transition-colors"
                        title="로그아웃"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6">
                    <ErrorAlert message={error} onClose={() => setError(null)} />
                </div>
            )}

            {/* Removed Global Tabs */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Shopping List */}
                <div className="lg:col-span-1 border border-white/5 rounded-2xl bg-[#2a2a2a]/50 p-6 flex flex-col">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-[#d4a843]" />
                            <h3 className="text-lg font-bold text-[#f0ede8]">장보기 목록</h3>
                        </div>

                        {/* Shopping Tabs (Unified Style) */}
                        <div className="flex gap-1 bg-[#1a1a1a] p-1.5 rounded-2xl border border-white/5 w-full">
                            <button
                                onClick={() => setActiveShoppingTab("base")}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${activeShoppingTab === "base" ? "bg-[#d4a843] text-black shadow-lg shadow-[#d4a843]/10" : "text-[#6b6761] hover:text-[#a8a49d]"}`}
                            >
                                <Beaker className="w-3 h-3" />
                                술 {shoppingCounts.base > 0 && `(${shoppingCounts.base})`}
                            </button>
                            <button
                                onClick={() => setActiveShoppingTab("liqueur")}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${activeShoppingTab === "liqueur" ? "bg-[#d4a843] text-black shadow-lg shadow-[#d4a843]/10" : "text-[#6b6761] hover:text-[#a8a49d]"}`}
                            >
                                <Wine className="w-3 h-3" />
                                리큐르 {shoppingCounts.liqueur > 0 && `(${shoppingCounts.liqueur})`}
                            </button>
                            <button
                                onClick={() => setActiveShoppingTab("ingredient")}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${activeShoppingTab === "ingredient" ? "bg-[#d4a843] text-black shadow-lg shadow-[#d4a843]/10" : "text-[#6b6761] hover:text-[#a8a49d]"}`}
                            >
                                <Droplets className="w-3 h-3" />
                                재료 {shoppingCounts.ingredient > 0 && `(${shoppingCounts.ingredient})`}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1">
                        {!shoppingLoaded ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton-shimmer rounded-xl" />)}
                            </div>
                        ) : filteredShoppingList.length === 0 ? (
                            <div className="text-center py-12 text-[#6b6761] text-sm bg-[#1a1a1a]/30 rounded-2xl border border-dashed border-white/5">
                                <span className="text-2xl mb-2 block opacity-40">🛒</span>
                                이 카테고리에 필터링된<br />재료가 없습니다.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {filteredShoppingList.map((item: string, idx: number) => {
                                    const itemCat = categorize(item);
                                    return (
                                        <li key={idx} className="flex flex-col gap-2 p-3 bg-[#1a1a1a] rounded-xl border border-white/5 group hover:border-[#d4a843]/30 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[#f0ede8] font-medium">{item}</span>
                                                <button
                                                    onClick={() => removeItem(item)}
                                                    className="text-[#6b6761] hover:text-red-400 transition-colors p-1"
                                                    title="구매 완료 / 삭제"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-1 border-t border-white/5 pt-2">
                                                {itemCat !== "ingredient" ? (
                                                    <>
                                                        <a
                                                            href={`https://dailyshot.co/m/search/result?q=${encodeURIComponent(item)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] px-2 py-1 rounded-md bg-[#2a2a2a] text-[#a8a49d] hover:bg-[#d4a843] hover:text-black transition-all flex items-center gap-1"
                                                        >
                                                            데일리샷
                                                            <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                        <a
                                                            href={`https://with.gsshop.com/shop/wine/search.gs?tq=${encodeURIComponent(item)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] px-2 py-1 rounded-md bg-[#2a2a2a] text-[#a8a49d] hover:bg-[#d4a843] hover:text-black transition-all flex items-center gap-1"
                                                        >
                                                            GS25
                                                            <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                        <a
                                                            href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] px-2 py-1 rounded-md bg-[#2a2a2a] text-[#a8a49d] hover:bg-[#d4a843] hover:text-black transition-all flex items-center gap-1"
                                                        >
                                                            네이버
                                                            <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                    </>
                                                ) : (
                                                    <>
                                                        <a
                                                            href={`https://www.coupang.com/np/search?q=${encodeURIComponent(item)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] px-2 py-1 rounded-md bg-[#2a2a2a] text-[#a8a49d] hover:bg-[#d4a843] hover:text-black transition-all flex items-center gap-1"
                                                        >
                                                            쿠팡
                                                            <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                        <a
                                                            href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] px-2 py-1 rounded-md bg-[#2a2a2a] text-[#a8a49d] hover:bg-[#d4a843] hover:text-black transition-all flex items-center gap-1"
                                                        >
                                                            네이버
                                                            <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                        <a
                                                            href={`https://with.gsshop.com/shop/search/main.gs?tq=${encodeURIComponent(item)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] px-2 py-1 rounded-md bg-[#2a2a2a] text-[#a8a49d] hover:bg-[#d4a843] hover:text-black transition-all flex items-center gap-1"
                                                        >
                                                            GS25
                                                            <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                        <a
                                                            href={`https://ehomebar.co.kr/product/search.html?keyword=${encodeURIComponent(item)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] px-2 py-1 rounded-md bg-[#2a2a2a] text-[#a8a49d] hover:bg-[#d4a843] hover:text-black transition-all flex items-center gap-1"
                                                        >
                                                            이홈바
                                                            <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Right Column: Full Inventory */}
                <div className="lg:col-span-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-[#2a2a2a]/30 p-4 rounded-2xl border border-white/5">
                        <div className="flex-1 w-full">
                            <h3 className="text-lg font-bold text-[#f0ede8] flex items-center gap-2 mb-3">
                                {activeInventoryTab === "base" ? "베이스 기주" : activeInventoryTab === "liqueur" ? "리큐르 컬렉션" : "부재료 및 가니쉬"}
                            </h3>

                            {/* Inventory Tabs (Unified Style) */}
                            <div className="flex gap-1 bg-[#1a1a1a] p-1.5 rounded-2xl border border-white/5 w-full sm:w-fit">
                                <button
                                    onClick={() => setActiveInventoryTab("base")}
                                    className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${activeInventoryTab === "base" ? "bg-[#d4a843] text-black shadow-lg shadow-[#d4a843]/10" : "text-[#6b6761] hover:text-[#a8a49d]"}`}
                                >
                                    <Beaker className="w-3.5 h-3.5" />
                                    술 {inventoryCounts.base > 0 && `(${inventoryCounts.base})`}
                                </button>
                                <button
                                    onClick={() => setActiveInventoryTab("liqueur")}
                                    className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${activeInventoryTab === "liqueur" ? "bg-[#d4a843] text-black shadow-lg shadow-[#d4a843]/10" : "text-[#6b6761] hover:text-[#a8a49d]"}`}
                                >
                                    <Wine className="w-3.5 h-3.5" />
                                    리큐르 {inventoryCounts.liqueur > 0 && `(${inventoryCounts.liqueur})`}
                                </button>
                                <button
                                    onClick={() => setActiveInventoryTab("ingredient")}
                                    className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${activeInventoryTab === "ingredient" ? "bg-[#d4a843] text-black shadow-lg shadow-[#d4a843]/10" : "text-[#6b6761] hover:text-[#a8a49d]"}`}
                                >
                                    <Droplets className="w-3.5 h-3.5" />
                                    재료 {inventoryCounts.ingredient > 0 && `(${inventoryCounts.ingredient})`}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4 shrink-0">
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-[#d4a843] hover:bg-[#c29738] text-[#1a1a1a] px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#d4a843]/20 flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                                <Plus className="w-4 h-4" />
                                재고 추가
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : filteredInventory.length > 0 ? (
                            filteredInventory.map((item: InventoryItem) => (
                                <InventoryCard
                                    key={item.id}
                                    item={item}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onAddToShoppingList={handleAddToShoppingList}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-[#6b6761] glass-card flex flex-col items-center justify-center bg-[#2a2a2a]/20">
                                <span className="text-4xl mb-4 opacity-30">📦</span>
                                <p className="font-medium">이 카테고리에 등록된 재고가 없습니다.</p>
                                <p className="text-xs opacity-60 mt-2">새로운 재고를 추가해보세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Inventory Modal */}
            {(isAddModalOpen || editingItem) && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#1a1a1a] rounded-3xl border border-white/10 p-8 animate-fade-in-up relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#d4a843]/10 blur-[80px] rounded-full" />

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-xl font-bold gold-text">
                                {editingItem ? "재고 정보 수정" : "새로운 재고 추가"}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setEditingItem(null);
                                }}
                                className="p-1 rounded-full hover:bg-white/5 transition-colors"
                            >
                                <X className="w-6 h-6 text-[#6b6761]" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-5 relative z-10">
                            <div>
                                <label className="block text-[10px] text-[#a8a49d] uppercase tracking-wider mb-2 ml-1">이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 발렌타인 12년, 볼스 메론"
                                    className="w-full bg-[#2a2a2a]/50 border border-white/10 rounded-xl py-3 px-4 text-[#f0ede8] focus:outline-none focus:border-[#d4a843]/50 transition-all placeholder:text-[#6b6761]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-[#a8a49d] uppercase tracking-wider mb-2 ml-1">도수 (ABV %)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        disabled={formData.category.includes("과일") || formData.category.includes("주스") || formData.category.includes("시럽")}
                                        value={formData.abv}
                                        onChange={(e) => setFormData({ ...formData, abv: Number(e.target.value) })}
                                        className={`w-full bg-[#2a2a2a]/50 border border-white/10 rounded-xl py-3 px-4 text-[#f0ede8] focus:outline-none focus:border-[#d4a843]/50 transition-all ${(formData.category.includes("과일") || formData.category.includes("주스") || formData.category.includes("시럽")) ? "opacity-30" : ""}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-[#a8a49d] uppercase tracking-wider mb-2 ml-1">용량 (ml / 개)</label>
                                    <input
                                        type="number"
                                        value={formData.volume}
                                        onChange={(e) => setFormData({ ...formData, volume: Number(e.target.value) })}
                                        className="w-full bg-[#2a2a2a]/50 border border-white/10 rounded-xl py-3 px-4 text-[#f0ede8] focus:outline-none focus:border-[#d4a843]/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] text-[#a8a49d] uppercase tracking-wider mb-2 ml-1">카테고리</label>
                                <div className="relative">
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-[#2a2a2a]/50 border border-white/10 rounded-xl py-3 px-4 text-[#f0ede8] focus:outline-none focus:border-[#d4a843]/50 transition-all appearance-none pr-10"
                                    >
                                        <optgroup label="술 (Base 기주)" className="bg-[#1a1a1a] text-[#a8a49d]">
                                            {categoryOptions
                                                .filter(opt => CATEGORIES.base.includes(opt.value))
                                                .map(opt => (
                                                    <option key={opt.id} value={opt.value} className="text-[#f0ede8]">{opt.value}</option>
                                                ))}
                                        </optgroup>
                                        <optgroup label="리큐르 (Liqueur)" className="bg-[#1a1a1a] text-[#a8a49d]">
                                            {categoryOptions
                                                .filter(opt => CATEGORIES.liqueur.includes(opt.value))
                                                .map(opt => (
                                                    <option key={opt.id} value={opt.value} className="text-[#f0ede8]">{opt.value}</option>
                                                ))}
                                        </optgroup>
                                        <optgroup label="부재료 (Ingredient)" className="bg-[#1a1a1a] text-[#a8a49d]">
                                            {categoryOptions
                                                .filter(opt => CATEGORIES.ingredient.includes(opt.value) || (!CATEGORIES.base.includes(opt.value) && !CATEGORIES.liqueur.includes(opt.value) && !CATEGORIES.ingredient.includes(opt.value)))
                                                .map(opt => (
                                                    <option key={opt.id} value={opt.value} className="text-[#f0ede8]">{opt.value}</option>
                                                ))}
                                        </optgroup>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <ChevronDown className="w-4 h-4 text-[#6b6761]" />
                                    </div>
                                </div>

                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#d4a843] hover:bg-[#c29738] text-black py-4 rounded-2xl font-bold transition-all shadow-xl shadow-[#d4a843]/20 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        {editingItem ? "수정 완료" : "등록하기"}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
