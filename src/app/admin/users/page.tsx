import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function AdminUsersPage() {
    await requireCompleteProfile();
    const supabase = await supabaseServer();

    // Fetch users (profiles)
    const { data: users } = await supabase.from("profiles").select("*").limit(20);

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-white mb-6">User Management</h1>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">City</th>
                            <th className="p-4">Type</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users?.map((u) => (
                            <tr key={u.id} className="hover:bg-white/5 transition">
                                <td className="p-4 text-white font-medium">{u.full_name}</td>
                                <td className="p-4 text-slate-400">{u.city}</td>
                                <td className="p-4 capitalize text-slate-300">{u.user_type}</td>
                                <td className="p-4 text-right">
                                    <button className="text-indigo-400 hover:text-indigo-300 text-sm">View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
