import axios from "axios";
import { InventoryItem, RecipeItem } from "@/types/baserow";

const BASEROW_API_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io/api";
const BASEROW_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN;
const INVENTORY_TABLE_ID = process.env.NEXT_PUBLIC_BASEROW_INVENTORY_TABLE_ID;
const RECIPES_TABLE_ID = process.env.NEXT_PUBLIC_BASEROW_RECIPES_TABLE_ID;

const getHeaders = () => {
    if (!BASEROW_TOKEN) {
        throw new Error("Baserow configuration is missing (Token).");
    }
    return {
        Authorization: `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json",
    };
};

/**
 * [Inventory] 사용자의 UID 기반으로 재고 항목 조회
 */
export async function getInventory(uid: string): Promise<InventoryItem[]> {
    if (!INVENTORY_TABLE_ID) throw new Error("Inventory Table ID is missing.");
    try {
        const response = await axios.get(
            `${BASEROW_API_URL}/database/rows/table/${INVENTORY_TABLE_ID}/?user_field_names=true&filter__user_uid__equal=${uid}&size=200`,
            { headers: getHeaders() }
        );
        return response.data.results;
    } catch (error) {
        console.error("Error fetching inventory:", error);
        throw error;
    }
}

/**
 * [Inventory] 필드 정보 가져오기 (카테고리 옵션 등)
 */
export async function getInventoryFields(): Promise<any[]> {
    if (!INVENTORY_TABLE_ID) throw new Error("Inventory Table ID is missing.");
    try {
        const response = await axios.get(
            `${BASEROW_API_URL}/database/fields/table/${INVENTORY_TABLE_ID}/`,
            { headers: getHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching inventory fields:", error);
        throw error;
    }
}

/**
 * [Inventory] 새로운 술 데이터 추가
 */
export async function addInventoryItem(uid: string, data: Omit<InventoryItem, "id" | "user_uid">): Promise<InventoryItem> {
    if (!INVENTORY_TABLE_ID) throw new Error("Inventory Table ID is missing.");
    try {
        const response = await axios.post(
            `${BASEROW_API_URL}/database/rows/table/${INVENTORY_TABLE_ID}/?user_field_names=true`,
            {
                ...data,
                user_uid: uid,
            },
            { headers: getHeaders() }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("Baserow Add Error Details:", JSON.stringify(error.response.data, null, 2));
        }
        console.error("Error adding inventory item:", error);
        throw error;
    }
}

/**
 * [Inventory] 기존 술 데이터 수정
 */
export async function updateInventoryItem(id: number, data: Partial<Omit<InventoryItem, "id" | "user_uid">>): Promise<InventoryItem> {
    if (!INVENTORY_TABLE_ID) throw new Error("Inventory Table ID is missing.");
    try {
        const response = await axios.patch(
            `${BASEROW_API_URL}/database/rows/table/${INVENTORY_TABLE_ID}/${id}/?user_field_names=true`,
            data,
            { headers: getHeaders() }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("Baserow Update Error Details:", JSON.stringify(error.response.data, null, 2));
        }
        console.error("Error updating inventory item:", error);
        throw error;
    }
}

/**
 * [Inventory] 술 데이터 삭제
 */
export async function deleteInventoryItem(id: number): Promise<void> {
    if (!INVENTORY_TABLE_ID) throw new Error("Inventory Table ID is missing.");
    try {
        await axios.delete(
            `${BASEROW_API_URL}/database/rows/table/${INVENTORY_TABLE_ID}/${id}/`,
            { headers: getHeaders() }
        );
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("Baserow Delete Error Details:", JSON.stringify(error.response.data, null, 2));
        }
        console.error("Error deleting inventory item:", error);
        throw error;
    }
}

/**
 * [Recipes] 칵테일 레시피 조회 (공용 데이터 - 캐싱 적용)
 */
export async function getRecipes(): Promise<RecipeItem[]> {
    if (!RECIPES_TABLE_ID) throw new Error("Recipes Table ID is missing.");

    const CACHE_KEY = "bar_coder_recipes_cache_v3";
    const CACHE_TTL = 60 * 60 * 1000; // 1시간 (ms)

    // 1. 브라우저 캐시 확인
    if (typeof window !== "undefined") {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    return data;
                }
            } catch (e) {
                console.warn("Cache parse error, fetching fresh data...");
            }
        }
    }

    try {
        let allResults: RecipeItem[] = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // 한 번에 최대한 많이(200개) 가져오도록 size 파라미터 추가
            const response = await axios.get(
                `${BASEROW_API_URL}/database/rows/table/${RECIPES_TABLE_ID}/?user_field_names=true&page=${page}&size=200`,
                { headers: getHeaders() }
            );
            allResults = [...allResults, ...response.data.results];

            if (response.data.next) {
                page += 1;
            } else {
                hasNextPage = false;
            }
        }

        // 2. 캐시 저장
        if (typeof window !== "undefined") {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: allResults,
                timestamp: Date.now()
            }));
        }

        return allResults;
    } catch (error) {
        console.error("Error fetching recipes:", error);
        throw error;
    }
}

/**
 * [Recipes] 새로운 레시피 추가
 */
export async function addRecipe(data: Omit<RecipeItem, "id">): Promise<RecipeItem> {
    if (!RECIPES_TABLE_ID) throw new Error("Recipes Table ID is missing.");
    try {
        const response = await axios.post(
            `${BASEROW_API_URL}/database/rows/table/${RECIPES_TABLE_ID}/?user_field_names=true`,
            data,
            { headers: getHeaders() }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("Baserow Recipe Add Error:", JSON.stringify(error.response.data, null, 2));
        }
        console.error("Error adding recipe:", error);
        throw error;
    }
}

/**
 * [Recipes] 기존 레시피 수정
 */
export async function updateRecipe(id: number, data: Partial<RecipeItem>): Promise<RecipeItem> {
    if (!RECIPES_TABLE_ID) throw new Error("Recipes Table ID is missing.");
    try {
        const response = await axios.patch(
            `${BASEROW_API_URL}/database/rows/table/${RECIPES_TABLE_ID}/${id}/?user_field_names=true`,
            data,
            { headers: getHeaders() }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("Baserow Recipe Update Error:", JSON.stringify(error.response.data, null, 2));
        }
        console.error("Error updating recipe:", error);
        throw error;
    }
}

/**
 * [Files] Baserow 서버에 파일 업로드
 */
export async function uploadFile(file: File): Promise<any> {
    if (!BASEROW_TOKEN) throw new Error("Baserow Token is missing.");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post(
            `${BASEROW_API_URL}/user-files/upload-file/`,
            formData,
            {
                headers: {
                    ...getHeaders(),
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data; // { url, name, size, type, ... }
    } catch (error) {
        console.error("Error uploading file to Baserow:", error);
        throw error;
    }
}
