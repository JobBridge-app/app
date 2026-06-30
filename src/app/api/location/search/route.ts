import { NextResponse } from 'next/server';
import {
    buildOpenPlzUrl,
    openPlzToSearchResults,
    splitLocationQuery,
    type LocationSearchResult,
    type OpenPlzLocality,
} from '@/lib/locationSearch';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || "";
    const cityOnly = searchParams.get('cityOnly') === 'true';

    if (q.length < 3) {
        return NextResponse.json([]);
    }

    try {
        if (cityOnly) {
            const openPlzUrl = buildOpenPlzUrl(q);
            if (!openPlzUrl) return NextResponse.json([]);

            const response = await fetch(openPlzUrl, {
                cache: "no-store",
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "JobBridgeAppServer/1.0 (contact: kontakt@jobbridge.team)"
                }
            });

            if (!response.ok) {
                console.error(`OpenPLZ API returned status: ${response.status}`);
                return NextResponse.json([]);
            }

            const data = await response.json();
            const localities = Array.isArray(data) ? data as OpenPlzLocality[] : [];

            return NextResponse.json(openPlzToSearchResults(localities, q).slice(0, 5));
        }

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "json");
        url.searchParams.set("q", q);
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", "de");
        url.searchParams.set("dedupe", "1");

        const response = await fetch(url.toString(), {
            cache: "no-store",
            headers: {
                "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                "User-Agent": "JobBridgeAppServer/1.0 (contact: kontakt@jobbridge.team)"
            }
        });

        if (!response.ok) {
            console.error(`Nominatim API returned status: ${response.status}`);
            return NextResponse.json({ error: "Upstream API error" }, { status: response.status });
        }

        const { postcode } = splitLocationQuery(q);
        const data = await response.json();
        const results = Array.isArray(data) ? data as LocationSearchResult[] : [];
        const filteredResults = postcode
            ? results.filter((result) => !result.address?.postcode || result.address.postcode === postcode)
            : results;

        return NextResponse.json(filteredResults);
    } catch (error) {
        console.error("Location search error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
