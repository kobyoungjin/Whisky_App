"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Star, X } from "lucide-react";
import { TastingNote } from "@/types/baserow";
import { getTastingNotes, addTastingNote, updateTastingNote, deleteTastingNote } from "@/lib/baserow";

interface Props {
    uid: string;
    inventoryId: number;
    inventoryName: string;
}

// 5-star visual for a numeric rating (0..5 internal). Displays as percentage.
function StarRating({ value }: { value: number }) {
    const clamped = Math.max(0, Math.min(5, value));
    const percent = clamped * 20; // 0..5 -> 0..100
    return (
        <div className="inline-flex items-center gap-0.5">
            {[0, 1, 2, 3, 4].map(i => {
                const fill = Math.max(0, Math.min(1, clamped - i));
                return (
                    <span key={i} className="relative inline-block w-3.5 h-3.5">
                        <Star className="absolute inset-0 w-3.5 h-3.5 text-on-surface-variant/30" />
                        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                            <Star className="w-3.5 h-3.5 text-primary" style={{ fill: "currentColor" }} />
                        </span>
                    </span>
                );
            })}
            <span className="ml-1 text-[10px] text-on-surface-variant/70 tabular-nums">{percent.toFixed(0)}%</span>
        </div>
    );
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): Partial<TastingNote> => ({
    date: todayISO(),
    nose: "",
    palate: "",
    finish: "",
    rating: undefined,
    overall: "",
});

