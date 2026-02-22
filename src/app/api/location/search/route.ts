import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 3) {
        return NextResponse.json([]);
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&countrycodes=de&viewbox=6.80,50.75,7.10,50.55&dedupe=1`,
            {
                headers: {
                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                    // Server-side user agent allows bypassing client CORS blocks and adheres to Nominatim usage policy
                    "User-Agent": "JobBridgeAppServer/1.0 (contact: info@jobbridge.de)"
                }
            }
        );

        if (!response.ok) {
            console.error(`Nominatim API returned status: ${response.status}`);
            return NextResponse.json({ error: "Upstream API error" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Nominatim Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
