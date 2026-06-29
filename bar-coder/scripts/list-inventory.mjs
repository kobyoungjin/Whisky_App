import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve("bar-coder/.env.local");
const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter(Boolean).map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const url = env.NEXT_PUBLIC_BASEROW_URL;
const token = env.NEXT_PUBLIC_BASEROW_TOKEN;
const tableId = env.NEXT_PUBLIC_BASEROW_INVENTORY_TABLE_ID;

const res = await fetch(`${url}/database/rows/table/${tableId}/?user_field_names=true&size=200`, {
    headers: { Authorization: `Token ${token}` }
});
const data = await res.json();

console.log(`TOTAL: ${data.count}`);
for (const row of data.results) {
    const imgCount = Array.isArray(row.image) ? row.image.length : 0;
    console.log(`id=${row.id} | name="${row.name}" | category=${row.category?.value} | abv=${row.abv} | volume=${row.volume} | imgCount=${imgCount} | user_uid=${row.user_uid}`);
}
