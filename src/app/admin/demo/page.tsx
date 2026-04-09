import { supabaseServer } from "@/lib/supabaseServer";
import { TestOverrideControl } from "../components/TestOverrideControl";
import { Database, Zap, RefreshCw, AlertTriangle } from "lucide-react";
import { deactivateDemoMode, setDemoMode } from "../actions";
import { revalidatePath } from "next/cache";
import { requireStaffSectionAccess } from "@/lib/data/adminAccess";

export default async function DemoModePage() {
    const { session } = await requireStaffSectionAccess("system");
    const supabase = await supabaseServer();

    // Fetch current demo status
    const { data: demoSession } = await supabase
        .from("demo_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

    // Fetch active override
    const { data: activeOverride } = await (supabase.from("role_overrides" as never)
        .select("view_as, expires_at")
        .eq("user_id", session.user.id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle());

    async function activateJobSeekerDemo() {
        "use server";
        await setDemoMode("job_seeker");
        revalidatePath("/staff/demo");
    }

    async function activateJobProviderDemo() {
        "use server";
        await setDemoMode("job_provider");
        revalidatePath("/staff/demo");
    }

    async function disableDemo() {
        "use server";
        await deactivateDemoMode();
        revalidatePath("/staff/demo");
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Database className="text-indigo-500" />
                    Demo & Developer Tools
                </h1>
                <p className="text-slate-400 mt-2">Manage your session state and test data.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Role Overrides */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Role Overrides</h3>
                    <TestOverrideControl userId={session.user.id} activeOverride={activeOverride} />
                </div>

                {/* Demo Mode Toggle */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Zap className={demoSession?.enabled ? "text-yellow-400" : "text-slate-500"} size={20} />
                        Demo Session
                    </h3>
                    <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Current status</p>
                        <p className="text-sm mt-1 text-white">
                            {demoSession?.enabled
                                ? `ACTIVE (${demoSession.demo_view === "job_provider" ? "Job Provider" : "Job Seeker"})`
                                : "INACTIVE"}
                        </p>
                    </div>

                    <p className="text-sm text-slate-400 mb-4">
                        Demo mode only switches application behavior to demo tables. Staff dashboard metrics remain live.
                    </p>

                    <div className="space-y-2">
                        <form action={activateJobSeekerDemo}>
                            <button
                                type="submit"
                                className={`w-full py-3 px-4 rounded-xl font-medium transition-all border ${demoSession?.enabled && demoSession.demo_view === "job_seeker"
                                    ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                                    }`}
                            >
                                Aktiviere Jobsuche Demo
                            </button>
                        </form>
                        <form action={activateJobProviderDemo}>
                            <button
                                type="submit"
                                className={`w-full py-3 px-4 rounded-xl font-medium transition-all border ${demoSession?.enabled && demoSession.demo_view === "job_provider"
                                    ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                                    }`}
                            >
                                Aktiviere Jobanbieter Demo
                            </button>
                        </form>
                        <form action={disableDemo}>
                            <button
                                type="submit"
                                className="w-full py-3 px-4 rounded-xl font-medium transition-all border bg-rose-500/10 text-rose-200 border-rose-500/20 hover:bg-rose-500/20"
                            >
                                Deaktivieren
                            </button>
                        </form>
                    </div>
                </div>

                {/* Data Seeding */}
                <div className="md:col-span-2 bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <RefreshCw className="text-blue-400" size={20} />
                        Data Management
                    </h3>

                    <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl mb-6">
                        <AlertTriangle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                        <div className="space-y-1">
                            <p className="text-sm text-blue-200 font-medium">Safe Seeding</p>
                            <p className="text-xs text-blue-400/80">
                                This will populate `demo_jobs` and `demo_applications` with test data.
                                It does NOT affect live tables.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled
                        className="bg-slate-700/40 text-slate-400 px-4 py-2 rounded-lg text-sm font-medium border border-white/10 cursor-not-allowed"
                    >
                        Seed Demo Data (Disabled)
                    </button>
                </div>
            </div>
        </div>
    );
}
