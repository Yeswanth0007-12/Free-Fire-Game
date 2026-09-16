"use client";

import { useState, useEffect } from "react";
import { 
  AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  RotateCcw, ShieldAlert, MessageSquare 
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDisputes({ limit: 50 });
      if (res.success && res.data) {
        setDisputes(res.data.disputes || []);
      }
    } catch (err: any) {
      console.error(err);
      setMsg({ text: "Failed to load dispute queue", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (disputeId: string, resolution: string, refundPlayer: boolean) => {
    const notes = prompt("Enter resolution notes / audit log details:");
    if (!notes) return;

    setActionLoading(disputeId);
    try {
      const res = await api.resolveDispute(disputeId, {
        resolution,
        resolution_notes: notes,
        refund_player: refundPlayer,
      });

      if (res.success) {
        setMsg({ text: `Dispute resolved as ${resolution}${refundPlayer ? " with refund credited" : ""}`, type: "success" });
        fetchDisputes();
      } else {
        setMsg({ text: res.error?.message || "Failed to resolve dispute", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Action failed", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Dispute Resolution Hub
          </h1>
          <p className="text-sm text-zinc-400">
            Player claims, match integrity investigations, and discretionary refund settlements.
          </p>
        </div>
        <button
          onClick={fetchDisputes}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/40 border-red-800/60 text-red-300"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Disputes Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
            Scanning dispute queue...
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
            No open disputes pending resolution.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Dispute ID / Date</th>
                  <th className="py-3 px-4">Player / Match Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Player Statement</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono text-zinc-300 font-medium">{d.id.slice(0, 8)}...</div>
                      <div className="text-[10px] text-zinc-500">{formatDate(d.created_at)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{d.user?.email || "Player"}</div>
                      <div className="text-[11px] font-mono text-amber-400">
                        Match #{d.match?.public_match_code || d.match_id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-medium text-zinc-300">
                        {d.dispute_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-zinc-300 truncate" title={d.description}>
                        {d.description}
                      </p>
                      {d.resolution_notes && (
                        <p className="text-[10px] text-emerald-400 mt-1 italic">
                          Res: {d.resolution_notes}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        d.status === "REJECTED" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                      }`}>
                        {d.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      {d.status === "OPEN" || d.status === "UNDER_REVIEW" ? (
                        <>
                          <button
                            onClick={() => handleResolve(d.id, "FAVOR_PLAYER", true)}
                            disabled={actionLoading === d.id}
                            className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            Favor Player & Refund
                          </button>
                          <button
                            onClick={() => handleResolve(d.id, "REJECTED", false)}
                            disabled={actionLoading === d.id}
                            className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-zinc-500 text-[11px] italic">Closed</span>
                      )}
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
