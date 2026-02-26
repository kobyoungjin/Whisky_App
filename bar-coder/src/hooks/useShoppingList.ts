"use client";

import { useState, useEffect } from "react";

const SHOPPING_LIST_KEY = "bar_coder_shopping_list";

export function useShoppingList() {
    const [items, setItems] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // 초기 로드 (마운트 시 한 번)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SHOPPING_LIST_KEY);
            if (stored) {
                setItems(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Failed to parse shopping list from local storage", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // 상태 변경 시 LocalStorage 동기화
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
        }
    }, [items, isLoaded]);

    const addItem = (item: string) => {
        setItems((prev) => {
            if (prev.includes(item)) return prev; // 중복 방지
            return [...prev, item];
        });
    };

    const removeItem = (item: string) => {
        setItems((prev) => prev.filter((i) => i !== item));
    };

    const clearList = () => {
        setItems([]);
    };

    return {
        items,
        addItem,
        removeItem,
        clearList,
        isLoaded,
    };
}
