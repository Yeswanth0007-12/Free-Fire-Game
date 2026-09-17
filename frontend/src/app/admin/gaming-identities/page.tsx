"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Gamepad2, CheckCircle, XCircle, Search, RefreshCw, 
  AlertTriangle, ShieldCheck, Clock, User, Filter 
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminGamingIdentitiesPage() {
  const [identities, setIdentities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchIdentities = async () => {
    setLoading(true);
    try {
      const res = await api.getGamingIdentities({
        status: filterStatus === "ALL" ? undefined : filterStatus,
        limit: 100,
      });
      if (res.success && res.data) {
        setIdentities(Array.isArray(res.data) ? res.data : (res.data.identities || []));
      }
    } catch (err: any) {
      console.error(err);
      setMsg({ text: "Failed to fetch gaming identities", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentities();
  }, [filterStatus]);

  const handleVerify = async (identityId: string, status: "VERIFIED" | "REJECTED") => {
    const actionName = status === "VERIFIED" ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${actionName} this Free Fire identity?`)) return;

    setActionLoading(identityId);
    try {
      const res = await api.verifyGamingIdentity(identityId, status, `Reviewed by Admin via Control Panel`);
      if (res.success) {
        setMsg({ text: `Identity ${status.toLowerCase()} successfully`, type: "success" });
        fetchIdentities();
      } else {
        setMsg({ text: res.error?.message || "Verification failed", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to update identity", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredIdentities = identities.filter((i) => {
    return (
      (i.game_uid || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.in_game_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.user?.email || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-amber-500" /> Free Fire UID Verification Queue
          </h1>
          <p className="text-sm text-zinc-400">
            Verify player Free Fire UIDs, in-game nicknames, prevent duplicate account linking, and process change requests.
          </p>
        </div>
        <button
          onClick={fetchIdentities}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors self-start sm:self-auto"
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

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by Free Fire UID, Nickname, User Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "PENDING_VERIFICATION", "VERIFIED", "UID_CHANGE_REQUESTED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-white"
              }`}
            >
              {status.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Identity Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
            Loading gaming identity records...
          </div>
        ) : filteredIdentities.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            No gaming identities found matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Player Account</th>
                  <th className="py-3 px-4">Free Fire UID & IGN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredIdentities.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.user?.email || "Unknown User"}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{item.user_id}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-amber-400 font-mono text-sm">{item.game_uid}</div>
                      <div className="text-zinc-300 font-medium">{item.in_game_name}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === "VERIFIED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        item.status === "PENDING_VERIFICATION" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" :
                        item.status === "UID_CHANGE_REQUESTED" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        item.status === "REJECTED" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-zinc-800 text-zinc-400"
                      }`}>
                        {item.status === "VERIFIED" && <CheckCircle className="h-3 w-3" />}
                        {item.status === "PENDING_VERIFICATION" && <Clock className="h-3 w-3" />}
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-zinc-400">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      {item.status !== "VERIFIED" && (
                        <button
                          onClick={() => handleVerify(item.id, "VERIFIED")}
                          disabled={actionLoading === item.id}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          {actionLoading === item.id ? "Processing..." : "Approve UID"}
                        </button>
                      )}

                      {item.status !== "REJECTED" && (
                        <button
                          onClick={() => handleVerify(item.id, "REJECTED")}
                          disabled={actionLoading === item.id}
                          className="px-3 py-1 bg-zinc-800 hover:bg-red-950/60 hover:text-red-400 text-zinc-300 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
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
