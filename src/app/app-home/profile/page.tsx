import { requireCompleteProfile } from "@/lib/auth";
import { GuardianBanner } from "@/components/profile/GuardianBanner";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function ProfilePage() {
    const { profile } = await requireCompleteProfile();
    const isYouth = profile.user_type === "youth";

    // Check Staff Role
    const supabase = await supabaseServer();
    const { data: roles } = await supabase.from("user_system_roles")
        .select("role_id, system_roles(name)")
        .eq("user_id", profile.id);

    const isStaff = roles && roles.length > 0;
    // @ts-ignore - Supabase join types can be tricky, simplified check
    const roleName = isStaff ? roles[0]?.system_roles?.name : null;


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-8">Dein Profil</h1>

            {isYouth && (
                <div className="mb-8">
                    <GuardianBanner isVerified={!!profile.is_verified} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Preview Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Vorschau</h3>
                        <div className="bg-white/10 border border-white/10 rounded-3xl p-6 text-center shadow-2xl backdrop-blur-md">
                            <div className="w-24 h-24 mx-auto rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl font-bold mb-4 ring-4 ring-white/5 relative">
                                {profile.full_name?.charAt(0).toUpperCase()}
                                {isStaff && (
                                    <div className="absolute -bottom-1 -right-1 bg-indigo-600 border-2 border-[#121217] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
                                        Staff
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                                {profile.full_name}
                                {profile.is_verified && <span className="text-emerald-500" title="Verifiziert">✓</span>}
                            </h2>
                            <p className="text-indigo-400 text-sm font-medium uppercase tracking-wider mb-4">{profile.user_type === 'company' ? 'Anbieter' : 'Jobsuchend'}</p>

                            <div className="flex items-center justify-center gap-2 text-slate-300 text-sm mb-6">
                                <span>📍 {profile.city}</span>
                            </div>

                            <div className="w-full h-px bg-white/10 mb-4" />
                            <p className="text-slate-400 text-sm italic">"Über mich Text erscheint hier..."</p>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2">
                    <ProfileEditForm profile={profile} />
                </div>
            </div>
        </div>
    );
}
