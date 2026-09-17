"use client";

import { useState, useEffect } from "react";
import { 
  FileText, ShieldCheck, Search, RefreshCw, 
  Terminal, UserCheck, AlertCircle 
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminAuditLogs({ limit: 100 });
      if (res.success && res.data) {
        setLogs(Array.isArray(res.data) ? res.data : (res.data.logs || []));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    return (
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_type || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.email || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-500" /> Immutable Audit Trail
          </h1>
          <p className="text-sm text-zinc-400">
            Append-only system activity log recording privileged operator actions, financial adjustments, and lifecycle events.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl">
        <Search className="h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Filter logs by action (e.g. RESULT, DISPUTE, MATCH), user, or entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
            Reading audit stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            No audit records matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider font-sans">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Ref</th>
                  <th className="py-3 px-4">Audit Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {formatDate(l.created_at)}
                    </td>

                    <td className="py-3 px-4 text-zinc-300 font-sans">
                      <div className="font-semibold">{l.user?.email || "SYSTEM"}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{l.ip_address || "127.0.0.1"}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.action.includes("SETTLE") || l.action.includes("APPROVE") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        l.action.includes("CANCEL") || l.action.includes("REJECT") ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        l.action.includes("DISPUTE") ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-zinc-800 text-zinc-300 border border-zinc-700"
                      }`}>
                        {l.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-zinc-400">
                      <div>{l.entity_type}</div>
                      <div className="text-[10px] text-zinc-500">{l.entity_id?.slice(0, 8)}...</div>
                    </td>

                    <td className="py-3 px-4 text-zinc-400 max-w-sm truncate" title={JSON.stringify(l.details || {})}>
                      {JSON.stringify(l.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
