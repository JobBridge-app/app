import { requireCompleteProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "./AdminSidebar";
import { AdminGlobalSearch } from "./components/AdminGlobalSearch";
import { MobileAdminNav } from "./components/MobileAdminNav";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { systemRoles } = await requireCompleteProfile();
    const hasStaffRole = systemRoles.some((role) => ["admin", "moderator", "analyst"].includes(role));

    if (!hasStaffRole) {
        redirect("/app-home");
    }

    return (
        <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans text-slate-200">
            {/* New Icon Rail Sidebar */}
            <AdminSidebar />

            {/* Content */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Admin Header & Nav */}
                <div className="md:hidden">
                    <MobileAdminNav />
                </div>

                <div className="hidden md:flex items-center justify-end px-8 py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
                    <AdminGlobalSearch />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {children}
                </div>
            </main>
        </div>
    );
}