export default function TastingNotesSection({ uid, inventoryId, inventoryName }: Props) {
    const [notes, setNotes] = useState<TastingNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Editor state
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<Partial<TastingNote>>(emptyForm());
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await getTastingNotes(uid, inventoryId);
            setNotes(list);
        } catch (e) {
            console.error("Failed to load tasting notes:", e);
        } finally {
            setLoading(false);
        }
    }, [uid, inventoryId]);

    useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setEditingId(null);
        setForm(emptyForm());
        setEditorOpen(true);
    };
    const openEdit = (n: TastingNote) => {
        setEditingId(n.id);
        // Baserow stores 0..5; form uses 0..100 (%) for input UX.
        const stored = n.rating !== undefined && n.rating !== null && n.rating !== "" ? Number(n.rating) : undefined;
        setForm({
            date: n.date || todayISO(),
            nose: n.nose || "",
            palate: n.palate || "",
            finish: n.finish || "",
            rating: stored !== undefined ? stored * 20 : undefined,
            overall: n.overall || "",
        });
        setEditorOpen(true);
    };
    const closeEditor = () => {
        if (saving) return;
        setEditorOpen(false);
        setEditingId(null);
    };

    const save = async () => {
        if (saving) return;
        setSaving(true);
        try {
            // Form rating is a percentage (0..100); convert back to Baserow's 0..5 scale.
            const percent = form.rating !== undefined && form.rating !== null && form.rating !== ("" as any)
                ? Number(form.rating)
                : undefined;
            const ratingStored = percent !== undefined ? percent / 20 : undefined;
            const payload = {
                name: inventoryName,
                user_uid: uid,
                inventory_id: inventoryId,
                date: form.date || todayISO(),
                nose: form.nose || "",
                palate: form.palate || "",
                finish: form.finish || "",
                rating: ratingStored,
                overall: form.overall || "",
            };
            if (editingId) {
                await updateTastingNote(editingId, payload);
            } else {
                await addTastingNote(payload as any);
            }
            setEditorOpen(false);
            setEditingId(null);
            await load();
        } catch (e) {
            console.error("Save note failed:", e);
            alert("노트 저장에 실패했어요.");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: number) => {
        if (!confirm("이 노트를 삭제할까요?")) return;
        try {
            await deleteTastingNote(id);
            await load();
        } catch (e) {
            console.error("Delete note failed:", e);
            alert("삭제에 실패했어요.");
        }
    };

    return (
        <div className="mt-4 text-left">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[9px] uppercase tracking-[0.25em] text-on-surface-variant/60 font-black">Tasting Notes</span>
                <button
                    onClick={openNew}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-[9px] font-bold tracking-wider transition-all"
                >
                    <Plus className="w-3 h-3" />
                    새 노트
                </button>
            </div>

            <div className="max-h-[240px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
                {loading ? (
                    <div className="text-center text-[10px] text-on-surface-variant/50 py-4">불러오는 중…</div>
                ) : notes.length === 0 ? (
                    <div className="text-center text-[10px] text-on-surface-variant/40 py-4">
                        아직 노트가 없어요. 첫 테이스팅을 기록해보세요.
                    </div>
                ) : (
                    notes.map(n => {
                        const isOpen = expandedId === n.id;
                        const ratingNum = n.rating !== undefined && n.rating !== null && n.rating !== "" ? Number(n.rating) : undefined;
                        return (
                            <div key={n.id} className="rounded-xl bg-surface-container-low/40 border border-outline-variant/10 overflow-hidden">
                                <button
                                    onClick={() => setExpandedId(isOpen ? null : n.id)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-container-low"
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-on-surface tabular-nums">{n.date || "—"}</span>
                                        {ratingNum !== undefined && <StarRating value={ratingNum} />}
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); openEdit(n); }}
                                            className="p-1 rounded hover:bg-primary/10 text-on-surface-variant hover:text-primary"
                                            aria-label="Edit"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                                            className="p-1 rounded hover:bg-red-500/10 text-on-surface-variant hover:text-red-400"
                                            aria-label="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </button>
                                {isOpen && (
                                    <div className="px-3 pb-3 pt-1 flex flex-col gap-2 border-t border-outline-variant/10 text-[11px] leading-relaxed">
                                        {n.nose && <NoteField label="Nose" body={n.nose} />}
                                        {n.palate && <NoteField label="Palate" body={n.palate} />}
                                        {n.finish && <NoteField label="Finish" body={n.finish} />}
                                        {n.overall && <NoteField label="Overall" body={n.overall} />}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Editor Modal */}
            {editorOpen && (
                <div
                    className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
                    onClick={closeEditor}
                >
                    <div
                        className="w-full max-w-sm bg-[#131110] rounded-[2rem] border border-outline-variant/10 p-6 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 border-b border-primary/20 pb-3">
                            <h3 className="text-base font-headline font-bold text-primary">
                                {editingId ? "테이스팅 노트 수정" : "새 테이스팅 노트"}
                            </h3>
                            <button
                                onClick={closeEditor}
                                className="p-1.5 rounded-full bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container"
                            >
                                <X className="w-4 h-4 text-on-surface-variant" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                            <p className="text-[10px] text-on-surface-variant/60">{inventoryName}</p>

                            <EditorField label="Date">
                                <input
                                    type="date"
                                    value={form.date || ""}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary text-on-surface py-1 text-sm outline-none tabular-nums"
                                />
                            </EditorField>

                            <EditorField label="Rating (0 ~ 100%)">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-baseline">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={form.rating ?? ""}
                                            onChange={e => setForm({ ...form, rating: e.target.value === "" ? undefined : Number(e.target.value) })}
                                            className="w-20 bg-transparent border-b border-outline-variant/20 focus:border-primary text-on-surface py-1 text-sm outline-none tabular-nums"
                                        />
                                        <span className="ml-1 text-sm text-on-surface-variant/60">%</span>
                                    </div>
                                    <StarRating value={(Number(form.rating) || 0) / 20} />
                                </div>
                            </EditorField>

                            <EditorField label="Nose (향)">
                                <textarea
                                    rows={2}
                                    value={form.nose || ""}
                                    onChange={e => setForm({ ...form, nose: e.target.value })}
                                    placeholder="예: 바닐라, 캐러멜, 부드러운 오크"
                                    className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary text-on-surface py-1 text-sm outline-none resize-none"
                                />
                            </EditorField>

                            <EditorField label="Palate (맛)">
                                <textarea
                                    rows={2}
                                    value={form.palate || ""}
                                    onChange={e => setForm({ ...form, palate: e.target.value })}
                                    placeholder="예: 꿀, 몰트, 살짝 매콤"
                                    className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary text-on-surface py-1 text-sm outline-none resize-none"
                                />
                            </EditorField>

                            <EditorField label="Finish (여운)">
                                <textarea
                                    rows={2}
                                    value={form.finish || ""}
                                    onChange={e => setForm({ ...form, finish: e.target.value })}
                                    placeholder="예: 길고 따뜻하며 오크 여운"
                                    className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary text-on-surface py-1 text-sm outline-none resize-none"
                                />
                            </EditorField>

                            <EditorField label="Overall / 메모">
                                <textarea
                                    rows={3}
                                    value={form.overall || ""}
                                    onChange={e => setForm({ ...form, overall: e.target.value })}
                                    placeholder="전체적인 인상, 상황, 페어링 등 자유롭게"
                                    className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary text-on-surface py-1 text-sm outline-none resize-none"
                                />
                            </EditorField>
                        </div>

                        <button
                            onClick={save}
                            disabled={saving}
                            className="mt-4 w-full bg-primary hover:bg-primary/95 text-black py-3 rounded-xl font-black text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : editingId ? (
                                "수정 저장"
                            ) : (
                                "노트 등록"
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function NoteField({ label, body }: { label: string; body: string }) {
    return (
        <div>
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-primary/70 mb-0.5">{label}</span>
            <p className="text-on-surface-variant whitespace-pre-wrap">{body}</p>
        </div>
    );
}

function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[9px] uppercase tracking-[0.25em] text-primary font-black mb-1">{label}</label>
            {children}
        </div>
    );
}
