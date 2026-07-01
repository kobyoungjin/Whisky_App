import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB cap

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
        return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    let target: URL;
    try {
        target = new URL(url);
    } catch (e: any) {
        return NextResponse.json({ error: `invalid url: ${e.message || "parse failed"} — got ${JSON.stringify(url).slice(0, 200)}` }, { status: 400 });
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
        return NextResponse.json({ error: `only http/https allowed (got ${target.protocol})` }, { status: 400 });
    }

    try {
        const upstream = await fetch(target.toString(), {
            headers: { "User-Agent": "Mozilla/5.0 (BarCoder image fetcher)" },
            redirect: "follow"
        });
        if (!upstream.ok) {
            return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
        }
        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        if (!contentType.startsWith("image/")) {
            return NextResponse.json({ error: `not an image (${contentType})` }, { status: 415 });
        }
        const buf = Buffer.from(await upstream.arrayBuffer());
        if (buf.length > MAX_BYTES) {
            return NextResponse.json({ error: "image too large" }, { status: 413 });
        }
        return new NextResponse(buf, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "no-store"
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "fetch failed" }, { status: 500 });
    }
}
