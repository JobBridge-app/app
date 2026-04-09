import { getRecentActivity } from "@/lib/data/adminDashboard";
import { Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireStaffSectionAccess } from "@/lib/data/adminAccess";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function parseOffset(value: string | string[] | undefined): number {
    if (!value || Array.isArray(value)) return 0;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    return parsed;
}

export default async function ActivityPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    await requireStaffSectionAccess("operations");
    const params = await searchParams;
    const limit = 25;
    const offset = parseOffset(params.offset);

    const { items, hasMore, error } = await getRecentActivity(limit, offset);
    const previousOffset = Math.max(0, offset - limit);
    const nextOffset = offset + limit;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Clock size={24} className="text-slate-400" />
                        Recent Activity
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Sorted by newest events from users, jobs, applications, reports and moderation logs.</p>
                </div>
                <Link
                    href="/staff"
                    className="text-sm text-slate-300 hover:text-white bg-white/5 border border-white/10 px-3 py-2 rounded-lg"
                >
                    Back to dashboard
                </Link>
            </div>

            {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                    <p className="text-sm text-rose-200">{error}</p>
                </div>
            )}

            <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
                <div className="divide-y divide-white/5">
                    {items.length === 0 ? (
                        <p className="px-6 py-8 text-sm text-slate-500">No activity found.</p>
                    ) : (
                        items.map((item, index) => (
                            <Link
                                key={`${item.type}-${item.entityId}-${index}`}
                                href={item.href}
                                className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-white/5 transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-medium text-slate-100">{item.title}</p>
                                    {item.subtitle && <p className="text-xs text-slate-400 mt-1">{item.subtitle}</p>}
                                </div>
                                <p className="text-xs text-slate-500 shrink-0">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                            </Link>
                        ))
                    )}
                </div>
                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span>Showing {offset + 1}-{offset + items.length}</span>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/staff/activity?offset=${previousOffset}`}
                            className={`px-3 py-1 rounded border ${offset === 0
                                ? "border-white/5 text-slate-600 pointer-events-none"
                                : "border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            Previous
                        </Link>
                        <Link
                            href={`/staff/activity?offset=${nextOffset}`}
                            className={`px-3 py-1 rounded border ${hasMore
                                ? "border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                                : "border-white/5 text-slate-600 pointer-events-none"
                                }`}
                        >
                            Next
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
