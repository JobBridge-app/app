"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Profile } from "@/lib/types";
import { LockKeyhole, Building2, User, MapPin, Briefcase, Sparkles, Clock, ShieldCheck, ShieldAlert, ArrowRight, Plus, Users, Calendar, Fingerprint, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { LocationAutocomplete, LocationDetails } from "@/components/ui/LocationAutocomplete";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import { StaffBadge } from "@/components/ui/StaffBadge";
import { ProviderVerificationModal } from "@/components/profile/ProviderVerificationModal";
import { GuardianBanner } from "./GuardianBanner";
import { GuardianConsentModal } from "@/components/GuardianConsentModal";
import { getGuardians, getWards } from "@/app/actions/guardian";
import { GuardianManageModal } from "@/components/profile/GuardianManageModal";

type GuardianDisplay = {
    id: string;
    full_name: string | null;
    email: string | null;
};

type ProfileEditFormProps = {
    profile: Profile;
    className?: string;
    isStaff?: boolean;
    guardians?: GuardianDisplay[];
    lastLogin?: { created_at: string } | null;
};

const profileFieldLabelClass = "profile-field-label text-[11px] font-extrabold uppercase tracking-[0.15em] ml-1 transition-colors";
const profileFieldLabelWithIconClass = `${profileFieldLabelClass} flex items-center gap-2`;
const profileInputClass = "profile-field-control w-full h-14 rounded-2xl border-2 px-5 font-medium transition-all focus:outline-none";
const profileLockedInputClass = `${profileInputClass} cursor-not-allowed pr-10`;
const profileTextareaClass = "profile-field-control w-full resize-none rounded-2xl border-2 px-6 py-5 text-base md:text-lg font-medium leading-relaxed transition-all focus:outline-none";

export function ProfileEditForm({ profile, className, isStaff = false, guardians = [], lastLogin = null }: ProfileEditFormProps) {
    const isProvider = profile.account_type === "job_provider";
    const isVerified = profile.provider_verification_status === 'verified' || Boolean(profile.provider_verified_at);

    const isProfileIncomplete = !isVerified && (!profile.full_name || !profile.city || !profile.street || !profile.house_number || !profile.zip);

    const [bio, setBio] = useState(profile.bio?.trim() || "");
    const [availabilityNote, setAvailabilityNote] = useState((profile.availability_note ?? "").trim());

    const [interests, setInterests] = useState(profile.interests?.trim() || "");
    const [skills, setSkills] = useState((profile.skills ?? "").trim());

    const [city, setCity] = useState(profile.city || "");
    const [zip, setZip] = useState(profile.zip || "");
    const [street, setStreet] = useState(profile.street || "");
    const [houseNumber, setHouseNumber] = useState(profile.house_number || "");
    const [lat, setLat] = useState<number | null>(profile.lat ? Number(profile.lat) : null);
    const [lng, setLng] = useState<number | null>(profile.lng ? Number(profile.lng) : null);

    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState<null | { type: "ok" | "error"; message: string }>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationFocusActive, setVerificationFocusActive] = useState(false);
    const verificationCtaRef = useRef<HTMLDivElement>(null);

    const [guardiansList, setGuardiansList] = useState<GuardianDisplay[]>(guardians);
    const [showAddGuardianModal, setShowAddGuardianModal] = useState(false);

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showDevToast = () => {
        setToastMessage("Diese Funktion ist noch in der Entwicklung.");
        setTimeout(() => setToastMessage(null), 3000);
    };

    const refreshGuardians = async () => {
        const res = await getGuardians();
        if (res.guardians) {
            setGuardiansList(res.guardians);
        }
    };

    const searchParams = useSearchParams();
    const focusTarget = searchParams.get("focus");
    const shouldReturnToJobCreator = searchParams.get("from") === "create-job";

    useEffect(() => {
        if (focusTarget === "provider-verification" && isProvider && !isVerified) {
            const focusTimer = window.setTimeout(() => {
                verificationCtaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setVerificationFocusActive(true);
            }, 260);

            const fadeTimer = window.setTimeout(() => {
                setVerificationFocusActive(false);
            }, 3200);

            return () => {
                window.clearTimeout(focusTimer);
                window.clearTimeout(fadeTimer);
            };
        }

        if (focusTarget === "location") {
            const el = document.getElementById("location-section");
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.add("ring-4", "ring-indigo-500/50", "transition-all", "duration-1000");
                    setTimeout(() => el.classList.remove("ring-4", "ring-indigo-500/50"), 2000);
                }, 300);
            }
        }
    }, [focusTarget, isProvider, isVerified]);

    const [wardsList, setWardsList] = useState<GuardianDisplay[]>([]);

    useEffect(() => {
        const fetchWards = async () => {
            const res = await getWards();
            if (res.wards) {
                setWardsList(res.wards);
            }
        };
        fetchWards();
    }, []);

    const savePayload = useMemo(() => {
        const toNull = (v: string) => {
            const t = v.trim();
            return t.length > 0 ? t : null;
        };

        const base = {
            bio: toNull(bio),
            availability_note: toNull(availabilityNote),
        };

        if (isProvider) {
            return {
                ...base,
                skills: null,
                interests: null,
            };
        } else {
            return {
                ...base,
                skills: toNull(skills),
                interests: toNull(interests),
                city: toNull(city),
                zip: toNull(zip),
                street: toNull(street),
                house_number: toNull(houseNumber),
                lat: lat,
                lng: lng,
            };
        }
    }, [bio, interests, skills, availabilityNote, isProvider, city, zip, street, houseNumber, lat, lng]);

    const onSave = async () => {
        setSaving(true);
        setSaveState(null);
        try {
            const { error } = await supabaseBrowser
                .from("profiles")
                .update(savePayload)
                .eq("id", profile.id);

            if (error) throw error;
            setSaveState({ type: "ok", message: "Gespeichert." });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            setSaveState({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleLocationSelect = (loc: LocationDetails) => {
        setStreet(loc.address_line1);
        setZip(loc.postcode || "");
        setLat(loc.lat ?? null);
        setLng(loc.lon ?? loc.lng ?? null);
        if (loc.house_number) {
            setHouseNumber(loc.house_number);
        }
    };

    return (
        <section className={cn("profile-page relative min-h-screen -mt-24 pt-24 pb-24 font-sans", className)}>

            <div className="profile-page-background fixed inset-0 pointer-events-none" />

            <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-4 pb-8 md:pt-6 md:pb-12 max-w-[1600px]">

                <div className="profile-page-header flex flex-col md:flex-row md:items-end justify-between gap-8 mb-6 md:mb-8">
                    <div className="profile-page-heading space-y-2 relative">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.16] py-1 drop-shadow-2xl">
                            {(isProvider && profile.provider_kind === 'company') ? "Firmenprofil" : "Das Profil"}<span className="text-indigo-500">.</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            className="profile-action-secondary inline-flex items-center gap-2 px-4 md:px-6 py-3 rounded-2xl border text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                            <User size={18} className="text-indigo-400" />
                            <span className="hidden md:inline">Vorschau</span>
                            <span className="md:hidden">Vorschau</span>
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            className={cn(
                                "profile-action-primary group inline-flex items-center gap-2 rounded-2xl px-8 py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]",
                                "bg-[#4F46E5] text-white hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                            )}
                        >
                            {saving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Speichern...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} className="fill-white/20 group-hover:fill-white/40 transition-all" />
                                    Speichern
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {saveState && (
                    <div className="fixed top-24 right-8 z-[100]">
                        <div
                            className={cn(
                                "flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-right-8 duration-500",
                                saveState.type === "ok"
                                    ? "bg-[#052e16]/80 border-emerald-500/30 text-emerald-200 shadow-emerald-900/20"
                                    : "bg-[#4c0519]/80 border-rose-500/30 text-rose-200 shadow-rose-900/20"
                            )}
                        >
                            <div className={cn("p-2 rounded-full", saveState.type === "ok" ? "bg-emerald-500/20" : "bg-rose-500/20")}>
                                {saveState.type === "ok" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                            </div>
                            <span className="font-bold tracking-wide text-sm">{saveState.message}</span>
                        </div>
                    </div>
                )}

                {toastMessage && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100]">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#1A1A20]/90 border border-indigo-500/30 text-indigo-100 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300">
                            <Sparkles size={16} className="text-indigo-400" />
                            <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
                        </div>
                    </div>
                )}

                <div className="mb-4 md:mb-5 empty:hidden">
                    {isProvider ? (
                        !isVerified && (
                            <div
                                ref={verificationCtaRef}
                                id="provider-verification-section"
                                tabIndex={-1}
                                className={cn(
                                    "relative isolate overflow-hidden rounded-[2rem] border bg-[#0B0B10] p-6 shadow-2xl outline-none transition-all duration-700 group md:p-8",
                                    verificationFocusActive
                                        ? "border-indigo-300/55 shadow-[0_22px_72px_rgba(79,70,229,0.2),0_0_0_1px_rgba(129,140,248,0.2)]"
                                        : "border-indigo-500/30 shadow-black/30"
                                )}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(79,70,229,0.16),transparent_42%,rgba(6,182,212,0.08)_78%,transparent)] pointer-events-none" />
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-40" />

                                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
                                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                                        <div
                                            className={cn(
                                                "absolute inset-0 rounded-full border border-indigo-300/15 transition-all duration-700",
                                                verificationFocusActive && "border-indigo-200/30 shadow-[0_0_32px_rgba(99,102,241,0.16)]"
                                            )}
                                        />
                                        <div
                                            className={cn(
                                                "absolute inset-2 rounded-full border border-white/10 transition-all duration-700",
                                                verificationFocusActive && "border-indigo-100/25"
                                            )}
                                        />
                                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[#15151A]/90 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                                            <div className="absolute inset-0 rounded-full border border-indigo-300/10 opacity-70" />
                                            <ShieldCheck size={36} className={cn("relative z-10 transition-colors duration-500", verificationFocusActive ? "text-indigo-200" : "text-indigo-400")} />
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-bold text-white tracking-tight">
                                                Basisverifizierung abschließen
                                            </h3>
                                        </div>
                                        <p className="text-slate-400 text-base font-medium leading-relaxed max-w-2xl">
                                            Um Jobs auszuschreiben und vollen Zugriff auf die Plattform zu erhalten, bestätigst du einmalig deine Wohnadresse.
                                        </p>
                                    </div>

                                    <div className="relative w-full md:w-auto">
                                        <button
                                            onClick={() => setShowVerificationModal(true)}
                                            className={cn(
                                                "relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-4 text-sm font-bold tracking-wide text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] md:w-auto group/btn",
                                                verificationFocusActive
                                                    ? "bg-[#5853F2] shadow-[0_16px_46px_rgba(79,70,229,0.32)]"
                                                    : "bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-900/20 hover:shadow-indigo-900/30"
                                            )}
                                        >
                                            <MapPin size={18} className="relative z-10 text-indigo-100 transition-colors" />
                                            <span className="relative z-10">Wohnadresse eingeben</span>
                                            <ArrowRight size={16} className="relative z-10 text-indigo-100 transition-transform group-hover/btn:translate-x-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        (() => {
                            const showGuardianBanner = profile.guardian_status !== "linked";

                            if (showGuardianBanner) {
                                return <GuardianBanner guardianStatus={profile.guardian_status || "none"} />;
                            }
                            return null;
                        })()
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    <div className="lg:col-span-4 lg:sticky lg:top-8 z-20 space-y-8">

                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[2.2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                            <div className="profile-card profile-id-card relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0A0A0C] shadow-2xl transition-transform duration-500 hover:scale-[1.005]">

                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-[1px]" />
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-black/40 border border-white/5" />

                                <div className="relative px-6 pt-8 pb-4 border-b border-white/[0.03]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-[#15151A] border border-white/5 flex items-center justify-center shadow-inner">
                                                <Building2 size={16} className="text-indigo-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-[0.25em] font-extrabold text-slate-500">Digital ID</span>
                                                <span className="text-[11px] font-mono text-indigo-400/80 tracking-wide">ID-{profile.id.substring(0, 8).toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-[#15151A] border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition-colors cursor-help" title={lastLogin ? `Letzter Login: ${new Date(lastLogin.created_at).toLocaleString("de-DE")}` : "Noch nie eingeloggt"}>
                                            <LockKeyhole size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 relative">
                                    <div className="flex flex-col items-center text-center mb-8">
                                        <div className="relative w-28 h-28 mb-5 group/avatar">
                                            <div className="absolute inset-0 rounded-full bg-indigo-500 blur-[40px] opacity-10 group-hover/avatar:opacity-20 transition-opacity duration-700" />

                                            <div className="relative w-full h-full rounded-full border-[3px] border-[#18181B] bg-[#121215] p-1 shadow-2xl">
                                                <div className="w-full h-full rounded-full bg-[#1A1A20] flex items-center justify-center overflow-hidden">
                                                    {profile.avatar_url ? (
                                                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-3xl font-black text-slate-700 select-none">
                                                            {profile.full_name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); showDevToast(); }}
                                                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#4F46E5] border-[3px] border-[#18181B] flex items-center justify-center text-white hover:bg-[#4338CA] transition-all shadow-lg z-20 hover:scale-110 active:scale-90"
                                                    title="Profilbild ändern"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{profile.full_name || "Unbekannt"}</h3>

                                        <div className="flex items-center justify-center gap-2">
                                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 flex items-center gap-1.5">
                                                <MapPin size={10} className="text-slate-400" />
                                                <span className="text-xs font-semibold text-slate-300">{profile.city || "Kein Ort"}</span>
                                            </div>

                                            {isStaff && (
                                                <StaffBadge />
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="rounded-2xl bg-[#121215] border border-white/[0.04] p-4 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-1">Status</span>
                                                {isProvider ? (
                                                    isVerified ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                                            <ShieldCheck size={14} /> Verifiziert
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                                                            <User size={14} /> Basis
                                                        </span>
                                                    )
                                                ) : (
                                                    profile.guardian_status === "linked" ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                                            <ShieldCheck size={14} /> Verifiziert
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                            <User size={14} /> Standard
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            <div className="h-8 w-px bg-white/5 mx-2" />
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-1">Rolle</span>
                                                <span className={cn("text-xs font-bold", isProvider ? "text-amber-500" : "text-sky-400")}>
                                                    {isProvider ? "ANBIETER" : "SUCHEND"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col items-center justify-center text-center gap-1 hover:bg-white/[0.02] transition-colors">
                                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                                                    <Calendar size={10} /> Seit
                                                </span>
                                                <span className="text-xs font-bold text-slate-300">
                                                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString("de-DE", { month: 'short', year: 'numeric' }) : "-"}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col items-center justify-center text-center gap-1 hover:bg-white/[0.02] transition-colors">
                                                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                                                    <Fingerprint size={10} /> Geboren
                                                </span>
                                                <span className="text-xs font-bold text-slate-300">
                                                    {profile.birthdate ? new Date(profile.birthdate).toLocaleDateString("de-DE") : "-"}
                                                </span>
                                            </div>
                                        </div>

                                        {!isProvider && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Users size={12} /> Erziehungsberechtigte
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowAddGuardianModal(true);
                                                        }}
                                                        className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5"
                                                        title="Weiteren Erziehungsberechtigten hinzufügen"
                                                    >
                                                        <Plus size={10} />
                                                    </button>
                                                </div>
                                                {guardiansList.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {guardiansList.map(g => (
                                                            <div key={g.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                                                                <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                                                                    {(g.full_name || "G").charAt(0)}
                                                                </div>
                                                                <div className="flex flex-1 flex-col overflow-hidden">
                                                                    <span className="text-[11px] text-slate-200 font-bold truncate leading-none mb-0.5">{g.full_name}</span>
                                                                    <span className="text-[9px] text-slate-600 truncate leading-none">{g.email}</span>
                                                                </div>
                                                                <ShieldCheck size={12} className="text-emerald-500" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-slate-600 italic px-1">
                                                        Keine verknüpft.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>



                        {wardsList.length > 0 && (
                            <div className="profile-card relative group overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0A0A0C] shadow-2xl p-6 hover:border-indigo-500/20 transition-colors">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner ring-1 ring-white/5">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-white tracking-tight">Erziehungsberechtigung</h4>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">Verknüpfte Kinder</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {wardsList.map(ward => (
                                        <button
                                            key={ward.id}
                                            onClick={showDevToast}
                                            className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left group/ward"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/20 group-hover/ward:border-indigo-500/40 transition-colors">
                                                {(ward.full_name || "K").charAt(0)}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-xs font-bold text-slate-200 truncate group-hover/ward:text-white transition-colors">{ward.full_name}</div>
                                                <div className="text-[10px] text-slate-500 truncate">{ward.email}</div>
                                            </div>
                                            <div className="text-emerald-500" title="Verifiziert">
                                                <ShieldCheck size={14} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-8 space-y-8 pb-12">

                        <div className="profile-card profile-edit-card rounded-[2.5rem] bg-[#0A0A0C] border border-white/[0.05] p-6 md:p-10 relative overflow-hidden shadow-2xl">
                            <div>
                                <div className="profile-card-header flex flex-col md:flex-row md:items-center gap-6 mb-10 pb-8 border-b border-white/[0.03]">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Persönliche Daten</h3>
                                    </div>
                                </div>

                                <div className="profile-form-grid space-y-6">
                                    <div className="profile-field-block profile-field-block-large space-y-3 group">
                                        <label className={`${profileFieldLabelClass} group-focus-within:text-indigo-400`}>
                                            {isProvider ? "Über uns" : "Über mich"}
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                rows={6}
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                placeholder={isProvider ? "Erzähle potenziellen Bewerbern, wer ihr seid und was euch ausmacht..." : "Erzähle etwas über dich, deine Interessen und was du suchst..."}
                                                className={profileTextareaClass}
                                            />
                                            <div className="profile-field-counter absolute bottom-1 right-1 text-[10px] font-bold tracking-wider text-slate-700">
                                                {bio.length} ZEICHEN
                                            </div>
                                        </div>
                                    </div>

                                    {!isProvider && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="profile-field-block space-y-3 group">
                                                <label className={`${profileFieldLabelWithIconClass} group-focus-within:text-indigo-400`}>
                                                    <Briefcase size={12} /> Skills
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        id="skills"
                                                        name="skills"
                                                        autoComplete="off"
                                                        value={skills}
                                                        onChange={(e) => setSkills(e.target.value)}
                                                        placeholder="Mathe, Englisch..."
                                                        className={profileInputClass}
                                                    />
                                                </div>
                                            </div>

                                            <div className="profile-field-block space-y-3 group">
                                                <label className={`${profileFieldLabelWithIconClass} group-focus-within:text-indigo-400`}>
                                                    <Sparkles size={12} /> Interessen
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        id="interests"
                                                        name="interests"
                                                        autoComplete="off"
                                                        value={interests}
                                                        onChange={(e) => setInterests(e.target.value)}
                                                        placeholder="Fußball, Gaming..."
                                                        className={profileInputClass}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="profile-field-block space-y-3 group">
                                        <label className={`${profileFieldLabelWithIconClass} group-focus-within:text-indigo-400`}>
                                            <Clock size={12} /> Zeitliche Verfügbarkeit
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="availabilityNote"
                                                name="availabilityNote"
                                                autoComplete="off"
                                                value={availabilityNote}
                                                onChange={(e) => setAvailabilityNote(e.target.value)}
                                                placeholder="z.B. Nachmittags ab 15 Uhr, Wochenenden..."
                                                className={profileInputClass}
                                            />
                                        </div>
                                    </div>

                                    {isProvider && !isProfileIncomplete && !isVerified && (
                                        <div className="mt-8 pt-8 border-t border-white/[0.03]">
                                            <div
                                                onClick={showDevToast}
                                                className="group/plus p-6 rounded-[2rem] bg-gradient-to-br from-[#0F0F12] to-[#0A0A0C] border border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer relative overflow-hidden shadow-lg hover:shadow-blue-900/10"
                                            >
                                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] group-hover/plus:opacity-100 transition-opacity" />

                                                <div className="relative z-10 flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner border border-blue-500/20">
                                                            <ShieldCheck size={28} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                                                JobBridge Plus <span className="text-[10px] uppercase tracking-wider bg-blue-500 text-white px-2 py-0.5 rounded-full font-black">NEU</span>
                                                            </h4>
                                                            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-sm mt-1">
                                                                Verdiene dir den <span className="text-blue-400 font-bold">blauen Haken</span> und mache JobBridge zu einem sicheren Ort.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover/plus:bg-blue-500 group-hover/plus:text-white transition-all transform group-hover/plus:rotate-90">
                                                        <ArrowRight size={20} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>

                        {!isProvider && (
                            <div id="location-section" className="profile-card profile-location-card rounded-[2.5rem] bg-[#0A0A0C] border border-white/[0.05] p-6 md:p-10 relative overflow-hidden shadow-2xl transition-all">
                                <div>
                                    <div className="profile-card-header flex flex-col md:flex-row md:items-center gap-6 mb-10 pb-8 border-b border-white/[0.03]">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Wohnort & Distanz</h3>
                                            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-400">
                                                Dein Wohnort wird nur zur Entfernungsberechnung für Jobs genutzt.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="profile-field-block space-y-3 group">
                                            <label className={`${profileFieldLabelWithIconClass} group-focus-within:text-indigo-400`}>
                                                <Search size={12} /> Adresse suchen
                                            </label>
                                            <div className="relative group/search z-20">
                                                <LocationAutocomplete
                                                    onSelect={handleLocationSelect}
                                                    placeholder="Straße und Ort eingeben..."
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        <div className="profile-location-fields grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/[0.03]">
                                            <div className="profile-field-block space-y-3 group">
                                                <label className={profileFieldLabelClass}>
                                                    Straße & Hausnummer
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        id="street"
                                                        name="street"
                                                        autoComplete="address-line1"
                                                        value={street}
                                                        onChange={(e) => setStreet(e.target.value)}
                                                        placeholder="Straße"
                                                        className={profileInputClass}
                                                    />
                                                    <input
                                                        id="houseNumber"
                                                        name="houseNumber"
                                                        autoComplete="address-line2"
                                                        value={houseNumber}
                                                        onChange={(e) => setHouseNumber(e.target.value)}
                                                        placeholder="Nr."
                                                        className={`${profileInputClass} w-[100px] sm:w-[120px] text-center`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="profile-field-block space-y-3 group">
                                                <label className={profileFieldLabelClass}>
                                                    PLZ & Ort
                                                </label>
                                                <div className="flex gap-2">
                                                    <div className="relative w-[130px] sm:w-[150px] group/zip flex-shrink-0">
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                                                            <LockKeyhole size={16} />
                                                        </div>
                                                        <input
                                                            id="zipDisplay"
                                                            name="zipDisplay"
                                                            autoComplete="postal-code"
                                                            value={zip}
                                                            disabled
                                                            title="Deine PLZ ist fest mit deinem Account verknüpft und kann nicht geändert werden."
                                                            className={profileLockedInputClass}
                                                        />
                                                    </div>
                                                    <div className="relative w-full group/city">
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                                                            <LockKeyhole size={16} />
                                                        </div>
                                                        <input
                                                            id="cityDisplay"
                                                            name="cityDisplay"
                                                            autoComplete="address-level2"
                                                            value={city}
                                                            disabled
                                                            title="Deine Stadt ist fest mit deinem Account verknüpft und kann nicht geändert werden."
                                                            className={`${profileLockedInputClass} pr-12`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>

            <UserProfileModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                isStaff={isStaff}
                profile={{
                    ...profile,
                    bio,
                    interests: isProvider ? null : interests,
                    skills: isProvider ? null : skills,
                    company_name: profile.company_name ?? null,
                    company_contact_email: profile.company_contact_email ?? null,
                    availability_note: availabilityNote,
                }}
                stats={{ jobsCompleted: 0, rating: 5.0 }}
            />

            <GuardianConsentModal
                isOpen={showAddGuardianModal}
                onClose={() => {
                    setShowAddGuardianModal(false);
                    refreshGuardians();
                }}
                variant="add"
            />

            <ProviderVerificationModal
                isOpen={showVerificationModal}
                onClose={() => setShowVerificationModal(false)}
                profileId={profile.id}
                onVerified={() => {
                    if (shouldReturnToJobCreator) {
                        window.location.assign("/app-home/offers/new");
                        return;
                    }

                    window.location.reload();
                }}
            />

        </section>
    );
}
