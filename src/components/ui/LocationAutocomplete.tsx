"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Search, MapPin, Loader2 } from "lucide-react";

export interface OpenPlzLocality {
  key: string;
  name: string;
  postalcode: string;
  municipality: {
    key: string;
    name: string;
    type: string;
  };
  district?: {
    key: string;
    name: string;
    type: string;
  };
  federalState: {
    key: string;
    name: string;
  };
}

interface LocationAutocompleteProps {
  onSelect: (locality: OpenPlzLocality | null) => void;
  selectedLocality: OpenPlzLocality | null;
}

export function LocationAutocomplete({ onSelect, selectedLocality }: LocationAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenPlzLocality[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchLocation(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const searchLocation = async (searchTerm: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://openplzapi.org/de/Localities?name=${encodeURIComponent(
          searchTerm
        )}&page=1&pageSize=10`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setIsOpen(true);
      } else {
        console.error("Failed to fetch locations");
        setResults([]);
      }
    } catch (error) {
      console.error("Error searching locations:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (locality: OpenPlzLocality) => {
    onSelect(locality);
    setQuery(locality.name); // keep name in input? or clear? prompt says "show what is selected" below input.
    // Let's keep the query as the name for now, but valid selection is separate.
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onSelect(null);
    setResults([]);
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <label htmlFor="location-input" className="sr-only">
          Stadt oder PLZ eingeben
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            id="location-input"
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
            placeholder="Stadt oder PLZ eingeben..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value === "") {
                onSelect(null);
              }
            }}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-h-64 overflow-y-auto backdrop-blur-xl">
            {results.map((locality, index) => (
              <button
                // Use a composite key plus index to ensure uniqueness as requested
                key={`${locality.key || 'loc'}-${locality.name}-${locality.postalcode}-${index}`}
                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                onClick={() => handleSelect(locality)}
              >
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {locality.name} {locality.postalcode}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {locality.municipality.name}, {locality.federalState.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLocality && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Check className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-blue-200">Ausgewählt</div>
              <div className="text-white font-medium">
                {selectedLocality.name}, {selectedLocality.federalState.name}, Deutschland
              </div>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="text-xs text-blue-300/60 hover:text-blue-200 transition-colors px-2 py-1"
          >
            Ändern
          </button>
        </div>
      )}
    </div>
  );
}
