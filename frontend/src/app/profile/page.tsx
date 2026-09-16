"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";
import { User, Gamepad2, Trophy, Flame, Swords, CheckCircle2, AlertCircle, Save } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const profile = user?.profile;

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [ffUid, setFfUid] = useState(profile?.free_fire_uid || "");
  const [ffName, setFfName] = useState(profile?.free_fire_name || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await apiRequest("/me/profile", {
      method: "PATCH",
      body: JSON.stringify({
        display_name: displayName.trim(),
        free_fire_uid: ffUid.trim(),
        free_fire_name: ffName.trim(),
      }),
    });

    if (res.success) {
      await refreshUser();
      setMessage({ type: "success", text: "Player profile and Free Fire UID updated successfully!" });
    } else {
      setMessage({ type: "error", text: res.error?.message || "Failed to update profile" });
    }
    setLoading(false);
  };

  const winRate = profile && profile.total_matches > 0
    ? Math.round((profile.total_wins / profile.total_matches) * 100)
    : 0;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          Competitor Profile & Free Fire UID
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your linked in-game credentials and track career tournament records
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Career Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Career Matches</span>
          <span className="text-2xl font-black text-white mt-1 block">{profile?.total_matches || 0}</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Victories</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{profile?.total_wins || 0}</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Win Rate</span>
          <span className="text-2xl font-black text-white mt-1 block">{winRate}%</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Winnings</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {profile ? formatPaise(profile.total_winnings_minor) : "₹0.00"}
          </span>
        </div>
      </div>

      {/* Linked Credentials Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-sm">
        <h2 className="text-lg font-black uppercase text-white tracking-wider mb-2 flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-emerald-400" />
          Linked Free Fire Account
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Your in-game UID is verified by tournament hosts when you join custom rooms.
        </p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Display Name (Platform)
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email (Account ID)
              </label>
              <input
                type="text"
                disabled
                value={user?.email || ""}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                Free Fire UID (Numeric ID)
              </label>
              <input
                type="text"
                required
                value={ffUid}
                onChange={(e) => setFfUid(e.target.value)}
                placeholder="e.g. 194820194"
                className="w-full rounded-lg border border-emerald-500/40 bg-slate-950 px-3.5 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                In-Game Nickname
              </label>
              <input
                type="text"
                required
                value={ffName}
                onChange={(e) => setFfName(e.target.value)}
                placeholder="Exact IGN"
                className="w-full rounded-lg border border-emerald-500/40 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
