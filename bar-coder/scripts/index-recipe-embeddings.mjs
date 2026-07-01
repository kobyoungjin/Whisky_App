import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");

const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter(Boolean).map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1).trim()];
    })
);

const BR_URL = env.NEXT_PUBLIC_BASEROW_URL;
const BR_TOKEN = env.NEXT_PUBLIC_BASEROW_TOKEN;
const BR_TABLE = env.NEXT_PUBLIC_BASEROW_RECIPES_TABLE_ID;
const COHERE_KEY = env.COHERE_API_KEY;
const headersAuth = { Authorization: `Token ${BR_TOKEN}` };

const argv = process.argv.slice(2);
const force = argv.includes("--force"); // recompute even if embedding exists
const limit = parseInt(argv.find(a => a.startsWith("--limit="))?.split("=")[1] || "0", 10);

// Compact text representation of one recipe — this is what we embed.
function recipeToText(r) {
    return [
        r.name,
        r.info || "",
        r.ingredients || "",
        r.technique || r.make || "",
        r.glass || "",
    ].filter(Boolean).join(" | ");
}

// Cohere embeds up to 96 texts per call, so batch them.
async function embedBatch(texts) {
    const res = await fetch("https://api.cohere.com/v2/embed", {
        method: "POST",
        headers: { Authorization: `Bearer ${COHERE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "embed-multilingual-v3.0",
            texts,
            input_type: "search_document",
            embedding_types: ["float"]
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Cohere embed failed (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return data.embeddings.float; // array of vectors
}

async function patchRow(id, embedding) {
    const res = await fetch(`${BR_URL}/database/rows/table/${BR_TABLE}/${id}/?user_field_names=true`, {
        method: "PATCH",
        headers: { ...headersAuth, "Content-Type": "application/json" },
        body: JSON.stringify({ embedding: JSON.stringify(embedding) })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Baserow patch failed (${res.status}): ${errText}`);
    }
}

// Paginated fetch of ALL recipes (Baserow default page size can be 200 max)
async function fetchAllRecipes() {
    const all = [];
    let page = 1;
    while (true) {
        const res = await fetch(`${BR_URL}/database/rows/table/${BR_TABLE}/?user_field_names=true&size=200&page=${page}`, {
            headers: headersAuth
        });
        if (!res.ok) throw new Error(`Baserow list failed (${res.status}): ${await res.text()}`);
        const data = await res.json();
        all.push(...data.results);
        if (!data.next) break;
        page++;
    }
    return all;
}

const recipes = await fetchAllRecipes();
console.log(`Total recipes: ${recipes.length}`);

// Filter to those needing (re)embedding
const needIndex = recipes.filter(r => force || !r.embedding || r.embedding.length < 10);
const targets = limit > 0 ? needIndex.slice(0, limit) : needIndex;
console.log(`Needing embedding: ${targets.length}\n`);
if (targets.length === 0) {
    console.log("Nothing to do. Use --force to recompute all.");
    process.exit(0);
}

// Embed in batches of 96 (Cohere hard limit)
const BATCH = 96;
for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    const texts = chunk.map(recipeToText);
    process.stdout.write(`  Embedding batch ${Math.floor(i / BATCH) + 1} (${chunk.length} texts)... `);
    const vectors = await embedBatch(texts);
    console.log(`got ${vectors.length} × ${vectors[0].length}-dim`);

    // Patch each row (sequentially to stay under Baserow rate limits)
    for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const vec = vectors[j];
        try {
            await patchRow(row.id, vec);
            console.log(`    [${i + j + 1}/${targets.length}] id=${row.id} ${row.name} — saved`);
        } catch (e) {
            console.error(`    id=${row.id} ${row.name} FAIL: ${e.message}`);
        }
    }
}

console.log("\nDone.");
