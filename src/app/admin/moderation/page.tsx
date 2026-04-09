import { getAdminReport, getAdminReports } from "@/lib/data/adminModeration";
import { Flag, X } from "lucide-react";
import Link from "next/link";
import { requireStaffSectionAccess } from "@/lib/data/adminAccess";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function readString(value: string | string[] | undefined) {
    return typeof value === "string" ? value : "";
}

export default async function ModerationPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    await requireStaffSectionAccess("operations");
    const params = await searchParams;
    const reportId = readString(params.reportId);
    const { items: reports, error } = await getAdminReports({ limit: 100 });
    const selectedReportResult = reportId ? await getAdminReport(reportId) : { item: null, error: null };
    const selectedReport = selectedReportResult.item;
    const selectedError = selectedReportResult.error;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Flag className="text-amber-300" size={24} />
                    Moderation Queue
                </h1>
                <p className="text-slate-400 mt-1">Open and recent reports from the live system.</p>
            </div>

            {(error || selectedError) && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                    <p className="text-sm text-rose-200">{error || selectedError}</p>
                </div>
            )}

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/80 border-b border-white/5 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Target</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reporter</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-200">{report.reason_code}</p>
                                        {report.details && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{report.details}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">{report.target_type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium capitalize border ${report.status === "open"
                                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                            : "bg-slate-500/10 text-slate-300 border-slate-500/20"
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">{report.reporter_name || "Unknown"}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/staff/moderation?reportId=${report.id}`}
                                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline"
                                        >
                                            Open
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No reports found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedReport && (
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Report {selectedReport.id}</h2>
                            <p className="text-sm text-slate-400 mt-1">Target: {selectedReport.target_type} / {selectedReport.target_id}</p>
                        </div>
                        <Link
                            href="/staff/moderation"
                            className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white border border-white/10 rounded-lg px-2 py-1"
                        >
                            <X size={12} />
                            Close
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2">
                            <p className="text-xs uppercase tracking-wider text-slate-500">Report detail</p>
                            <p className="text-sm text-slate-200"><span className="text-slate-500">Reason:</span> {selectedReport.reason_code}</p>
                            <p className="text-sm text-slate-200"><span className="text-slate-500">Status:</span> {selectedReport.status}</p>
                            <p className="text-sm text-slate-200"><span className="text-slate-500">Created:</span> {new Date(selectedReport.created_at).toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2">
                            <p className="text-xs uppercase tracking-wider text-slate-500">Context</p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedReport.details || "No details provided."}</p>
                            <p className="text-sm text-slate-300">
                                Reporter: {selectedReport.reporter_name || "Unknown"} ({selectedReport.reporter_user_id})
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
