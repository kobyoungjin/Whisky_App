import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { removeBackground } from "@imgly/background-removal-node";
import { Jimp } from "jimp";

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

const CANVAS_W = 400;
const CANVAS_H = 600;

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const limit = parseInt(argv.find(a => a.startsWith("--limit="))?.split("=")[1] || "0", 10);

const headersAuth = { Authorization: `Token ${BR_TOKEN}` };

async function fetchInventory() {
    const res = await fetch(`${BR_URL}/database/rows/table/${BR_TABLE}/?user_field_names=true&size=200`, {
        headers: headersAuth
    });
    const data = await res.json();
    return data.results;
}

async function uploadToBaserow(buffer, filename) {
    const form = new FormData();
    const blob = new Blob([buffer], { type: "image/png" });
    form.append("file", blob, filename);
    const res = await fetch(`${BR_URL}/user-files/upload-file/`, {
        method: "POST",
        headers: headersAuth,
        body: form
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed (${res.status}): ${errText}`);
    }
    return await res.json();
}

async function patchRowImage(rowId, fileMeta) {
    const res = await fetch(`${BR_URL}/database/rows/table/${BR_TABLE}/${rowId}/?user_field_names=true`, {
        method: "PATCH",
        headers: { ...headersAuth, "Content-Type": "application/json" },
        body: JSON.stringify({ image: [{ name: fileMeta.name }] })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Patch failed (${res.status}): ${errText}`);
    }
}

async function processItem(item) {
    const src = item.image?.[0];
    if (!src) return { id: item.id, name: item.name, status: "no-image" };

    // 1. Download original
    const imgRes = await fetch(src.url);
    if (!imgRes.ok) throw new Error(`download failed: ${imgRes.status}`);
    const srcBuffer = Buffer.from(await imgRes.arrayBuffer());

    // 2. Remove background — library requires Blob input
    const inputContentType = imgRes.headers.get("content-type") || "image/png";
    const inputBlob = new Blob([srcBuffer], { type: inputContentType });
    const blob = await removeBackground(inputBlob);
    const noBgBuffer = Buffer.from(await blob.arrayBuffer());

    // 3. Trim transparent edges, then fit to canvas with small padding
    const img = await Jimp.read(noBgBuffer);

    // Scan alpha channel to find tight bounding box of non-transparent content
    const { width: W, height: H, data } = img.bitmap;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    const ALPHA_THRESHOLD = 10; // ignore near-transparent pixels
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const alpha = data[(y * W + x) * 4 + 3];
            if (alpha > ALPHA_THRESHOLD) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < minX || maxY < minY) throw new Error("no opaque pixels found");

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    img.crop({ x: minX, y: minY, w: cropW, h: cropH });

    // Fit cropped content into canvas with thin transparent margin
    const PADDING = 12; // px on each side
    const targetW = CANVAS_W - PADDING * 2;
    const targetH = CANVAS_H - PADDING * 2;
    const scale = Math.min(targetW / cropW, targetH / cropH);
    const newW = Math.max(1, Math.round(cropW * scale));
    const newH = Math.max(1, Math.round(cropH * scale));
    img.resize({ w: newW, h: newH });

    const canvas = new Jimp({ width: CANVAS_W, height: CANVAS_H, color: 0x00000000 });
    canvas.composite(img, Math.round((CANVAS_W - newW) / 2), Math.round((CANVAS_H - newH) / 2));
    const resized = await canvas.getBuffer("image/png");

    if (dryRun) {
        const outDir = path.join(projectRoot, "scripts", "dry-run-output");
        fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, `${item.id}_${item.name.replace(/[^\w가-힣]+/g, "_").slice(0, 30)}.png`);
        fs.writeFileSync(outPath, resized);
        return { id: item.id, name: item.name, status: "dry-run", outPath, bytes: resized.length };
    }

    // 4. Upload to Baserow
    const safeName = item.name.replace(/[^\w가-힣]+/g, "_").slice(0, 40) || "bottle";
    const uploaded = await uploadToBaserow(resized, `${safeName}_${item.id}.png`);

    // 5. Patch row
    await patchRowImage(item.id, uploaded);

    return { id: item.id, name: item.name, status: "ok", newUrl: uploaded.url, bytes: resized.length };
}

const items = await fetchInventory();
const targets = items.filter(it => Array.isArray(it.image) && it.image.length > 0);
const toProcess = limit > 0 ? targets.slice(0, limit) : targets;
console.log(`Mode: ${dryRun ? "DRY-RUN" : "WRITE"} | Targets: ${toProcess.length} / ${targets.length}\n`);

const results = [];
for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    const tag = `[${i + 1}/${toProcess.length}] id=${item.id} ${item.name}`;
    process.stdout.write(`${tag} ... `);
    try {
        const r = await processItem(item);
        console.log(`OK (${(r.bytes / 1024).toFixed(0)} KB)`);
        results.push(r);
    } catch (e) {
        console.log(`FAIL — ${e.message}`);
        results.push({ id: item.id, name: item.name, status: "error", error: e.message });
    }
}

console.log("\n--- Summary ---");
const ok = results.filter(r => r.status === "ok" || r.status === "dry-run").length;
const fail = results.filter(r => r.status === "error").length;
console.log(`Success: ${ok} | Failed: ${fail}`);
if (fail > 0) {
    console.log("\nFailures:");
    results.filter(r => r.status === "error").forEach(r => console.log(`  id=${r.id} ${r.name}: ${r.error}`));
}
