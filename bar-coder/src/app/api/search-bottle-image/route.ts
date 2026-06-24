import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // API 키나 CSE ID가 없으면 빈 배열 반환 (직접 업로드만 사용 가능)
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
        return NextResponse.json({ images: [], error: "Google API key or CSE ID not configured" }, { status: 200 });
    }

    try {
        const searchQuery = encodeURIComponent(`${query} bottle product image transparent`);
        const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${searchQuery}&searchType=image&num=5&imgSize=medium&imgType=photo&safe=active`;

        const response = await fetch(url);

        if (!response.ok) {
            const errData = await response.json();
            console.error("Google CSE Error:", errData);
            return NextResponse.json({ images: [], error: "Google search failed" }, { status: 200 });
        }

        const data = await response.json();
        const images = (data.items || []).map((item: any) => ({
            url: item.link,
            thumbnail: item.image?.thumbnailLink || item.link,
            title: item.title,
        })).slice(0, 5);

        return NextResponse.json({ images });
    } catch (error) {
        console.error("Image search error:", error);
        return NextResponse.json({ images: [], error: "Search failed" }, { status: 200 });
    }
}
