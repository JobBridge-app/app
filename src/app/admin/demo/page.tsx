import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export default async function AdminDemoPage() {
    const { session } = await requireCompleteProfile();
    const supabase = await supabaseServer();

    // Fetch current demo session
    let { data: demoSession } = await supabase
        .from("demo_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

    // Default values if no session exists yet
    const isEnabled = demoSession ? demoSession.enabled : false;
    const currentView = demoSession ? demoSession.demo_view : "job_seeker";

    // Action to toggle demo mode
    async function toggleDemo(formData: FormData) {
        "use server";
        const supabase = await supabaseServer();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const enable = formData.get("enable") === "true";
        const view = formData.get("view") as "job_seeker" | "job_provider";

        await supabase.from("demo_sessions").upsert({
            user_id: user.id,
            enabled: enable,
            demo_view: view,
            updated_at: new Date().toISOString()
        });

        revalidatePath("/admin/demo");
        revalidatePath("/app-home", 'layout');
        revalidatePath("/", 'layout');
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-8">Demo Mode Controls</h1>

            <div className={`p-6 rounded-2xl border ${isEnabled ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Status: {isEnabled ? <span className="text-green-400">ACTIVE</span> : <span className="text-slate-400">INACTIVE</span>}</h3>
                </div>

                <p className="text-slate-400 mb-6">
                    When active, your view will be restricted to Demo data. You can safely create jobs or applications without affecting the production database.
                </p>

                <form action={toggleDemo} className="space-y-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-300">Target View Role</label>
                        <select name="view" defaultValue={currentView} className="bg-slate-900 border border-white/20 rounded-lg p-2 text-white">
                            <option value="job_seeker">Job Seeker (Youth)</option>
                            <option value="job_provider">Job Provider (Company)</option>
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            name="enable"
                            value="true"
                            className={`px-6 py-2 rounded-lg font-bold transition ${isEnabled ? 'bg-slate-700 text-slate-300' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            Activate Demo
                        </button>
                        <button
                            type="submit"
                            name="enable"
                            value="false"
                            className={`px-6 py-2 rounded-lg font-bold transition ${!isEnabled ? 'bg-slate-700 text-slate-300' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        >
                            Deactivate
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 opacity-50 pointer-events-none">
                <h3 className="text-lg font-semibold text-white mb-2">Seed Demo Data</h3>
                <p className="text-sm text-slate-400">Reset demo tables with clean data (Coming Soon).</p>
            </div>
        </div>
    );
}
