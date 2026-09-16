"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, AlertTriangle, Search, RefreshCw, 
  CheckCircle, UserX, ShieldCheck 
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminRiskFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminRiskFlags({ limit: 50 });
      if (res.success && res.data) {
        setFlags(res.data.flags || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" /> Fraud & Risk Telemetry
          </h1>
          <p className="text-sm text-zinc-400">
            Heuristic fraud triggers: duplicate Free Fire UIDs, abnormal joining velocities, and suspicious transaction spikes.
          </p>
        </div>
        <button
          onClick={fetchFlags}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
            Analyzing risk patterns...
          </div>
        ) : flags.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
            No active risk flags or anomalies recorded. System integrity optimal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Detected At</th>
                  <th className="py-3 px-4">Flag Type</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Telemetry Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {flags.map((f) => (
                  <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {formatDate(f.created_at)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-white">{f.flag_type}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-400">
                      {f.user_id ? `${f.user_id.slice(0, 8)}...` : "System"}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.severity === "HIGH" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        f.severity === "MEDIUM" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {f.severity || "MEDIUM"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-zinc-400 max-w-sm truncate" title={JSON.stringify(f.details || {})}>
                      {JSON.stringify(f.details || {})}
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
