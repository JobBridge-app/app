import { requireCompleteProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export default async function AdminRolesPage() {
    await requireCompleteProfile();
    const supabase = await supabaseServer();

    // Fetch users with roles
    // Raw query join
    const { data: users } = await supabase
        .from("user_system_roles")
        .select("user:profiles(id, full_name, email), role:system_roles(name)");

    // Fetch all roles
    const { data: allRoles } = await supabase.from("system_roles").select("*");

    return (
        <div className="max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">System Roles</h1>
                <button className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Add Role (Coming Soon)</button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users?.map((entry: any) => (
                            <tr key={`${entry.user.id}-${entry.role.name}`} className="hover:bg-white/5 transition">
                                <td className="p-4 text-white font-medium">{entry.user.full_name}</td>
                                <td className="p-4 text-slate-400">{entry.user.email}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-bold uppercase">
                                        {entry.role.name}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="text-slate-500 hover:text-white transition">Edit</button>
                                </td>
                            </tr>
                        ))}
                        {(!users || users.length === 0) && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">No staff roles assigned yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
