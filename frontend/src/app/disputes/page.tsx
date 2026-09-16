"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, PlusCircle, CheckCircle2, Clock, X, ShieldAlert } from "lucide-react";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [matchId, setMatchId] = useState("");
  const [disputeType, setDisputeType] = useState("RESULT");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadDisputes = async () => {
    setLoading(true);
    const res = await apiRequest<any[]>("/disputes");
    if (res.success && res.data) {
      setDisputes(res.data);
    }

    const matchesRes = await apiRequest<any[]>("/my-matches");
    if (matchesRes.success && matchesRes.data) {
      setMyMatches(matchesRes.data);
      if (matchesRes.data.length > 0 && !matchId) {
        setMatchId(matchesRes.data[0].id);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const res = await apiRequest("/disputes", {
      method: "POST",
      body: JSON.stringify({
        match_id: matchId,
        dispute_type: disputeType,
        description: description.trim(),
      }),
    });

    if (res.success) {
      setMessage({ type: "success", text: "Dispute opened successfully. An official admin will investigate." });
      setDescription("");
      await loadDisputes();
      setTimeout(() => {
        setIsModalOpen(false);
        setMessage(null);
      }, 1500);
    } else {
      setMessage({ type: "error", text: res.error?.message || "Failed to submit dispute" });
    }
    setSubmitting(false);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Dispute & Review Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            File structured contest inquiries for match results, room anomalies, or prize settlements
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow hover:bg-amber-500 transition"
        >
          <PlusCircle className="h-4 w-4" />
          File Match Dispute
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="font-bold text-lg text-white">No Active Disputes</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You currently have no open or resolved dispute tickets. If you encounter any match issue, file a ticket above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    {d.dispute_type}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Match Ref: {d.match_id.slice(0, 8)}</span>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    d.status === "RESOLVED_PLAYER"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : d.status === "OPEN"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {d.status.replace("_", " ")}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                &ldquo;{d.description}&rdquo;
              </p>

              {d.resolution_notes && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                  <strong className="text-emerald-400 block font-bold mb-0.5">Admin Resolution:</strong>
                  <span className="text-slate-300">{d.resolution_notes}</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 font-mono">
                Filed on {formatDate(d.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispute Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black uppercase text-white tracking-wider mb-1">
              Open Match Dispute
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Submit structured text details. Per V1 rules, no screenshot upload is required.
            </p>

            {message && (
              <div
                className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-xs font-semibold ${
                  message.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                }`}
              >
                {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleOpenDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select Contest Match
                </label>
                {myMatches.length === 0 ? (
                  <input
                    type="text"
                    required
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    placeholder="Enter Match UUID"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                ) : (
                  <select
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-white focus:border-amber-500 focus:outline-none"
                  >
                    {myMatches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.public_match_code} - {m.mode?.name || m.match_format} ({m.map_name})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Dispute Category
                </label>
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="RESULT">Match Result Discrepancy</option>
                  <option value="TEAM_ASSIGNMENT">Team Assignment Error</option>
                  <option value="MISSING_PRIZE">Missing Prize Distribution</option>
                  <option value="CANCELLATION">Unscheduled Cancellation</option>
                  <option value="TECHNICAL">Technical / Room Join Anomaly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain exactly what happened, including round counts, opponent Free Fire UIDs, or specific timeline..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-amber-600 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-amber-500 transition disabled:opacity-50"
              >
                {submitting ? "Filing Dispute..." : "Submit for Admin Investigation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
