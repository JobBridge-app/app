import { requireCompleteProfile } from "@/lib/auth";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type GuardianDisplay = {
    id: string;
    full_name: string | null;
    email: string | null;
};

export default async function ProfilePage() {
    const { profile, session, systemRoles } = await requireCompleteProfile();
    let guardians: GuardianDisplay[] = [];

    try {
        // This server-only lookup is intentionally scoped to the signed-in child.
        // Browser profile policies remain own-row-only.
        const admin = getSupabaseAdminClient();
        const { data, error } = await admin
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
            .eq("status", "redeemed");

        if (error) {
            console.error("Guardian profile lookup failed:", error.message);
        } else {
            guardians = (data ?? [])
                .map((row: any) => {
                    const joined = Array.isArray(row.guardian_profile)
                        ? row.guardian_profile[0]
                        : row.guardian_profile;
                    return joined ? {
                        id: joined.id,
                        full_name: joined.full_name,
                        email: joined.email,
                    } : null;
                })
                .filter((guardian: GuardianDisplay | null): guardian is GuardianDisplay => Boolean(guardian));
        }
    } catch (error) {
        console.error("Guardian profile lookup unavailable:", error);
    }

    const lastSignInAt = session.user.last_sign_in_at;

    return (
        <ProfileEditForm
            profile={profile}
            isStaff={systemRoles.length > 0}
            guardians={guardians}
            lastLogin={lastSignInAt ? { created_at: lastSignInAt } : null}
        />
    );
}
