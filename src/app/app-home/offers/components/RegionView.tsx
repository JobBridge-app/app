"use client";


import { MapPin, Info, Globe } from "lucide-react";
import MapLibreMap from "@/components/ui/MapLibreMap";

export function RegionView({
    regionName
}: {
    regionName: string | null
}) {
    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm bg-gradient-to-r from-indigo-900/10 to-transparent">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Deine Region: {regionName || "Nicht zugewiesen"}</h3>
                        <p className="text-slate-400 text-sm max-w-lg">
                            Deine Jobangebote sind für Jugendliche in dieser Region und im Umkreis sichtbar.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MapLibre Map */}
                <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden min-h-[300px] relative z-0">
                    <MapLibreMap lat={50.625} lng={6.948} radiusKm={10} />
                </div>

                {/* Settings / Info */}
                <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Info size={16} className="text-slate-400" />
                            Sichtbarkeitseinstellungen
                        </h4>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-slate-400 text-sm">Standard Radius</span>
                                <span className="text-white font-mono">10 km</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-slate-400 text-sm">Standort verschleiern</span>
                                <span className="text-emerald-400 text-sm font-medium">Aktiviert</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-slate-400 text-sm">Status</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">Öffentlich</span>
                            </div>
                        </div>

                        <button className="w-full mt-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-300 transition-colors">
                            Einstellungen ändern
                        </button>
                    </div>

                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6">
                        <h4 className="text-indigo-300 font-semibold mb-2">Reichweite erhöhen?</h4>
                        <p className="text-xs text-indigo-200/60 mb-4">
                            Erreiche mehr Jugendliche in benachbarten Regionen durch ein Upgrade.
                        </p>
                        <button className="text-xs text-indigo-400 hover:text-white font-semibold underline">
                            Mehr erfahren
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
