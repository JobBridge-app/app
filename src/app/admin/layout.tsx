import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Shield, ArrowLeft } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile, session } = await requireCompleteProfile();
    const user = session.user;

    // Check if user has admin role
    const supabase = await supabaseServer();
    const { data: roleData } = await supabase
        .from("user_system_roles")
        .select("role:system_roles(name)")
        .eq("user_id", user.id)
        .single();

    const hasRole = !!roleData; // Any system role qualifies as staff for now

    if (!hasRole) {
        redirect("/app-home");
    }

    return (
        <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans text-slate-200">
            {/* New Icon Rail Sidebar */}
            <AdminSidebar />

            {/* Content */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Admin Header (Visible only on small screens) */}
                <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-white/10">
                    <span className="font-bold text-white">JobBridge Admin</span>
                    <Link href="/app-home" className="text-sm text-slate-400">Exit</Link>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Optional: Breadcrumbs or Top Bar could go here */}
                    {children}
                </div>
            </main>
        </div>
    );
}
