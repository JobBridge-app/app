"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type LocationDetails = {
  address_line1: string;
  city: string;
  postal_code: string;
  postcode?: string; // Add alias for backwards compatibility
  lat: number;
  lng: number;
  lon?: number; // Add alias for backwards compatibility
  public_label: string;
  state?: string;
  house_number?: string;
};

interface LocationAutocompleteProps {
  onSelect: (location: LocationDetails) => void;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
}

export function LocationAutocomplete({ onSelect, defaultValue = "", className, placeholder }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Priority to Rheinbach/Meckenheim/Bonn (Radius/Viewbox)
        // We use 'viewbox' to prioritize but not strictly restrict (unless bounded=1).
        // User wants "Proposals in Rheinbach only if possible".
        // viewbox: left,top,right,bottom -> roughly 6.8,50.8,7.2,50.5
        // &dedupe=1 removes duplicates

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=de&viewbox=6.80,50.75,7.10,50.55&dedupe=1`,
          {
            headers: {
              "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
              // Nominatim requires a user agent or they might block/cors fail
              "User-Agent": "JobBridge/1.0"
            }
          }
        );
        const data = await response.json();
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Location search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: any) => {
    const addr = item.address || {};
    let street = addr.road || addr.pedestrian || addr.footway || "";
    let houseNumber = addr.house_number ? `${addr.house_number}` : "";

    // Smart Extraction: If API didn't return a house number, check if user typed one in the query
    if (!houseNumber && query) {
      // Regex to find trailing number (e.g. "Hauptstr 12", "Hauptstr. 12a")
      // Matches: space + digits + optional letter at end of string
      const match = query.match(/\s(\d+[a-zA-Z]?)$/);
      if (match) {
        houseNumber = match[1];
      }
    }

    const fullStreet = street + (houseNumber ? ` ${houseNumber}` : "");
    const city = addr.city || addr.town || addr.village || "Rheinbach";
    const zip = addr.postcode || "";

    // Construct a nice label
    const start = fullStreet ? `${fullStreet}, ` : "";
    const label = `${start}${zip} ${city}`;

    const details: LocationDetails = {
      address_line1: street, // Just street name
      city: city,
      postal_code: zip,
      postcode: zip,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      lon: parseFloat(item.lon),
      public_label: label,
      state: addr.state,
      house_number: houseNumber
    };

    setQuery(label);
    onSelect(details);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          placeholder={placeholder || "Adresse suchen (z.B. Hauptstraße 12)..."}
          className="w-full pl-12 pr-10 h-14 rounded-2xl bg-[#0F0F12] border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-base font-medium shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-4 text-slate-500 hover:text-white transition-colors p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-white/10 bg-[#1A1A20] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
            {results.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="mt-1 p-2 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <MapPin size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                    {item.address?.road || item.display_name.split(",")[0]}
                    {item.address?.house_number && <span className="text-indigo-400"> {item.address.house_number}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium group-hover:text-slate-400">
                    {item.address?.postcode} {item.address?.city || item.address?.town || item.address?.village}, {item.address?.country}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 bg-black/20 border-t border-white/5 text-[10px] uppercase tracking-wider text-slate-600 font-bold flex justify-between items-center">
            Rheinbach & Umgebung
          </div>
        </div>
      )}
    </div>
  );
}
