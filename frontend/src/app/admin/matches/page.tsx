"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Trophy, Plus, Search, Filter, ShieldAlert, CheckCircle, 
  Clock, Users, AlertTriangle, ArrowRight, RefreshCw 
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await api.getMatches({ limit: 100 });
      if (res.success && res.data) {
        setMatches(res.data.matches || []);
      }
    } catch (err: any) {
      console.error(err);
      setMsg({ text: "Failed to load matches", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleCancelMatch = async (matchId: string) => {
    if (!confirm("Are you sure you want to cancel this match? If players have registered, entry fees will be refunded.")) {
      return;
    }
    setActionLoading(matchId);
    try {
      const res = await api.cancelMatch(matchId, "Cancelled by Admin via Admin Panel");
      if (res.success) {
        setMsg({ text: "Match cancelled and refunds processed successfully", type: "success" });
        fetchMatches();
      } else {
        setMsg({ text: res.error?.message || "Cancellation failed", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to cancel match", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredMatches = matches.filter((m) => {
    const matchesFilter = filterStatus === "ALL" || m.status === filterStatus;
    const matchesSearch = 
      m.public_match_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.map_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.game_mode?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Match Management
          </h1>
          <p className="text-sm text-zinc-400">
            Schedule, monitor, control match lifecycles, and trigger emergency cancellations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMatches}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/admin/matches/create"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-amber-500/10"
          >
            <Plus className="h-4 w-4" /> Create Match
          </Link>
        </div>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by match code, mode, map..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "SCHEDULED", "REGISTRATION_OPEN", "ROOM_READY", "IN_PROGRESS", "AWAITING_RESULT", "SETTLED", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-white"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Match Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
            Loading tournament records...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            No matches found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Code / Mode</th>
                  <th className="py-3 px-4">Map & Slots</th>
                  <th className="py-3 px-4">Entry / Prize</th>
                  <th className="py-3 px-4">Timing</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredMatches.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-amber-400 font-mono">{m.public_match_code}</div>
                      <div className="text-zinc-300 font-medium">{m.game_mode?.name || "Free Fire"}</div>
                      <div className="text-[10px] text-zinc-500">{m.match_format}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-zinc-200 font-medium">{m.map_name}</div>
                      <div className="text-zinc-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3 text-zinc-500" />
                        {m.current_players} / {m.max_players} Players
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-zinc-200 font-semibold">{formatPaise(m.entry_fee_minor)}</div>
                      <div className="text-emerald-400 text-[11px] font-bold mt-0.5">
                        Prize: {formatPaise(m.prize_pool_minor)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-zinc-300">
                      <div>Start: {formatDate(m.match_start_at)}</div>
                      <div className="text-zinc-500 text-[10px] mt-0.5">
                        Reg Closes: {formatDate(m.registration_close_at)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === "SETTLED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        m.status === "CANCELLED" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        m.status === "IN_PROGRESS" || m.status === "ROOM_READY" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse" :
                        m.status === "AWAITING_RESULT" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        "bg-zinc-800 text-zinc-300 border border-zinc-700"
                      }`}>
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        href={`/matches/${m.id}`}
                        target="_blank"
                        className="inline-block px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-medium transition-colors"
                      >
                        Public View
                      </Link>

                      {["AWAITING_RESULT", "RESULT_SUBMITTED", "UNDER_REVIEW"].includes(m.status) && (
                        <Link
                          href={`/admin/results`}
                          className="inline-block px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                        >
                          Verify Result
                        </Link>
                      )}

                      {!["SETTLED", "CANCELLED", "COMPLETED"].includes(m.status) && (
                        <button
                          onClick={() => handleCancelMatch(m.id)}
                          disabled={actionLoading === m.id}
                          className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          {actionLoading === m.id ? "Cancelling..." : "Cancel & Refund"}
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
