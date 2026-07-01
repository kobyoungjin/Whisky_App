/**
 * Server-side RAG helpers: embedding via Cohere + in-memory cosine retrieval
 * over recipe embeddings stored in Baserow.
 *
 * Recipes are fetched once and cached at module scope (5-min TTL). The
 * embedding vector is stored as JSON text in Baserow's `embedding` field and
 * parsed lazily on the first search after cache load.
 */
import { RecipeItem } from "@/types/baserow";

const BR_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io/api";
const BR_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN;
const BR_RECIPES = process.env.NEXT_PUBLIC_BASEROW_RECIPES_TABLE_ID;
const COHERE_KEY = process.env.COHERE_API_KEY;

// Cached corpus (module scope survives across requests within same worker)
type IndexedRecipe = RecipeItem & { _vec: Float32Array };
let cache: { rows: IndexedRecipe[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchAllRecipes(): Promise<RecipeItem[]> {
    if (!BR_TOKEN || !BR_RECIPES) throw new Error("Baserow env vars missing");
    const all: RecipeItem[] = [];
    let page = 1;
    while (true) {
        const res = await fetch(`${BR_URL}/database/rows/table/${BR_RECIPES}/?user_field_names=true&size=200&page=${page}`, {
            headers: { Authorization: `Token ${BR_TOKEN}` }
        });
        if (!res.ok) throw new Error(`Baserow list failed (${res.status}): ${await res.text()}`);
        const data = await res.json();
        all.push(...data.results);
        if (!data.next) break;
        page++;
    }
    return all;
}

async function getIndexedRecipes(): Promise<IndexedRecipe[]> {
    if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.rows;

    const raw = await fetchAllRecipes();
    const rows: IndexedRecipe[] = [];
    for (const r of raw) {
        if (!r.embedding) continue;
        try {
            const arr = JSON.parse(r.embedding);
            if (Array.isArray(arr) && arr.length > 0) {
                rows.push({ ...r, _vec: Float32Array.from(arr) });
            }
        } catch {
            // Skip malformed embeddings.
        }
    }
    cache = { rows, loadedAt: Date.now() };
    return rows;
}

export async function embedQuery(text: string): Promise<Float32Array> {
    if (!COHERE_KEY) throw new Error("COHERE_API_KEY missing");
    const res = await fetch("https://api.cohere.com/v2/embed", {
        method: "POST",
        headers: { Authorization: `Bearer ${COHERE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "embed-multilingual-v3.0",
            texts: [text],
            input_type: "search_query",
            embedding_types: ["float"]
        })
    });
    if (!res.ok) {
        throw new Error(`Cohere embed failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    return Float32Array.from(data.embeddings.float[0]);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface SearchOptions {
    topK?: number;
    // Restrict candidates to recipes whose name matches any of these
    // (case-insensitive substring). Empty/undefined = no restriction.
    nameAllowList?: string[];
}

export interface RetrievedRecipe extends RecipeItem {
    score: number;
}

export async function searchRecipes(query: string, opts: SearchOptions = {}): Promise<RetrievedRecipe[]> {
    const { topK = 5, nameAllowList } = opts;
    const rows = await getIndexedRecipes();
    const qVec = await embedQuery(query);

    let candidates = rows;
    if (nameAllowList && nameAllowList.length > 0) {
        const allowSet = new Set(nameAllowList.map(n => n.toLowerCase()));
        candidates = candidates.filter(r => allowSet.has(r.name.toLowerCase()));
    }

    const scored = candidates.map(r => ({ ...r, score: cosineSimilarity(qVec, r._vec) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(({ _vec, ...rest }) => rest as RetrievedRecipe);
}

export function invalidateRagCache() {
    cache = null;
}
