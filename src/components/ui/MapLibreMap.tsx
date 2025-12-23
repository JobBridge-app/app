"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MapLibreMapProps = {
    lat: number;
    lng: number;
    radiusKm?: number;
    zoom?: number;
    markers?: { lat: number; lng: number; label?: string }[];
};

export default function MapLibreMap({ lat, lng, radiusKm, zoom = 12, markers = [] }: MapLibreMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [apiKey] = useState(process.env.NEXT_PUBLIC_MAPTILER_KEY || "get_your_own_OpIi9ZULNHzrESv6T2vL"); // Fallback for dev

    useEffect(() => {
        if (map.current) return;
        if (!mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${apiKey}`, // Dark style
            center: [lng, lat],
            zoom: zoom,
            attributionControl: false // Custom attribution to save space or move it
        });

        // Add controls
        map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

        // Add center marker (Rheinbach/Market)
        if (markers.length === 0) {
            const el = document.createElement('div');
            el.className = 'w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-lg animate-pulse';
            new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(map.current);
        }

        // Add radius circle if provided
        map.current.on('load', () => {
            if (!map.current || !radiusKm) return;

            const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points = 64) => {
                const coords = { latitude: center[1], longitude: center[0] };
                const km = radiusInKm;
                const ret = [];
                const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
                const distanceY = km / 110.574;

                let theta, x, y;
                for (let i = 0; i < points; i++) {
                    theta = (i / points) * (2 * Math.PI);
                    x = distanceX * Math.cos(theta);
                    y = distanceY * Math.sin(theta);
                    ret.push([coords.longitude + x, coords.latitude + y]);
                }
                ret.push(ret[0]);
                return {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [ret],
                    },
                } as any;
            };

            const circleGeoJSON = createGeoJSONCircle([lng, lat], radiusKm);

            map.current.addSource('radius-source', {
                type: 'geojson',
                data: circleGeoJSON,
            });

            map.current.addLayer({
                id: 'radius-fill',
                type: 'fill',
                source: 'radius-source',
                layout: {},
                paint: {
                    'fill-color': '#6366f1',
                    'fill-opacity': 0.15,
                },
            });

            map.current.addLayer({
                id: 'radius-outline',
                type: 'line',
                source: 'radius-source',
                layout: {},
                paint: {
                    'line-color': '#818cf8',
                    'line-width': 2,
                    'line-dasharray': [2, 2],
                },
            });
        });

    }, [lat, lng, zoom, apiKey, radiusKm, markers]);

    // Update center if props change?
    // Usually map instances are static for simple views, but we can add effects here.

    return (
        <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-slate-950">
            <div ref={mapContainer} className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />

            {/* Attribution fallback if needed or custom overlay */}
        </div>
    );
}
