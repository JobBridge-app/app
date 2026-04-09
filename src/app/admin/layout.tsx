import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { MobileAdminNav } from "./components/MobileAdminNav";
import { getStaffIdentity } from "@/lib/data/adminDashboard";
import type { StaffRole } from "@/lib/data/adminTypes";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { session, systemRoles } = await requireCompleteProfile();
    const hasStaffRole = systemRoles.length > 0;

    if (!hasStaffRole) {
        redirect("/app-home");
    }

    const identity = await getStaffIdentity(session.user.id);
    const userFullName = identity.full_name;
    const userInitials = userFullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "ST";
    const highestRole = identity.highest_role as StaffRole;

    return (
        <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans text-slate-200">
            <AdminSidebar
                userFullName={userFullName}
                userInitials={userInitials}
                highestRole={highestRole}
            />

            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Admin Header & Nav */}
                <div className="md:hidden">
                    <MobileAdminNav highestRole={highestRole} />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {children}
                </div>
            </main>
        </div>
    );
}
