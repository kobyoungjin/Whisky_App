"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { InventoryItem } from "@/types/baserow";
import TastingNotesSection from "@/components/tasting/TastingNotesSection";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem | null;
    uid: string;
    /** Fallback image URL when item has none (e.g. inline SVG generic bottle). */
    imageUrl: string | null;
}

function unitFor(category?: string) {
    if (!category) return "ML";
    if (category.includes("과일") || category.includes("기타") || category.includes("개")) return "EA";
    if (category.includes("가루")) return "MG";
    return "ML";
}

export default function WhiskyDetailModal({ isOpen, onClose, item, uid, imageUrl }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none";
        } else {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
        }
        return () => {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
        };
    }, [isOpen]);

    if (!isOpen || !item || !mounted) return null;

    const category = item.category?.value || "ETC";
    const unit = unitFor(category);

    return createPortal(
        <div
            className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full sm:max-w-[440px] h-full sm:h-[90vh] bg-background text-on-surface flex flex-col overflow-hidden sm:rounded-3xl border border-outline-variant/20 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Floating header */}
                <header className="absolute top-0 w-full z-20 flex justify-between items-center px-6 h-16 bg-gradient-to-b from-black/70 to-transparent">
                    <button
                        onClick={onClose}
                        aria-label="닫기"
                        className="active:scale-95 transition-transform duration-300 text-[#D4AF37] p-2 bg-black/30 backdrop-blur-lg rounded-full"
                    >
                        <span className="material-symbols-outlined block">arrow_back</span>
                    </button>
                    <div />
                </header>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                    {/* Hero — bottle image on dark gradient */}
                    <section className="relative h-[420px] w-full overflow-hidden bg-gradient-to-b from-[#1a1512] via-[#0f0d0b] to-background">
                        {/* Subtle vignette + light glow behind bottle */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(212,168,67,0.15),transparent_60%)]" />
                        <div className="absolute inset-0 flex items-center justify-center pt-6">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={item.name}
                                    className="h-72 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)]"
                                />
                            ) : (
                                <span className="material-symbols-outlined text-[120px] text-outline-variant/40">liquor</span>
                            )}
                        </div>

                        {/* Gradient fade to body */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />

                        {/* Category tag + Title over gradient */}
                        <div className="absolute bottom-0 left-0 w-full px-6 pb-4 space-y-2 z-10">
                            <div className="flex gap-2 mb-2">
                                <span className="bg-surface-variant/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold text-primary border border-primary/20">
                                    {category}
                                </span>
                            </div>
                            <h2 className="font-noto-serif text-4xl font-bold tracking-tight text-on-surface leading-tight">
                                {item.name}
                            </h2>
                        </div>
                    </section>

                    {/* Quick stats grid — Category / ABV / Volume */}
                    <section className="px-6 -mt-4 relative z-10 grid grid-cols-3 gap-3">
                        <StatCard icon="category" label="Category" value={category} />
                        <StatCard icon="percent" label="ABV" value={`${item.abv}%`} />
                        <StatCard icon="water_full" label="Volume" value={`${item.volume}${unit}`} />
                    </section>

                    {/* Tasting Notes */}
                    <section className="px-6 pt-8">
                        <h3 className="font-noto-serif text-xl mb-4 flex items-center gap-3">
                            <span className="h-px flex-1 bg-outline-variant/20" />
                            테이스팅 노트
                            <span className="h-px flex-1 bg-outline-variant/20" />
                        </h3>
                        <TastingNotesSection
                            uid={uid}
                            inventoryId={item.id}
                            inventoryName={item.name}
                        />
                    </section>
                </div>
            </div>
        </div>,
        document.body
    );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-xl backdrop-blur-md">
            <span className="material-symbols-outlined text-primary mb-1 text-lg">{icon}</span>
            <span className="text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">{label}</span>
            <span className="text-xs font-bold truncate w-full">{value}</span>
        </div>
    );
}
