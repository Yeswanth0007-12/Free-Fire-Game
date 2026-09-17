"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, CheckCircle, XCircle, AlertTriangle, 
  Coins, Users, ShieldAlert, ArrowRight, RefreshCw, Check 
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPaise } from "@/lib/utils";

export default function AdminResultsPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [matchDetails, setMatchDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Result submission state
  const [winningTeamId, setWinningTeamId] = useState<string>("");
  const [winningUserId, setWinningUserId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const fetchEligibleMatches = async () => {
    setLoading(true);
    try {
      const res = await api.getMatches({ limit: 50 });
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data.matches || []);
        // Filter matches that are in result stages or live
        const eligible = rawList.filter((m: any) =>
          ["IN_PROGRESS", "AWAITING_RESULT", "RESULT_SUBMITTED", "UNDER_REVIEW"].includes(m.status)
        );
        setMatches(eligible);
        if (eligible.length > 0 && !selectedMatch) {
          loadMatch(eligible[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMatch = async (m: any) => {
    setSelectedMatch(m);
    setDetailsLoading(true);
    try {
      const res = await api.getMatch(m.id);
      if (res.success && res.data) {
        setMatchDetails(res.data);
        // Pre-select winning team if teams exist
        if (res.data.teams && res.data.teams.length > 0) {
          setWinningTeamId(res.data.teams[0].id);
        }
        if (res.data.registrations && res.data.registrations.length > 0) {
          setWinningUserId(res.data.registrations[0].user_id);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleMatches();
  }, []);

  const handleSubmitResult = async () => {
    if (!selectedMatch) return;
    setActionLoading(true);
    setMsg(null);

    try {
      const payload: any = {
        notes: notes || "Structured result submitted by Host/Admin",
        placement_results: [],
      };

      if (winningTeamId) {
        payload.winning_team_id = winningTeamId;
      }
      if (winningUserId) {
        payload.winning_user_id = winningUserId;
      }

      // Build structured placement results from registrations
      if (matchDetails?.registrations) {
        payload.placement_results = matchDetails.registrations.map((reg: any) => {
          const isWinner = reg.user_id === winningUserId;
          return {
            user_id: reg.user_id,
            team_id: reg.team_id,
            placement: isWinner ? 1 : 2,
            kills: 0,
            score: isWinner ? 100 : 50,
            payout_paise: isWinner ? selectedMatch.prize_pool_minor : 0,
          };
        });
      }

      const res = await api.submitMatchResult(selectedMatch.id, payload);
      if (res.success) {
        setMsg({ text: "Match result submitted successfully. You can now verify and approve it.", type: "success" });
        loadMatch(selectedMatch);
        fetchEligibleMatches();
      } else {
        setMsg({ text: res.error?.message || "Result submission failed", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to submit result", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveResult = async () => {
    if (!selectedMatch) return;
    if (!confirm(`Confirm approval? This will atomically settle ${formatPaise(selectedMatch.prize_pool_minor)} into winner wallet(s).`)) {
      return;
    }
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await api.approveMatchResult(selectedMatch.id);
      if (res.success) {
        setMsg({ text: `Result approved & ${formatPaise(selectedMatch.prize_pool_minor)} settled into winner wallet!`, type: "success" });
        fetchEligibleMatches();
        setSelectedMatch(null);
        setMatchDetails(null);
      } else {
        setMsg({ text: res.error?.message || "Settlement failed", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Approval failed", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectResult = async () => {
    if (!selectedMatch) return;
    const reason = prompt("Enter reason for result rejection:");
    if (!reason) return;

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await api.rejectMatchResult(selectedMatch.id, reason);
      if (res.success) {
        setMsg({ text: "Result rejected. Match status returned to AWAITING_RESULT.", type: "success" });
        loadMatch(selectedMatch);
      } else {
        setMsg({ text: res.error?.message || "Rejection failed", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Rejection failed", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-500" /> Result Verification & Prize Settlement
          </h1>
          <p className="text-sm text-zinc-400">
            Structured result entry, host outcome audits, and atomic wallet prize settlement.
          </p>
        </div>
        <button
          onClick={fetchEligibleMatches}
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

      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
          Loading pending tournament queues...
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-400">
          <Trophy className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Matches Awaiting Result</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
            Matches currently in progress or awaiting verification will automatically appear here for review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Match Queue */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Pending Queue ({matches.length})
            </h3>

            <div className="space-y-2">
              {matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => loadMatch(m)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedMatch?.id === m.id
                      ? "bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/40"
                      : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {m.public_match_code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      m.status === "RESULT_SUBMITTED" ? "bg-purple-500/20 text-purple-300" :
                      m.status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-300" :
                      "bg-zinc-800 text-zinc-400"
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-white mt-1">
                    {m.game_mode?.name || "Free Fire"} • {m.map_name}
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                    <span>{m.current_players} / {m.max_players} Players</span>
                    <span className="text-emerald-400 font-bold">{formatPaise(m.prize_pool_minor)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column (Span 2): Structured Result & Verification Screen */}
          <div className="lg:col-span-2 space-y-6">
            {detailsLoading || !matchDetails ? (
              <div className="py-20 text-center text-zinc-500 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                Loading match rosters and result context...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Match Summary Bar */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">
                          {matchDetails.public_match_code}
                        </span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-300 font-medium">{matchDetails.game_mode?.name}</span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1">
                        Map: {matchDetails.map_name}
                      </h2>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Total Prize Settlement</div>
                      <div className="text-xl font-black text-emerald-400">
                        {formatPaise(matchDetails.prize_pool_minor)}
                      </div>
                    </div>
                  </div>

                  {/* Registered Roster */}
                  <div className="mt-4 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-zinc-500" /> Competing Roster ({matchDetails.registrations?.length || 0})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchDetails.registrations?.map((reg: any) => (
                        <div
                          key={reg.id}
                          className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">
                              {reg.player_profile?.display_name || "Player"}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              UID: {reg.player_profile?.free_fire_uid || "N/A"}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded text-[10px]">
                            Slot #{reg.slot_number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Structured Result Form / Approval */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" /> Structured Result & Payout Decision
                  </h3>

                  {matchDetails.status === "AWAITING_RESULT" || matchDetails.status === "IN_PROGRESS" ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                        No screenshots are uploaded by players. As Host/Admin, select the verified winner to record official match rankings.
                      </div>

                      {matchDetails.teams && matchDetails.teams.length > 0 ? (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Select Winning Team
                          </label>
                          <select
                            value={winningTeamId}
                            onChange={(e) => setWinningTeamId(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                          >
                            {matchDetails.teams.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name} (Slot {t.slot_number})</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Select Winner (Solo / 1v1)
                          </label>
                          <select
                            value={winningUserId}
                            onChange={(e) => setWinningUserId(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                          >
                            {matchDetails.registrations?.map((r: any) => (
                              <option key={r.user_id} value={r.user_id}>
                                {r.player_profile?.display_name || "Player"} (UID: {r.player_profile?.free_fire_uid})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Host Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Clean match, Final score 4-2"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        onClick={handleSubmitResult}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50"
                      >
                        {actionLoading ? "Submitting Result..." : "Submit Structured Result"}
                      </button>
                    </div>
                  ) : (
                    /* Match is in RESULT_SUBMITTED or UNDER_REVIEW */
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-950/40 border border-purple-800/40 rounded-xl space-y-2">
                        <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                          Result Awaiting Final Verification
                        </div>
                        <p className="text-sm text-zinc-300">
                          Reviewing submitted result. Approving will permanently execute atomic ledger settlement of{" "}
                          <span className="font-bold text-emerald-400">
                            {formatPaise(matchDetails.prize_pool_minor)}
                          </span>{" "}
                          into the winner's wallet.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={handleApproveResult}
                          disabled={actionLoading}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {actionLoading ? "Settling..." : "Approve & Settle Prize"}
                        </button>

                        <button
                          onClick={handleRejectResult}
                          disabled={actionLoading}
                          className="px-5 py-3 bg-zinc-800 hover:bg-red-950/40 text-red-400 border border-zinc-700 hover:border-red-800 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          Reject Result
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
