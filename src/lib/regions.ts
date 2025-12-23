import { supabaseBrowser } from "./supabaseClient";

export type Region = {
  id: string;
  name: string;
  is_active: boolean;
};

// Fallback-Liste für den Fall, dass Supabase nicht verfügbar ist
const FALLBACK_REGIONS: Region[] = [
  { id: "1", name: "Berlin", is_active: true },
  { id: "2", name: "Hamburg", is_active: true },
  { id: "3", name: "München", is_active: true },
  { id: "4", name: "Köln", is_active: true },
  { id: "5", name: "Frankfurt am Main", is_active: true },
  { id: "6", name: "Stuttgart", is_active: true },
  { id: "7", name: "Düsseldorf", is_active: true },
  { id: "8", name: "Dortmund", is_active: true },
  { id: "9", name: "Essen", is_active: true },
  { id: "10", name: "Leipzig", is_active: true },
];

export const getRegions = async (): Promise<Region[]> => {
  try {
    const { data, error } = await supabaseBrowser
      .from("regions_live")
      .select("id, city, display_name, is_live")
      .eq("is_live", true)
      .order("city");

    if (error) {
      console.warn("Fehler beim Laden der Regionen, verwende Fallback-Liste:", error);
      return FALLBACK_REGIONS;
    }

    if (!data || data.length === 0) {
      console.warn("Keine Regionen gefunden, verwende Fallback-Liste");
      return FALLBACK_REGIONS;
    }

    return data.map((r: any) => ({
      id: r.id,
      name: r.display_name || r.city,
      is_active: r.is_live
    })) as Region[];
  } catch (error) {
    console.warn("Fehler beim Laden der Regionen, verwende Fallback-Liste:", error);
    return FALLBACK_REGIONS;
  }
};

