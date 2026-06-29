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
const BR_TABLE = env.NEXT_PUBLIC_BASEROW_INVENTORY_TABLE_ID;
const headersAuth = { Authorization: `Token ${BR_TOKEN}` };

// 1. Check if `order` field already exists
const fieldsRes = await fetch(`${BR_URL}/database/fields/table/${BR_TABLE}/`, { headers: headersAuth });
const fields = await fieldsRes.json();
const existing = fields.find(f => f.name === "Order");

if (existing) {
    console.log(`Field 'order' already exists (id=${existing.id}, type=${existing.type})`);
} else {
    console.log("Creating 'order' field …");
    const createRes = await fetch(`${BR_URL}/database/fields/table/${BR_TABLE}/`, {
        method: "POST",
        headers: { ...headersAuth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Order", type: "number", number_decimal_places: 0, number_negative: false })
    });
    if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`Field creation failed (${createRes.status}): ${errText}`);
        process.exit(1);
    }
    const newField = await createRes.json();
    console.log(`Created field id=${newField.id}`);
}

// 2. Seed initial order values based on current row id (stable ascending)
const invRes = await fetch(`${BR_URL}/database/rows/table/${BR_TABLE}/?user_field_names=true&size=200`, { headers: headersAuth });
const invData = await invRes.json();
const rows = invData.results.sort((a, b) => a.id - b.id);

console.log(`Seeding 'order' for ${rows.length} rows (10-step spacing) …`);
for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const newOrder = (i + 1) * 10; // 10, 20, 30, …
    if (row.Order === newOrder) continue;
    const patchRes = await fetch(`${BR_URL}/database/rows/table/${BR_TABLE}/${row.id}/?user_field_names=true`, {
        method: "PATCH",
        headers: { ...headersAuth, "Content-Type": "application/json" },
        body: JSON.stringify({ Order: newOrder })
    });
    if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error(`  id=${row.id} ${row.name} FAIL: ${errText}`);
    } else {
        console.log(`  id=${row.id} ${row.name} → order=${newOrder}`);
    }
}

console.log("\nDone.");
