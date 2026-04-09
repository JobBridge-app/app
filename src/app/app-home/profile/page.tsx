import { requireCompleteProfile } from "@/lib/auth";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { supabaseServer } from "@/lib/supabaseServer";

// Enforce strict type for the roles join
type UserRoleData = {
    role_id: string;
    system_roles: {
        name: string;
    } | null;
};

export default async function ProfilePage() {
    const { profile } = await requireCompleteProfile();
    const supabase = await supabaseServer();
    const [rolesResult, securityResult, redeemedInvitesResult] = await Promise.all([
        supabase
            .from("user_system_roles")
            .select(`
                role_id,
                system_roles (
                    name
                )
            `)
            .eq("user_id", profile.id),
        supabase
            .from("security_events")
            .select("*")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1),
        supabase
            .from("guardian_invitations")
            .select(`
                redeemed_by,
                guardian_profile:redeemed_by (
                    id,
                    full_name,
                    email
                )
            `)
            .eq("child_id", profile.id)
            .eq("status", "redeemed"),
    ]);

    const roles = (rolesResult.data ?? []) as unknown as UserRoleData[];
    const isStaff = roles.length > 0;
    const securityEvents = securityResult.data ?? [];
    const lastLogin = securityEvents.length > 0 ? securityEvents[0] : null;
    const redeemedInvites = redeemedInvitesResult.data ?? [];

    let guardians: Array<{ id: string; full_name: string | null; email: string | null }> = [];

    if (redeemedInvites && redeemedInvites.length > 0) {
        // Cast to any to avoid complex type mapping issues with joined data
        guardians = redeemedInvites.map((r: any) => r.guardian_profile).filter(Boolean);
    }
    return (
        <ProfileEditForm
            profile={profile}
            isStaff={isStaff}
            guardians={guardians}
            lastLogin={lastLogin}
        />
    );
}
