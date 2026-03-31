"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import ScanModal from "./ScanModal";

export default function TopAppBar() {
    const pathname = usePathname();
    const router = useRouter();
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);

    const handleSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsLookingUp(true);
        try {
            const res = await fetch(`/api/ingredient-lookup?q=${encodeURIComponent(query.trim())}`);
            const data = await res.json();
            // 결과를 base64 인코딩해 URL 파라미터로 전달
            const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
            setSearchOpen(false);
            setSearchValue("");
            router.push(`/mypage?ingredientData=${encoded}`);
        } catch {
            // 조회 실패시 이름만 넘김
            setSearchOpen(false);
            setSearchValue("");
            router.push(`/mypage?addName=${encodeURIComponent(query.trim())}`);
        } finally {
            setIsLookingUp(false);
        }
    };

    useEffect(() => {
        const handleOpenScan = () => setIsScanOpen(true);
        window.addEventListener("open-scan-modal", handleOpenScan);
        return () => window.removeEventListener("open-scan-modal", handleOpenScan);
    }, []);

    useEffect(() => {
        if (searchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [searchOpen]);

    // 패널 외부 클릭 시 닫기
    useEffect(() => {
        if (!searchOpen) return;
        const handleClick = (e: MouseEvent) => {
            const panel = document.getElementById("search-drawer");
            const header = document.getElementById("top-app-bar");
            if (panel && !panel.contains(e.target as Node) && header && !header.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [searchOpen]);

    if (pathname === "/") return null;

    const quickSpirits = [
        // 주류
        { name: "GIN", category: "진" },
        { name: "VODKA", category: "보드카" },
        { name: "BOURBON", category: "버번 위스키" },
        { name: "CAMPARI", category: "리큐르" },
        { name: "RUM", category: "럼" },
        { name: "TEQUILA", category: "데킬라" },
        // 재료
        { name: "LIME JUICE", category: "주스" },
        { name: "SIMPLE SYRUP", category: "시럽" },
        { name: "TONIC WATER", category: "소다" },
        { name: "BITTERS", category: "비터" },
    ];

    return (
        <>
            <header
                id="top-app-bar"
                className="fixed top-0 left-0 right-0 max-w-[440px] mx-auto w-full flex items-center justify-between px-6 h-16 bg-[#131313]/90 backdrop-blur-xl z-[90] border-b border-[#4d4635]/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
            >
                <h1 className="text-xl sm:text-2xl font-bold tracking-tighter text-primary font-headline italic select-none">
                    Bar Coder
                </h1>
                
                {/* 우측 아이콘 그룹 */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => setIsScanOpen(true)}
                        className="transition-all duration-300 active:scale-95 flex items-center justify-center w-10 h-10 rounded-full text-primary hover:bg-primary/10 hover:text-primary-fixed-dim"
                        title="스캔하여 추가"
                        aria-label="스마트 스캐너 열기"
                    >
                        <ScanLine className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                    </button>

                    <button
                        onClick={() => setSearchOpen((prev) => !prev)}
                        className={`transition-all duration-300 active:scale-95 flex items-center justify-center w-10 h-10 rounded-full ${
                            searchOpen
                                ? "bg-primary/20 text-primary"
                                : "text-primary hover:bg-primary/10 hover:text-primary-fixed-dim"
                        }`}
                        title="재료 검색"
                        aria-label="재료 추가 패널 열기"
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                        >
                            {searchOpen ? "close" : "search"}
                        </span>
                    </button>
                </div>
            </header>

            {/* Search Drawer Panel */}
            <div
                id="search-drawer"
                className={`fixed top-16 left-0 right-0 max-w-[440px] mx-auto w-full z-[99] transition-all duration-300 ease-in-out ${
                    searchOpen
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-3 pointer-events-none"
                }`}
            >
                <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border-b border-[#4d4635]/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-5 pt-5 pb-6">
                    {/* 제목 */}
                    <p className="font-headline text-base text-on-surface-variant uppercase tracking-[0.15em] mb-4 opacity-60">
                        재료 추가
                    </p>

                    {/* 검색 입력창 */}
                    <div className="relative group mb-5">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined font-light pointer-events-none text-lg ${isLookingUp ? "text-primary animate-pulse" : "text-on-surface-variant"}`}>
                            {isLookingUp ? "hourglass_top" : "search"}
                        </span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && searchValue.trim() !== "" && !isLookingUp) {
                                    handleSearch(searchValue);
                                }
                            }}
                            disabled={isLookingUp}
                            placeholder={isLookingUp ? "재료 정보를 검색 중입니다..." : "술, 비터스, 가니쉬를 검색해보세요..."}
                            className={`w-full bg-surface-container border-b focus:border-primary py-3 pl-11 pr-4 transition-all duration-300 font-body outline-none text-on-surface text-sm box-border ${isLookingUp ? "opacity-60 cursor-wait border-primary/40 placeholder:text-primary/50" : "border-outline-variant/40 placeholder:text-on-surface-variant/40"}`}
                        />
                        {searchValue && !isLookingUp && (
                            <button
                                onClick={() => setSearchValue("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                            >
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        )}
                        {isLookingUp && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* 빠른 추가 버튼 */}
                    <div className="flex flex-wrap gap-2">
                        {quickSpirits.map((spirit) => (
                            <button
                                key={spirit.name}
                                onClick={() => {
                                    setSearchOpen(false);
                                    router.push(`/mypage?addCategory=${encodeURIComponent(spirit.category)}&addName=${encodeURIComponent(spirit.name)}`);
                                }}
                                className="bg-surface-variant/30 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/20 flex items-center gap-1.5 hover:bg-surface-variant/50 hover:border-primary/50 active:scale-95 transition-all duration-200 group"
                            >
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontVariationSettings: "'FILL' 1", fontSize: "16px" }}
                                >
                                    add
                                </span>
                                <span className="font-label text-xs tracking-wider uppercase text-on-surface-variant group-hover:text-primary transition-colors">
                                    {spirit.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <ScanModal isOpen={isScanOpen} onClose={() => setIsScanOpen(false)} />
        </>
    );
}
