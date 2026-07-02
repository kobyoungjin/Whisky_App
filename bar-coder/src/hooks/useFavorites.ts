"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-user cocktail favorites, persisted to localStorage.
 * Stored as JSON array of recipe ids under key `bar_coder_favorites_<uid>`.
 * Falls back to an in-memory set until `uid` is available.
 */
export function useFavorites(uid: string | undefined | null) {
    const [favorites, setFavorites] = useState<Set<number>>(new Set());
    const [hydrated, setHydrated] = useState(false);

    const storageKey = uid ? `bar_coder_favorites_${uid}` : null;

    // Load once per uid change.
    useEffect(() => {
        if (!storageKey) {
            setFavorites(new Set());
            setHydrated(true);
            return;
        }
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    setFavorites(new Set(arr.filter((v): v is number => typeof v === "number")));
                }
            } else {
                setFavorites(new Set());
            }
        } catch {
            setFavorites(new Set());
        } finally {
            setHydrated(true);
        }
    }, [storageKey]);

    const persist = useCallback((next: Set<number>) => {
        if (!storageKey || typeof window === "undefined") return;
        try {
            localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch (e) {
            console.warn("Favorites persist failed:", (e as Error).message);
        }
    }, [storageKey]);

    const toggle = useCallback((id: number) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            persist(next);
            return next;
        });
    }, [persist]);

    const isFavorite = useCallback((id: number) => favorites.has(id), [favorites]);

    return { favorites, isFavorite, toggle, hydrated };
}
