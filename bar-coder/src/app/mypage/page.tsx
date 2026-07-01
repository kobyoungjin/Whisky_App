"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import InventoryCard from "@/components/dashboard/InventoryCard";
import SkeletonCard from "@/components/ui/SkeletonCard";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import BottleVolumeSlider from "@/components/ui/BottleVolumeSlider";
import { getInventory, addInventoryItem, getInventoryFields, deleteInventoryItem, updateInventoryItem, uploadFile } from "@/lib/baserow";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { InventoryItem } from "@/types/baserow";
import { LogOut, Check, Trash2, Settings, X, Plus, Beaker, Wine, Droplets, ChevronDown, ExternalLink } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function MyPageContent() {
    const { user, logOut, loading: authLoading } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ id: number; value: string; color?: string }[]>([]);

    const [activeInventoryTab, setActiveInventoryTab] = useState<"base" | "liqueur" | "ingredient">("base");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
    const [isManageInventoryModalOpen, setIsManageInventoryModalOpen] = useState(false);
    const [selectedBottleInfo, setSelectedBottleInfo] = useState<InventoryItem | null>(null);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    
    // Profile Image Upload State
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Form State
    const [formData, setFormData] = useState<{
        name: string;
        abv: number;
        volume: number;
        category: string;
        image: { url: string; name?: string }[];
    }>({
        name: "",
        abv: 40,
        volume: 700,
        category: "위스키",
        image: [],
    });

    // 이미지 업로드 State
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");
    const [imageUrlInput, setImageUrlInput] = useState("");
    const imageFileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 카테고리 분류 상수 (Baserow Select Option Values와 일치해야 함)
    const CATEGORIES = {
        base: ["위스키", "버번", "진", "럼", "보드카", "데킬라", "테킬라", "브랜디", "꼬냑", "코냑", "와인", "소주", "전통주", "기타 증류주"],
        liqueur: ["리큐르", "베르무트", "비터"],
        ingredient: ["과일", "주스", "시럽", "소다", "음료", "기타", "가루"],
    };


    const categorize = (name: string = "", categoryValue: string = "") => {
        const n = name.toLowerCase();
        const c = categoryValue.toLowerCase();

        // 보강된 키워드 세트 (Baserow 실제 옵션 기반)
        const baseKeywords = [...CATEGORIES.base, "whisky", "whiskey", "blended", "single malt", "scotch", "bourbon", "스카치", "버번", "싱글몰트", "블렌디드", "발렌타인", "맥캘란", "glen", "글렌", "springbank", "스프링뱅크", "talisker", "탈리스커", "laphroaig", "라프로익", "cognac", "wine", "꼬냑", "와인", "헤네시", "hennessy", "산토리", "suntory", "야마자키", "yamazaki", "히비키", "hibiki", "러셀", "russell", "블랜튼", "blanton", "버팔로", "buffalo", "놉크릭", "knob creek", "엘라이자", "elijah", "믹터스", "michter", "메이커스", "makers", "와일드터키", "wild turkey", "우드포드", "woodford", "포로지스", "four roses"];

        const liqueurKeywords = [...CATEGORIES.liqueur, "liqueur", "bols", "de kuyper", "깔루아", "베일리", "말리부", "트리플", "섹", "디카이퍼", "캄파리", "campari", "코앵트로", "cointreau", "미도리", "midori", "피치트리", "peachtree", "아마레또", "amaretto"];

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

    // useSearchParams: 이미 /mypage에 있을 때도 URL 변경을 감지
    const searchParams = useSearchParams();

    // 외부 컴포넌트(TopAppBar 검색 모달) 등에서 URL 파라미터로 진입 시 Add 모달 자동 실행
    useEffect(() => {
        const ingredientDataEncoded = searchParams.get("ingredientData");
        const addName = searchParams.get("addName");
        const addCategory = searchParams.get("addCategory");

        if (ingredientDataEncoded) {
            try {
                const decoded = JSON.parse(decodeURIComponent(atob(ingredientDataEncoded)));
                setTimeout(() => {
                    setFormData(prev => ({
                        ...prev,
                        name: decoded.name || "",
                        category: decoded.category || prev.category,
                        abv: typeof decoded.abv === "number" ? decoded.abv : prev.abv,
                        volume: typeof decoded.volume === "number" ? decoded.volume : prev.volume,
                        image: [],
                    }));
                    setIsAddModalOpen(true);
                    window.history.replaceState(null, "", "/mypage");
                }, 50);
            } catch {
                window.history.replaceState(null, "", "/mypage");
            }
        } else if (addName || addCategory) {
            setTimeout(() => {
                setFormData(prev => ({
                    ...prev,
                    name: addName ? addName : "",
                    category: addCategory ? addCategory : prev.category,
                }));
                setIsAddModalOpen(true);
                window.history.replaceState(null, "", "/mypage");
            }, 50);
        }
    }, [searchParams]);

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
                category: activeInventoryTab === "base" ? "위스키" : activeInventoryTab === "liqueur" ? "리큐르" : "시럽",
                image: [],
            }));
        }
    }, [activeInventoryTab, editingItem, isAddModalOpen]);

    // 배경 제거 + trim + 400x600 캔버스 fit + Baserow 업로드 (파일 소스 무관)
    const processAndUploadImage = async (file: File) => {
        setIsUploadingImage(true);
        setUploadProgress("배경 제거 모델 로딩 중…");
        try {
            const { removeBackground } = await import("@imgly/background-removal");
            setUploadProgress("배경 제거 중…");
            const rawBlob = await removeBackground(file);
            setUploadProgress("크기 정규화 중…");
            const fittedBlob = await fitToShelfCanvas(rawBlob);
            setUploadProgress("Baserow 업로드 중…");
            const processedName = (file.name || "bottle").replace(/\.[^.]+$/, "") + "_shelf.png";
            const processedFile = new File([fittedBlob], processedName, { type: "image/png" });
            const uploaded = await uploadFile(processedFile);
            setFormData(prev => ({ ...prev, image: [{ url: uploaded.url, name: uploaded.name }] }));
        } catch (err) {
            console.error("Image processing/upload failed:", err);
            alert("이미지 처리 중 오류가 발생했습니다.");
        } finally {
            setIsUploadingImage(false);
            setUploadProgress("");
        }
    };

    // 파일 선택 → 처리
    const handleBottleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        try {
            await processAndUploadImage(file);
        } finally {
            if (imageFileInputRef.current) imageFileInputRef.current.value = "";
        }
    };

    // URL/data URL에서 가져오기 → 처리
    const handleImageFromUrl = async () => {
        // Trim edge whitespace. Do NOT strip internal whitespace — data: URLs can contain base64
        // that's fine, but we allow internal characters as-is. Newlines from paste are stripped.
        let url = imageUrlInput.replace(/[\r\n\t]+/g, "").trim();
        if (!url) return;

        const isDataUrl = url.startsWith("data:");

        // Only normalize http(s) URLs; leave data URLs untouched.
        if (!isDataUrl) {
            if (url.startsWith("//")) {
                url = `https:${url}`;
            } else if (!/^https?:\/\//i.test(url)) {
                url = `https://${url}`;
            }
            try {
                new URL(url);
            } catch (e: any) {
                alert(`URL 형식이 올바르지 않습니다.\n입력값: ${imageUrlInput.slice(0, 100)}${imageUrlInput.length > 100 ? "…" : ""}`);
                return;
            }
        }

        setIsUploadingImage(true);
        setUploadProgress("이미지 다운로드 중…");
        try {
            let blob: Blob;
            if (isDataUrl) {
                // data: URLs are handled entirely in-browser (no server round-trip needed)
                const dataRes = await fetch(url);
                blob = await dataRes.blob();
            } else {
                const proxyRes = await fetch(`/api/fetch-image?url=${encodeURIComponent(url)}`);
                if (!proxyRes.ok) {
                    const err = await proxyRes.json().catch(() => ({}));
                    console.error(`Image fetch failed. Attempted URL: ${url}`, err);
                    throw new Error(err.error || `download failed: ${proxyRes.status}`);
                }
                blob = await proxyRes.blob();
            }
            const ext = (blob.type.split("/")[1] || "png").split(";")[0];
            const filename = `remote_${Date.now()}.${ext}`;
            const file = new File([blob], filename, { type: blob.type });
            setImageUrlInput("");
            await processAndUploadImage(file);
        } catch (err: any) {
            console.error("URL image import failed:", err);
            alert(`이미지를 가져오지 못했습니다.\n${err.message || ""}`);
            setIsUploadingImage(false);
            setUploadProgress("");
        }
    };

    // [New] 과일, 주스, 시럽 카테고리 선택 시 도수 0으로 자동 변경
    useEffect(() => {
        const cat = formData.category.toLowerCase();
        if (cat.includes("과일") || cat.includes("주스") || cat.includes("쥬스") || cat.includes("시럽")) {
            setFormData(prev => ({ ...prev, abv: 0 }));
        }
    }, [formData.category]);

    // [New] 모든 모달 오픈 시 배경 스크롤 방지 (화면 고정)
    useEffect(() => {
        if (isAddModalOpen || editingItem || isAccountModalOpen || isPreferencesModalOpen || isVersionModalOpen) {
            document.body.style.overflow = "hidden";
            // iOS Safari bounce fix
            document.body.style.touchAction = "none";
        } else {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
        }
        return () => {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
        };
    }, [isAddModalOpen, editingItem, isAccountModalOpen, isPreferencesModalOpen, isVersionModalOpen]);

    const handleLogout = async () => {
        if (confirm("정말 로그아웃 하시겠습니까?")) {
            await logOut();
            router.push("/");
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setIsUpdatingProfile(true);
        try {
            let newPhotoURL = user.photoURL;

            // 이미지가 새로 선택된 경우 Firebase Storage에 업로드
            if (selectedImage) {
                const storageRef = ref(storage, `profiles/${user.uid}_${Date.now()}`);
                await uploadBytes(storageRef, selectedImage);
                newPhotoURL = await getDownloadURL(storageRef);
            }

            await updateProfile(user, { 
                displayName: newName.trim() || user.displayName,
                photoURL: newPhotoURL
            });

            alert("프로필이 성공적으로 업데이트되었습니다.");
            setIsAccountModalOpen(false);
            window.location.reload();
        } catch (error) {
            console.error("Profile update failed:", error);
            alert("프로필 업데이트 중 오류가 발생했습니다.");
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // --- Action Handlers ---
    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            abv: item.abv,
            volume: item.volume,
            category: item.category?.value || (activeInventoryTab === "base" ? "위스키" : activeInventoryTab === "liqueur" ? "리큐르" : "시럽"),
            image: Array.isArray(item.image) ? item.image.map(f => ({ url: f.url, name: f.name })) : [],
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
            // 만약 매칭되는 옵션이 없고 formData.category도 비어있다면 '기타'를 기본값으로 사용
            const categoryValue = matchedOption ? matchedOption.id : (formData.category || "기타");

            const abv = Number(formData.abv);
            const volume = Number(formData.volume);

            // 숫자 값 유효성 검사 (Baserow 400 방지)
            if (isNaN(abv) || isNaN(volume)) {
                throw new Error("도수 또는 용량 값이 유효하지 않습니다.");
            }

            // Baserow file field expects [{ name: "<uploaded-name>" }, ...]
            const imagePayload = formData.image.length > 0
                ? formData.image.filter(f => f.name).map(f => ({ name: f.name as string }))
                : [];

            const payload = {
                name: formData.name.trim(),
                abv: abv,
                volume: volume,
                category: categoryValue as any,
                image: imagePayload,
            };

            if (editingItem) {
                await updateInventoryItem(editingItem.id, payload as any);
                setEditingItem(null);
            } else {
                await addInventoryItem(user.uid, payload as any);
                setIsAddModalOpen(false);
            }

            setFormData({ ...formData, name: "", abv: 40, volume: 700, image: [] }); // Reset form
            await fetchData(); // Refresh list
        } catch (err: any) {
            console.error("Form submission failed:", err);
            alert("작업 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Drag-and-drop sensors: pointer + touch both supported.
    // Long-press (1s) required before drag starts, so single clicks/taps still open info modal.
    // NOTE: must run unconditionally before any early return (Rules of Hooks).
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 1000, tolerance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 1000, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
                <div className="spinner w-8 h-8 text-[#d4a843] border-2 rounded-full border-t-current border-transparent" />
            </div>
        );
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIdx = filteredInventory.findIndex(it => it.id === active.id);
        const newIdx = filteredInventory.findIndex(it => it.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return;

        const reordered = arrayMove(filteredInventory, oldIdx, newIdx);

        // Reuse existing Order values from the active tab, sorted ascending,
        // and reassign them to items in the new sequence.
        // Items elsewhere (other tabs) are untouched.
        const tabOrders = filteredInventory.map(it => it.Order ?? 0).sort((a, b) => a - b);
        const newOrderById = new Map<number, number>();
        reordered.forEach((item, i) => newOrderById.set(item.id, tabOrders[i]));

        // Optimistic local update
        const updatedInventory = inventory.map(it =>
            newOrderById.has(it.id) ? { ...it, Order: newOrderById.get(it.id) } : it
        ).sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0));
        setInventory(updatedInventory);

        // Persist only changed rows
        const changed: { id: number; Order: number }[] = [];
        filteredInventory.forEach(orig => {
            const newOrder = newOrderById.get(orig.id);
            if (newOrder !== undefined && newOrder !== orig.Order) {
                changed.push({ id: orig.id, Order: newOrder });
            }
        });
        try {
            await Promise.all(changed.map(c => updateInventoryItem(c.id, { Order: c.Order } as any)));
        } catch (err) {
            console.error("Failed to persist new order:", err);
            // Re-fetch to recover authoritative state
            fetchData();
        }
    };



    return (
        <>
        <div className="pt-[5.5rem] pb-20 px-4 sm:px-6 animate-fade-in-up w-full overflow-x-hidden box-border max-w-4xl mx-auto">
            {/* Setting & Profile Controls */}
            <div className="flex justify-end gap-2 mb-4">
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary transition-all duration-300 shadow-lg"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider font-headline">추가</span>
                </button>
                <button 
                    onClick={() => setIsSettingModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container border border-outline-variant/10 hover:border-primary/30 text-on-surface hover:text-primary transition-all duration-300 shadow-lg"
                >
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-wider font-headline">Setting</span>
                </button>
            </div>
 
            {/* User Profile Header */}
            <section className="flex flex-col items-center gap-3 mb-8">
                <div className="relative group">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-0.5 bg-gradient-to-tr from-primary via-primary/50 to-transparent shadow-[0_0_30px_rgba(255,198,62,0.1)]">
                        <div className="w-full h-full rounded-full overflow-hidden border-[3px] border-background bg-surface-container flex items-center justify-center">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName || "Profile"} className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 200, 'GRAD' 0, 'opsz' 24" }}>person</span>
                            )}
                        </div>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-black text-[8px] font-black px-2.5 py-0.5 rounded-full tracking-[0.2em] uppercase shadow-lg">
                        MEMBER
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-headline font-bold text-on-surface tracking-tight">{user.displayName || "Home Bartender"}</h2>
                    <p className="text-on-surface-variant/50 text-[10px] font-medium tracking-widest uppercase">{user.email}</p>
                </div>
            </section>
 
            {error && (
                <div className="mb-6">
                    <ErrorAlert message={error} onClose={() => setError(null)} />
                </div>
            )}
 
            {/* Bar Shelf Collection Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3.5 mb-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-headline font-black text-on-surface-variant/60 uppercase tracking-[0.2em]">
                            {activeInventoryTab === "base" ? "Base Cabinet" : activeInventoryTab === "liqueur" ? "Liqueur Rack" : "Pantry Ingredients"}
                        </span>
                    </div>
  
                    {/* Inventory Tabs (Pill Style) */}
                    <div className="flex gap-1.5 w-full overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveInventoryTab("base")}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shrink-0 ${activeInventoryTab === "base" ? "bg-primary/20 border border-primary/40 text-primary shadow-[0_0_15px_rgba(212,168,67,0.1)]" : "bg-surface-variant/10 border border-outline-variant/5 text-on-surface-variant hover:text-primary"}`}
                        >
                            <Beaker className="w-3.5 h-3.5" />
                            Base {inventoryCounts.base > 0 && `(${inventoryCounts.base})`}
                        </button>
                        <button
                            onClick={() => setActiveInventoryTab("liqueur")}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shrink-0 ${activeInventoryTab === "liqueur" ? "bg-primary/20 border border-primary/40 text-primary shadow-[0_0_15px_rgba(212,168,67,0.1)]" : "bg-surface-variant/10 border border-outline-variant/5 text-on-surface-variant hover:text-primary"}`}
                        >
                            <Wine className="w-3.5 h-3.5" />
                            Liqueur {inventoryCounts.liqueur > 0 && `(${inventoryCounts.liqueur})`}
                        </button>
                        <button
                            onClick={() => setActiveInventoryTab("ingredient")}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shrink-0 ${activeInventoryTab === "ingredient" ? "bg-primary/20 border border-primary/40 text-primary shadow-[0_0_15px_rgba(212,168,67,0.1)]" : "bg-surface-variant/10 border border-outline-variant/5 text-on-surface-variant hover:text-primary"}`}
                        >
                            <Droplets className="w-3.5 h-3.5" />
                            Others {inventoryCounts.ingredient > 0 && `(${inventoryCounts.ingredient})`}
                        </button>
                    </div>
                </div>
 
                {/* Shelves Layout */}
                <div className="bg-[#151312]/40 border border-outline-variant/5 p-4 py-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden min-h-[400px]">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
                    
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : filteredInventory.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={filteredInventory.map(it => it.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-4 gap-x-2 gap-y-3 mt-2">
                                    {filteredInventory.flatMap((item, idx) => {
                                        const nodes: React.ReactNode[] = [
                                            <SortableBottle
                                                key={item.id}
                                                item={item}
                                                onOpenInfo={() => setSelectedBottleInfo(item)}
                                            />
                                        ];
                                        // After every 4th item, append a shelf line spanning the full row.
                                        if ((idx + 1) % 4 === 0 || idx === filteredInventory.length - 1) {
                                            nodes.push(
                                                <div key={`shelf-${idx}`} className="col-span-4 relative">
                                                    <div className="w-full h-4 bg-gradient-to-b from-[#8c6239] via-[#6d4827] to-[#4d3016] border-t border-[#a67c52] border-b border-[#2d1c0d] rounded-sm shadow-[0_8px_16px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)]" />
                                                    <div className="w-full h-8 bg-gradient-to-b from-black/50 to-transparent -mt-0.5 pointer-events-none" />
                                                </div>
                                            );
                                        }
                                        return nodes;
                                    })}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="py-24 text-center text-[#6b6761] flex flex-col items-center justify-center">
                            <span className="text-5xl mb-4 opacity-25">🍾</span>
                            <p className="font-headline font-bold text-base text-on-surface-variant/70">진열장이 비어 있습니다</p>
                            <p className="text-xs opacity-50 mt-2 max-w-[200px] leading-relaxed">우상단 Setting &rarr; Manage Inventory 메뉴에서 술을 추가해 술장을 채워보세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
 
        {/* Settings Master Modal */}
        {isSettingModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setIsSettingModalOpen(false)}>
                <div className="w-full max-w-sm bg-[#131110] rounded-[2rem] border border-outline-variant/10 p-6 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-6 border-b border-primary/20 pb-4">
                        <h3 className="text-xl font-headline font-bold text-primary tracking-tight">Bar Settings</h3>
                        <button onClick={() => setIsSettingModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 border border-outline-variant/10 bg-surface-container-low"><X className="w-4 h-4 text-on-surface-variant" /></button>
                    </div>
                    
                    <div className="divide-y divide-outline-variant/5 flex flex-col">
                        <button onClick={() => { setIsSettingModalOpen(false); setIsManageInventoryModalOpen(true); }} className="w-full flex items-center justify-between py-4 hover:bg-surface-container/20 px-2 rounded-xl transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Plus className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">Manage Inventory</span>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
                        </button>
                        
                        <button onClick={() => { setIsSettingModalOpen(false); setNewName(user?.displayName || ""); setIsAccountModalOpen(true); }} className="w-full flex items-center justify-between py-4 hover:bg-surface-container/20 px-2 rounded-xl transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24" }}>manage_accounts</span>
                                </div>
                                <span className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">Account Settings</span>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
                        </button>
                        
                        <button onClick={() => { setIsSettingModalOpen(false); setIsPreferencesModalOpen(true); }} className="w-full flex items-center justify-between py-4 hover:bg-surface-container/20 px-2 rounded-xl transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24" }}>tune</span>
                                </div>
                                <span className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">Preferences</span>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
                        </button>
                        
                        <button onClick={() => { setIsSettingModalOpen(false); setIsVersionModalOpen(true); }} className="w-full flex items-center justify-between py-4 hover:bg-surface-container/20 px-2 rounded-xl transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24" }}>info</span>
                                </div>
                                <span className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">App Info</span>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
                        </button>
                        
                        <button onClick={() => { setIsSettingModalOpen(false); handleLogout(); }} className="w-full flex items-center justify-between py-4 hover:bg-red-500/[0.03] px-2 rounded-xl transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-xl bg-red-500/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                                    <span className="material-symbols-outlined text-red-400 text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24" }}>logout</span>
                                </div>
                                <span className="font-headline font-bold text-sm text-red-400">Logout</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Manage Inventory Modal */}
        {isManageInventoryModalOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setIsManageInventoryModalOpen(false)}>
                <div className="w-full max-w-2xl bg-[#131110] rounded-[2.5rem] border border-outline-variant/10 p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-6 border-b border-primary/20 pb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-headline font-bold text-primary tracking-tight">Manage Inventory</h3>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-black px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all flex items-center gap-1 shadow-lg shadow-primary/10"
                            >
                                <Plus className="w-2.5 h-2.5 stroke-[4]" />
                                Add New
                            </button>
                        </div>
                        <button onClick={() => setIsManageInventoryModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 border border-outline-variant/10 bg-surface-container-low"><X className="w-4 h-4 text-on-surface-variant" /></button>
                    </div>

                    {/* Inventory Management Tabs inside Modal */}
                    <div className="flex gap-1.5 w-full overflow-x-auto no-scrollbar mb-4 shrink-0">
                        <button
                            onClick={() => setActiveInventoryTab("base")}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shrink-0 ${activeInventoryTab === "base" ? "bg-primary/20 border border-primary/40 text-primary" : "bg-surface-variant/10 border border-outline-variant/5 text-on-surface-variant"}`}
                        >
                            <Beaker className="w-3 h-3" />
                            Base ({inventoryCounts.base})
                        </button>
                        <button
                            onClick={() => setActiveInventoryTab("liqueur")}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shrink-0 ${activeInventoryTab === "liqueur" ? "bg-primary/20 border border-primary/40 text-primary" : "bg-surface-variant/10 border border-outline-variant/5 text-on-surface-variant"}`}
                        >
                            <Wine className="w-3 h-3" />
                            Liqueur ({inventoryCounts.liqueur})
                        </button>
                        <button
                            onClick={() => setActiveInventoryTab("ingredient")}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shrink-0 ${activeInventoryTab === "ingredient" ? "bg-primary/20 border border-primary/40 text-primary" : "bg-surface-variant/10 border border-outline-variant/5 text-on-surface-variant"}`}
                        >
                            <Droplets className="w-3 h-3" />
                            Others ({inventoryCounts.ingredient})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-1.5 min-h-0 pb-4">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                        ) : filteredInventory.length > 0 ? (
                            filteredInventory.map((item: InventoryItem) => (
                                <InventoryCard
                                    key={item.id}
                                    item={item}
                                    onEdit={(itm) => {
                                        handleEdit(itm);
                                    }}
                                    onDelete={handleDelete}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-[#6b6761] glass-card flex flex-col items-center justify-center bg-[#2a2a2a]/20">
                                <span className="text-4xl mb-4 opacity-30">📦</span>
                                <p className="font-medium text-sm">등록된 재고가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Bottle Detail Info Modal */}
        {selectedBottleInfo && (
            <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedBottleInfo(null)}>
                <div className="w-full max-w-xs bg-[#131110] rounded-[2rem] border border-outline-variant/15 p-6 shadow-2xl relative overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />
                    
                    <div className="flex justify-center mb-4">
                        {getBottleImage(selectedBottleInfo) === "generic" ? (
                            <GenericBottle category={selectedBottleInfo.category?.value || ""} name={selectedBottleInfo.name} abv={selectedBottleInfo.abv} />
                        ) : (
                            <BottleImage
                                src={getBottleImage(selectedBottleInfo)}
                                item={selectedBottleInfo}
                                className="h-32 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
                            />
                        )}
                    </div>

                    <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-black mb-1 block">
                        {selectedBottleInfo.category?.value || "ETC"}
                    </span>
                    <h4 className="text-base font-headline font-bold text-on-surface mb-3 leading-snug">
                        {selectedBottleInfo.name}
                    </h4>
                    
                    <div className="flex justify-center gap-3 mb-6">
                        <div className="px-3 py-1 rounded-xl bg-surface-variant/20 border border-outline-variant/10 text-xs font-bold text-on-surface-variant">
                            ABV {selectedBottleInfo.abv}%
                        </div>
                        <div className="px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                            Volume {selectedBottleInfo.volume}ML
                        </div>
                    </div>

                    <button 
                        onClick={() => setSelectedBottleInfo(null)}
                        className="w-full bg-surface-variant/20 hover:bg-surface-variant/40 text-on-surface py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        )}

        {/* Add/Edit Inventory Modal (Placed outside transformed container to fix viewport positioning) */}
        {(isAddModalOpen || editingItem) && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-2xl animate-fade-in" onClick={() => { setIsAddModalOpen(false); setEditingItem(null); setFormData({ name: "", abv: 40, volume: 700, category: "위스키", image: [] }); }}>
                <div className="w-full max-w-sm bg-[#131110] rounded-[2.5rem] border border-outline-variant/10 p-5 sm:p-6 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
                    <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-6 relative z-10 border-b border-primary/20 pb-4">
                        <h3 className="text-2xl font-headline italic font-bold text-primary tracking-tighter">
                            {editingItem ? "Refine Spirit" : "Curate Selection"}
                        </h3>
                        <button
                            onClick={() => { setIsAddModalOpen(false); setEditingItem(null); setFormData({ name: "", abv: 40, volume: 700, category: "위스키", image: [] }); }}
                            className="p-2 rounded-full hover:bg-white/5 transition-colors border border-outline-variant/10 bg-surface-container-low"
                        >
                            <X className="w-4 h-4 text-on-surface-variant" />
                        </button>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10 max-h-[85vh] overflow-y-auto custom-scrollbar pr-1">
                        {/* 1. 카테고리 (Category) */}
                        <div className="bg-surface-container-low/30 backdrop-blur-sm p-4 rounded-3xl border border-outline-variant/10 leading-none">
                            <label className="block text-[9px] text-primary uppercase tracking-[0.3em] font-black px-1 mb-2.5">Category</label>
                            <div className="relative group">
                                <select
                                    value={formData.category}
                                    onChange={(e) => {
                                        const newCat = e.target.value;
                                        const zeroAbvCategories = ["과일", "주스", "시럽", "가루", "기타"];
                                        const isZeroAbv = zeroAbvCategories.some(c => newCat.includes(c));
                                        setFormData({ ...formData, category: newCat, abv: isZeroAbv ? 0 : formData.abv });
                                    }}
                                    className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-on-surface py-2 px-1 transition-all outline-none appearance-none cursor-pointer text-sm font-medium"
                                >
                                    <optgroup label="Spirits" className="bg-[#1a1a1a] text-on-surface">
                                        {categoryOptions
                                            .filter(opt => CATEGORIES.base.includes(opt.value))
                                            .map(opt => (
                                                <option key={opt.id} value={opt.value}>{opt.value}</option>
                                            ))}
                                    </optgroup>
                                    <optgroup label="Liqueur" className="bg-[#1a1a1a] text-on-surface">
                                        {categoryOptions
                                            .filter(opt => CATEGORIES.liqueur.includes(opt.value))
                                            .map(opt => (
                                                <option key={opt.id} value={opt.value}>{opt.value}</option>
                                            ))}
                                    </optgroup>
                                    <optgroup label="Ingredients" className="bg-[#1a1a1a] text-on-surface">
                                        {categoryOptions
                                            .filter(opt => CATEGORIES.ingredient.includes(opt.value) || (!CATEGORIES.base.includes(opt.value) && !CATEGORIES.liqueur.includes(opt.value) && !CATEGORIES.ingredient.includes(opt.value)))
                                            .map(opt => (
                                                <option key={opt.id} value={opt.value}>{opt.value}</option>
                                            ))}
                                    </optgroup>
                                </select>
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40 group-hover:text-primary transition-colors">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* 2. 아이템 이름 (Item Name) */}
                        <div className="bg-surface-container-low/30 backdrop-blur-sm p-4 rounded-3xl border border-outline-variant/10 leading-none">
                            <label className="block text-[9px] text-primary uppercase tracking-[0.3em] font-black px-1 mb-2.5">Item Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Ballantine's 12y, Hendricks Gin"
                                className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-on-surface py-2 px-1 transition-all duration-300 placeholder:text-on-surface-variant/30 outline-none text-sm font-medium"
                            />
                        </div>

                        {/* 3. 병 이미지 (Bottle Image) */}
                        <div className="bg-surface-container-low/30 backdrop-blur-sm p-4 rounded-3xl border border-outline-variant/10 leading-none space-y-3">
                            <label className="block text-[9px] text-primary uppercase tracking-[0.3em] font-black px-1 mb-2.5">Bottle Image</label>

                            {/* 이미지 프리뷰 (배경 제거된 PNG) */}
                            {formData.image[0]?.url && (
                                <div className="relative flex justify-center mb-2">
                                    <div
                                        className="h-24 w-24 rounded-xl"
                                        style={{
                                            backgroundImage: "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
                                            backgroundSize: "12px 12px",
                                            backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                                            backgroundColor: "#1a1a1a"
                                        }}
                                    >
                                        <img src={formData.image[0].url} alt="bottle preview" className="h-full w-full object-contain drop-shadow-lg" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, image: [] }))}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* 업로드 버튼 — 배경 자동 제거 */}
                            <button
                                type="button"
                                onClick={() => imageFileInputRef.current?.click()}
                                disabled={isUploadingImage}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-[11px] font-bold tracking-wide transition-all disabled:opacity-50"
                            >
                                {isUploadingImage ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span>{uploadProgress || "처리 중…"}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📁</span>
                                        <span>이미지 업로드 (배경 자동 제거)</span>
                                    </>
                                )}
                            </button>
                            <input
                                ref={imageFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleBottleImageUpload}
                            />

                            {/* URL로 가져오기 */}
                            <div className="flex items-center gap-1.5 text-[9px] text-on-surface-variant/40 uppercase tracking-widest px-1 pt-1">
                                <span className="flex-1 h-px bg-outline-variant/10" />
                                <span>또는 URL / data:image</span>
                                <span className="flex-1 h-px bg-outline-variant/10" />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={imageUrlInput}
                                    onChange={(e) => setImageUrlInput(e.target.value)}
                                    placeholder="https://... 또는 data:image/…;base64,…"
                                    disabled={isUploadingImage}
                                    className="flex-1 min-w-0 bg-transparent border border-outline-variant/20 focus:border-primary/50 rounded-xl px-3 py-2 text-[11px] text-on-surface placeholder:text-on-surface-variant/30 outline-none transition-all disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={handleImageFromUrl}
                                    disabled={isUploadingImage || !imageUrlInput.trim()}
                                    className="shrink-0 px-3 py-2 rounded-xl bg-surface-variant/20 border border-outline-variant/20 hover:bg-surface-variant/40 text-on-surface-variant text-[10px] font-bold tracking-wide transition-all disabled:opacity-40"
                                >
                                    가져오기
                                </button>
                            </div>

                            <p className="text-[9px] text-on-surface-variant/40 px-1 leading-relaxed">
                                업로드한 사진에서 병 모양만 자동으로 잘라내 투명 PNG로 저장합니다. 첫 사용 시 모델 다운로드(~50MB)가 발생하며 이후엔 캐시됩니다.
                            </p>
                        </div>

                        {/* 병 모양의 인터랙티브 보틀 슬라이더 (좌우 정보 통합) */}
                        <div className="bg-surface-container-low/20 backdrop-blur-sm p-2 py-4 sm:p-4 sm:pt-6 rounded-[2.5rem] border border-outline-variant/10 shadow-inner mt-2 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                            {(() => {
                                const catUnit = getCategoryUnit(formData.category);
                                return (
                                    <BottleVolumeSlider
                                        value={formData.volume}
                                        onChange={(val) => setFormData({ ...formData, volume: val })}
                                        abvValue={formData.abv}
                                        onAbvChange={(val) => setFormData({ ...formData, abv: val })}
                                        maxVolume={catUnit.max}
                                        step={catUnit.step}
                                        unit={catUnit.label}
                                        abvReadOnly={["과일","주스","시럽","가루","소다","기타"].some(c => formData.category.includes(c))}
                                    />
                                );
                            })()}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary hover:bg-primary/95 hover:scale-[1.02] text-[#1a1a1a] py-4 rounded-[1.5rem] font-label font-black tracking-[0.2em] uppercase transition-all shadow-xl shadow-primary/20 mt-8 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 active:scale-[0.98] border border-primary-fixed"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-[3px] border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5 stroke-[3]" />
                                    {editingItem ? "Refine Curated Item" : "Register Item"}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Version Info Modal */}
        {isVersionModalOpen && (
            <div
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
                onClick={() => setIsVersionModalOpen(false)}
            >
                <div
                    className="w-full max-w-sm bg-surface-container-low rounded-[2rem] border border-outline-variant/10 p-8 shadow-2xl relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full" />
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Settings className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-headline font-bold text-on-surface tracking-tight">App Info</h3>
                        </div>
                        <button
                            onClick={() => setIsVersionModalOpen(false)}
                            className="p-2 rounded-full hover:bg-on-surface-variant/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-on-surface-variant" />
                        </button>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <div className="flex items-center justify-between py-4 border-b border-outline-variant/5">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/50">App Name</span>
                            <span className="text-sm font-headline font-bold text-on-surface">Bar Coder</span>
                        </div>
                        <div className="flex items-center justify-between py-4 border-b border-outline-variant/5">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/50">Version</span>
                            <span className="text-sm font-bold text-primary">1.1.0_PRO</span>
                        </div>
                        <div className="flex items-center justify-between py-4 border-b border-outline-variant/5">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/50">Core Engine</span>
                            <span className="text-sm font-headline font-bold text-on-surface">Gemini 2.5 Pro</span>
                        </div>
                        <div className="flex items-center justify-between py-4">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/50">Author</span>
                            <span className="text-sm font-headline font-bold text-on-surface">Home Bartender</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Account Settings Modal */}
        {isAccountModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsAccountModalOpen(false)}>
                <div className="w-full max-w-sm bg-surface-container rounded-3xl border border-outline-variant/10 p-8 animate-fade-in-up relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-headline font-bold text-on-surface">Account Settings</h3>
                        <button onClick={() => setIsAccountModalOpen(false)} className="p-1 rounded-full hover:bg-white/5"><X className="w-5 h-5 text-on-surface-variant" /></button>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        {/* Profile Image Edit */}
                        <div className="flex flex-col items-center gap-3">
                            <div 
                                className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                                    {(imagePreview || user?.photoURL) ? (
                                        <img src={imagePreview || user?.photoURL || ""} alt="Profile Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>photo_camera</span>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleImageSelect} 
                                />
                            </div>
                            <span className="text-[10px] text-on-surface-variant/70 uppercase tracking-widest">Tap to change</span>
                        </div>

                        <div>
                            <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 ml-1 font-bold">Display Name</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-background border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:border-primary/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 ml-1 font-bold">Linked Email</label>
                            <div className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-on-surface-variant/70 cursor-not-allowed text-sm">
                                {user?.email}
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isUpdatingProfile || (!selectedImage && newName === user?.displayName)} 
                            className="w-full bg-primary hover:bg-primary-fixed text-black py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isUpdatingProfile ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Preferences Modal */}
        {isPreferencesModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsPreferencesModalOpen(false)}>
                <div className="w-full max-w-sm bg-surface-container rounded-t-3xl sm:rounded-3xl border-t sm:border border-outline-variant/10 p-6 sm:p-8 animate-fade-in-up relative overflow-hidden pb-12 sm:pb-8" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-headline font-bold text-on-surface">Preferences</h3>
                        <button onClick={() => setIsPreferencesModalOpen(false)} className="p-1 rounded-full hover:bg-white/5"><X className="w-5 h-5 text-on-surface-variant" /></button>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-on-surface">Dark Mode</p>
                                <p className="text-[10px] text-on-surface-variant">Midnight Mixologist Theme</p>
                            </div>
                            <div className="w-10 h-6 bg-primary rounded-full relative opacity-50 cursor-not-allowed">
                                <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-black"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-on-surface">Push Notifications</p>
                                <p className="text-[10px] text-on-surface-variant">Receive daily cocktail recipes</p>
                            </div>
                            <div className="w-10 h-6 bg-surface border border-outline-variant/30 rounded-full relative cursor-pointer" onClick={() => alert("현재 기기에서는 푸시 알림을 지원하지 않습니다.")}>
                                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-on-surface-variant"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

const getBottleImage = (item: InventoryItem) => {
    if (Array.isArray(item.image) && item.image[0]?.url) return item.image[0].url;
    return "generic";
};

// 카테고리 → 표시 단위/최대값/step 매핑.
// 과일·기타는 낱개(EA), 가루는 밀리그램, 나머지는 밀리리터.
function getCategoryUnit(category: string): { label: string; max: number; step: number } {
    const c = (category || "").toLowerCase();
    if (c.includes("과일") || c.includes("기타") || c.includes("개")) {
        return { label: "EA", max: 100, step: 1 };
    }
    if (c.includes("가루")) {
        return { label: "MG", max: 1000, step: 10 };
    }
    return { label: "ml", max: 1000, step: 10 };
}

// Trim transparent edges then fit content into a 400x600 canvas with 12px padding.
// Matches the batch script (scripts/rebg-resize-inventory.mjs) so newly uploaded
// bottles line up on the shelf at the same size as items processed in bulk.
async function fitToShelfCanvas(bgRemovedBlob: Blob): Promise<Blob> {
    const CANVAS_W = 400;
    const CANVAS_H = 600;
    const PADDING = 12;
    const ALPHA_THRESHOLD = 10;

    const bitmap = await createImageBitmap(bgRemovedBlob);
    const off = document.createElement("canvas");
    off.width = bitmap.width;
    off.height = bitmap.height;
    const offCtx = off.getContext("2d");
    if (!offCtx) throw new Error("failed to get 2D context");
    offCtx.drawImage(bitmap, 0, 0);
    const { data } = offCtx.getImageData(0, 0, bitmap.width, bitmap.height);

    let minX = bitmap.width, minY = bitmap.height, maxX = -1, maxY = -1;
    for (let y = 0; y < bitmap.height; y++) {
        for (let x = 0; x < bitmap.width; x++) {
            const alpha = data[(y * bitmap.width + x) * 4 + 3];
            if (alpha > ALPHA_THRESHOLD) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < minX || maxY < minY) throw new Error("배경 제거 결과가 비어 있습니다");

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const targetW = CANVAS_W - PADDING * 2;
    const targetH = CANVAS_H - PADDING * 2;
    const scale = Math.min(targetW / cropW, targetH / cropH);
    const newW = Math.max(1, Math.round(cropW * scale));
    const newH = Math.max(1, Math.round(cropH * scale));

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = CANVAS_W;
    finalCanvas.height = CANVAS_H;
    const ctx = finalCanvas.getContext("2d");
    if (!ctx) throw new Error("failed to get final 2D context");
    ctx.imageSmoothingQuality = "high";
    const dx = Math.round((CANVAS_W - newW) / 2);
    const dy = Math.round((CANVAS_H - newH) / 2);
    ctx.drawImage(bitmap, minX, minY, cropW, cropH, dx, dy, newW, newH);

    return new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob(b => b ? resolve(b) : reject(new Error("canvas.toBlob returned null")), "image/png");
    });
}


// Sortable wrapper for one bottle on the shelf — uses @dnd-kit's useSortable.
const SortableBottle: React.FC<{
    item: InventoryItem;
    onOpenInfo: () => void;
}> = ({ item, onOpenInfo }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 20 : undefined,
        touchAction: "none",
    };
    const bottleImg = getBottleImage(item);
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                // Only treat as click when not at the end of a drag gesture.
                if (!isDragging) onOpenInfo();
            }}
            className="relative group cursor-grab active:cursor-grabbing flex flex-col items-center justify-end min-h-[120px] select-none"
        >
            {bottleImg === "generic" ? (
                <div className="transition-transform duration-200 group-hover:-translate-y-1">
                    <GenericBottle category={item.category?.value || ""} name={item.name} abv={item.abv} />
                </div>
            ) : (
                <BottleImage
                    src={bottleImg}
                    item={item}
                    className="h-28 sm:h-32 object-contain transition-transform duration-200 group-hover:-translate-y-1 drop-shadow-[0_10px_12px_rgba(0,0,0,0.6)] pointer-events-none"
                />
            )}
            <div className="absolute -top-10 bg-black/90 border border-primary/20 text-white text-[9px] px-2 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 shadow-lg">
                {item.name} ({item.abv}%)
            </div>
            <span className="text-[9px] text-on-surface-variant/70 font-black truncate max-w-[65px] sm:max-w-[80px] text-center mt-2.5 block select-none uppercase tracking-tighter">
                {item.name}
            </span>
        </div>
    );
};

// 매핑되지 않은 술을 위한 커스텀 스타일 SVG 술병 컴포넌트
const BottleImage: React.FC<{
    src: string;
    item: InventoryItem;
    className?: string;
}> = ({ src, item, className }) => {
    const [errored, setErrored] = useState(false);
    if (errored) {
        return <GenericBottle category={item.category?.value || ""} name={item.name} abv={item.abv} />;
    }
    return (
        <img
            src={src}
            alt={item.name}
            className={className}
            onError={() => setErrored(true)}
        />
    );
};

const GenericBottle: React.FC<{ category: string; name: string; abv: number }> = ({ category, name, abv }) => {
    let color = "#855829"; // 위스키
    let shape = "rect";
    let width = "42px";
    let neckColor = "#4a3219";

    const cat = category.toLowerCase();
    if (cat.includes("리큐르") || cat.includes("liqueur") || cat.includes("베르무트") || cat.includes("비터")) {
        color = "#2e6f40"; // 그린
        neckColor = "#1a4626";
    } else if (cat.includes("진") || cat.includes("보드카") || cat.includes("럼") || cat.includes("vodka") || cat.includes("gin") || cat.includes("rum")) {
        color = "#4ba3c3"; // 투명/블루
        neckColor = "#2d6f88";
    } else if (cat.includes("과일") || cat.includes("주스") || cat.includes("시럽") || cat.includes("음료")) {
        color = "#d9534f"; // 레드
        neckColor = "#a94442";
    }

    return (
        <div className="relative flex flex-col items-center justify-end" style={{ height: "115px", width: "55px" }}>
            <div 
                className="w-2.5 rounded-t-sm transition-all duration-300" 
                style={{ 
                    height: "22px", 
                    backgroundColor: neckColor,
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderBottom: "none"
                }} 
            />
            <div 
                className="relative rounded-t-md transition-all duration-300 shadow-lg flex flex-col items-center justify-center overflow-hidden"
                style={{ 
                    height: "78px", 
                    width: width, 
                    backgroundColor: color,
                    border: "1px solid rgba(255,255,255,0.2)",
                    boxShadow: "inset 3px 0px 6px rgba(255,255,255,0.2), inset -3px 0px 6px rgba(0,0,0,0.35), 0 6px 10px rgba(0,0,0,0.5)"
                }}
            >
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-black/15 rounded-b-md" 
                    style={{ height: "85%" }} 
                />
                <div className="absolute top-0 left-0.5 w-1 h-full bg-white/15 blur-[0.5px] rounded-l-md pointer-events-none" />
                
                <div className="w-[85%] bg-amber-50/85 text-[5.5px] text-stone-900 py-1 px-0.5 rounded border border-amber-900/10 font-sans font-bold flex flex-col items-center justify-center leading-none text-center shadow-sm select-none z-10">
                    <span className="truncate w-full max-w-[28px] uppercase tracking-tighter">{name}</span>
                    <span className="text-[5px] opacity-70 mt-0.5">{abv}%</span>
                </div>
            </div>
        </div>
    );
};

export default function MyPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
                <div className="spinner w-8 h-8 text-[#d4a843] border-2 rounded-full border-t-current border-transparent" />
            </div>
        }>
            <MyPageContent />
        </Suspense>
    );
}
