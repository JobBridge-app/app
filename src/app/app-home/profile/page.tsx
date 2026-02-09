import { requireCompleteProfile } from "@/lib/auth";
import { GuardianBanner } from "@/components/profile/GuardianBanner";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { AddGuardianButton } from "@/components/profile/AddGuardianButton";
import { supabaseServer } from "@/lib/supabaseServer";
import { Clock3, Mail, ShieldCheck } from "lucide-react";

// Enforce strict type for the roles join
type UserRoleData = {
    role_id: string;
    system_roles: {
        name: string;
    } | null;
};

export default async function ProfilePage() {
    const { profile, session } = await requireCompleteProfile();
    const supabase = await supabaseServer();
    const displayName = profile.full_name?.trim() || "Nicht hinterlegt";

    // 1. Fetch Staff Roles
    // We explicitly cast the result or use a known type to avoid 'any'
    const { data: rolesData } = await supabase
        .from("user_system_roles")
        .select(`
            role_id,
            system_roles (
                name
            )
        `)
        .eq("user_id", profile.id);

    // Manual type assertion / mapping because join types are complex
    const roles = rolesData as unknown as UserRoleData[];
    const isStaff = roles && roles.length > 0;

    // 2. Fetch Security Events (Last Login)
    const { data: securityEvents } = await supabase
        .from("security_events")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1);

    const lastLogin = securityEvents && securityEvents.length > 0 ? securityEvents[0] : null;

    // 3. Prepare display data
    const locationDisplay = profile.city?.trim() || "Kein Ort festgelegt";
    const accountLabel = profile.account_type === "job_provider" ? "Jobanbieter" : "Jobsuchend";
    const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString("de-DE") : "-";
    const lastLoginDisplay = lastLogin ? new Date(lastLogin.created_at).toLocaleString("de-DE") : "Noch kein Login protokolliert";
    const profileEmail = profile.email?.trim() || session.user.email || "Keine E-Mail hinterlegt";

    const isVerifiedBadge =
        profile.account_type === "job_provider"
            ? profile.provider_verification_status === "verified" || Boolean(profile.provider_verified_at)
            : profile.guardian_status === "linked";

    const statusLabel =
        profile.account_type === "job_provider"
            ? (isVerifiedBadge ? "Geprüfter Anbieter" : (profile.provider_verification_status === "pending" ? "Prüfung läuft" : "Noch nicht geprüft"))
            : (profile.guardian_status === "linked"
                ? "Eltern bestätigt"
                : (profile.guardian_status === "pending" ? "Bestätigung ausstehend" : "Bestätigung erforderlich"));

    // 4. Fetch Guardian Profiles via Relationships
    // Note: We use a raw select and cast because types might not yet reflect the new table
    let guardians: Array<{ id: string; full_name: string | null; email: string | null }> = [];

    // First try the new relationship table
    const { data: relationships, error: relError } = await supabase
        .from("guardian_relationships" as any)
        .select(`
            guardian_id,
            guardian:profiles!guardian_id (
                id,
                full_name,
                email
            )
        `)
        .eq("child_id", profile.id);

    if (!relError && relationships && relationships.length > 0) {
        guardians = relationships.map((r: any) => r.guardian).filter(Boolean);
    } else if (profile.guardian_id) {
        // Fallback to legacy single guardian_id column if table empty or error
        const { data: legacyGuardian } = await supabase
            .from("profiles")
            .select("full_name, id, email")
            .eq("id", profile.guardian_id)
            .single();
        if (legacyGuardian) {
            guardians.push(legacyGuardian);
        }
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 md:px-6">
            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Kontoübersicht</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Dein Profil</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                    Alle wichtigen Daten auf einen Blick. Klar strukturiert und leicht verständlich.
                </p>
            </div>

            {profile.account_type === "job_seeker" && (
                <div className="mb-8">
                    <GuardianBanner guardianStatus={profile.guardian_status ?? "none"} />
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
                {/* Left Column: Public Profile Preview & Stats (4 columns) */}
                <div className="flex flex-col gap-6 lg:col-span-4">
                    {/* Access Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121217] p-6 shadow-xl">
                        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-indigo-500" />

                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-200 ring-4 ring-[#1A1A23]">
                                    {displayName.charAt(0).toUpperCase() || "?"}
                                </div>
                                {isStaff && (
                                    <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#121217]">
                                        STAFF
                                    </div>
                                )}
                            </div>

                            <h2 className="text-xl font-bold text-white mb-1">
                                {displayName}
                            </h2>
                            <p className="text-sm text-slate-400 mb-4 capitalize">
                                {accountLabel}
                            </p>

                            <div className="mt-2 w-full text-left">
                                <div className="flex items-center justify-between border-t border-white/5 py-2.5 text-sm">
                                    <span className="text-slate-500">Status</span>
                                    <span
                                        className={isVerifiedBadge
                                            ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300"
                                            : "rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300"}
                                    >
                                        {statusLabel}
                                    </span>
                                </div>

                                {guardians.length > 0 && (
                                    <div className="border-t border-white/5 py-2.5">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-500">Erziehungsberechtigte</span>
                                            <AddGuardianButton />
                                        </div>
                                        <div className="space-y-2">
                                            {guardians.map((g) => (
                                                <div key={g.id} className="flex items-center gap-2 bg-white/5 p-1.5 rounded-lg border border-white/5">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                        {(g.full_name || "G").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-300 font-medium truncate" title={g.full_name || ""}>
                                                        {g.full_name || "Unbekannt"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between border-t border-white/5 py-2.5 text-sm">
                                    <span className="text-slate-500">Standort</span>
                                    <span className="truncate text-slate-300 max-w-[140px]" title={locationDisplay}>
                                        {locationDisplay}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-white/5 py-2.5 text-sm">
                                    <span className="text-slate-500">Mitglied seit</span>
                                    <span className="text-slate-300">
                                        {memberSince}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-[#121217] p-6 shadow-xl">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Sicherheit</h3>
                        <div className="space-y-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                                <p className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                                    <Mail size={13} />
                                    E-Mail
                                </p>
                                <p className="truncate text-slate-200">{profileEmail}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                                <p className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                                    <Clock3 size={13} />
                                    Letzter Login
                                </p>
                                <p className="text-slate-200">{lastLoginDisplay}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/90">
                                <p className="flex items-center gap-2 font-medium">
                                    <ShieldCheck size={13} />
                                    Sicherheitsinfos werden automatisch aus deinem Konto übernommen.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Profile details (8 columns) */}
                <div className="flex lg:col-span-8">
                    <ProfileEditForm profile={profile} className="w-full" />
                </div>
            </div>
        </div>
    );
}
