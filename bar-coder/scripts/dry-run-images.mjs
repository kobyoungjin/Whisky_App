import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve("bar-coder/.env.local");
const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter(Boolean).map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1).trim()];
    })
);

const BR_URL = env.NEXT_PUBLIC_BASEROW_URL;
const BR_TOKEN = env.NEXT_PUBLIC_BASEROW_TOKEN;
const BR_TABLE = env.NEXT_PUBLIC_BASEROW_INVENTORY_TABLE_ID;
const GOOGLE_KEY = env.GOOGLE_API_KEY;
const CSE_ID = env.GOOGLE_CSE_ID;

const invRes = await fetch(`${BR_URL}/database/rows/table/${BR_TABLE}/?user_field_names=true&size=200`, {
    headers: { Authorization: `Token ${BR_TOKEN}` }
});
const invData = await invRes.json();
const items = invData.results.filter(r => !Array.isArray(r.image) || r.image.length === 0);
console.log(`Items needing images: ${items.length}\n`);

const buildQuery = (item) => {
    const name = item.name.trim();
    const cat = item.category?.value || "";
    return `${name} ${cat}`.trim();
};

const results = [];
for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const query = buildQuery(item);
    const cseUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${CSE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=3&imgSize=medium&imgType=photo&safe=active`;
    try {
        const cseRes = await fetch(cseUrl);
        const cseData = await cseRes.json();
        if (cseData.error) {
            console.error(`CSE error for ${item.name}:`, cseData.error.message);
            results.push({ id: item.id, name: item.name, category: item.category?.value, query, topImages: [], error: cseData.error.message });
            continue;
        }
        const topImages = (cseData.items || []).map(it => ({ url: it.link, title: it.title }));
        results.push({ id: item.id, name: item.name, category: item.category?.value, query, topImages });
        console.log(`[${i + 1}/${items.length}] id=${item.id} ${item.name} (${item.category?.value})`);
        console.log(`    query: "${query}"`);
        for (const img of topImages) {
            console.log(`      - ${img.url}`);
        }
        console.log("");
    } catch (e) {
        console.error(`Failed for ${item.name}:`, e.message);
        results.push({ id: item.id, name: item.name, query, topImages: [], error: e.message });
    }
    await new Promise(r => setTimeout(r, 200));
}

fs.writeFileSync("bar-coder/scripts/dry-run-results.json", JSON.stringify(results, null, 2));
console.log("Saved to bar-coder/scripts/dry-run-results.json");
