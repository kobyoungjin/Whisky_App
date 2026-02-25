import axios from "axios";

const BASEROW_API_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io/api";
const BASEROW_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN;

/**
 * Baserow에서 데이터를 가져오는 기본 유틸リティ
 */
export async function fetchBaserowTable(tableId: string) {
    if (!BASEROW_TOKEN) {
        // 토큰이 없는 경우 로컬 JSON 데이터로 폴백하거나 에러를 던질 수 있습니다.
        console.warn("Baserow Token is missing. Using fallback logic might be needed.");
        throw new Error("Baserow configuration is missing.");
    }

    try {
        const response = await axios.get(`${BASEROW_API_URL}/database/rows/table/${tableId}/?user_field_names=true`, {
            headers: {
                Authorization: `Token ${BASEROW_TOKEN}`,
            },
        });
        return response.data.results;
    } catch (error) {
        console.error("Error fetching Baserow data:", error);
        throw error;
    }
}
