"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { formatPaise } from "@/lib/utils";
import { Trophy, Flame, Swords, Medal, Crown } from "lucide-react";

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const res = await apiRequest<any[]>("/leaderboard?limit=50");
      if (res.success && res.data) {
        setRankings(res.data);
      }
      setLoading(false);
    };
    loadLeaderboard();
  }, []);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400">
          <Trophy className="h-4 w-4" />
          <span>DETERMINISTIC COMPETITIVE RANKINGS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
          Champions Leaderboard
        </h1>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          Rankings computed strictly from verified tournament match settlements and cash winnings
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      {rankings.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* #2 Silver */}
          <div className="sm:order-1 order-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center flex flex-col justify-between">
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-black text-sm mb-3">
                #2
              </div>
              <h3 className="font-extrabold text-white text-base truncate">{rankings[1].display_name}</h3>
              <span className="text-xs text-slate-400 font-mono block mt-0.5">{rankings[1].free_fire_name}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-xs text-slate-500 block">Winnings</span>
              <span className="text-lg font-black text-emerald-400">{rankings[1].total_winnings_formatted}</span>
              <span className="text-[11px] text-slate-400 block mt-1">{rankings[1].total_wins} Wins • {rankings[1].win_rate}% Win Rate</span>
            </div>
          </div>

          {/* #1 Gold */}
          <div className="sm:order-2 order-1 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center flex flex-col justify-between shadow-xl shadow-amber-950/20 sm:-translate-y-2">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-base mb-3">
                <Crown className="h-6 w-6 fill-amber-500 text-amber-500" />
              </div>
              <h3 className="font-black text-white text-lg truncate">{rankings[0].display_name}</h3>
              <span className="text-xs text-amber-400/90 font-mono block mt-0.5">{rankings[0].free_fire_name}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-500/20">
              <span className="text-xs text-slate-400 block">Total Cash Winnings</span>
              <span className="text-2xl font-black text-emerald-400">{rankings[0].total_winnings_formatted}</span>
              <span className="text-xs font-bold text-amber-400 block mt-1">{rankings[0].total_wins} Victories • {rankings[0].win_rate}% Win Rate</span>
            </div>
          </div>

          {/* #3 Bronze */}
          <div className="sm:order-3 order-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center flex flex-col justify-between">
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-black text-sm mb-3">
                #3
              </div>
              <h3 className="font-extrabold text-white text-base truncate">{rankings[2].display_name}</h3>
              <span className="text-xs text-slate-400 font-mono block mt-0.5">{rankings[2].free_fire_name}</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-xs text-slate-500 block">Winnings</span>
              <span className="text-lg font-black text-emerald-400">{rankings[2].total_winnings_formatted}</span>
              <span className="text-[11px] text-slate-400 block mt-1">{rankings[2].total_wins} Wins • {rankings[2].win_rate}% Win Rate</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="grid grid-cols-12 gap-2 p-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 bg-slate-950/80">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-6 sm:col-span-5">Competitor</div>
          <div className="col-span-4 sm:col-span-2 text-right sm:text-left">Matches</div>
          <div className="hidden sm:block sm:col-span-2 text-center">Win Rate</div>
          <div className="hidden sm:block sm:col-span-2 text-right">Winnings</div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : rankings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No completed matches have been recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {rankings.map((p) => (
              <div
                key={p.user_id}
                className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-slate-900/90 transition text-xs"
              >
                <div className="col-span-2 sm:col-span-1 text-center font-mono font-black text-slate-400">
                  #{p.rank}
                </div>
                <div className="col-span-6 sm:col-span-5">
                  <span className="font-extrabold text-white block">{p.display_name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{p.free_fire_uid} ({p.free_fire_name})</span>
                </div>
                <div className="col-span-4 sm:col-span-2 text-right sm:text-left font-mono">
                  <span className="font-bold text-slate-200">{p.total_matches}</span>
                  <span className="text-slate-500 text-[10px] block sm:inline sm:ml-1">
                    ({p.total_wins}W - {p.total_losses}L)
                  </span>
                </div>
                <div className="hidden sm:block sm:col-span-2 text-center font-mono font-bold text-slate-300">
                  {p.win_rate}%
                </div>
                <div className="hidden sm:block sm:col-span-2 text-right font-mono font-black text-emerald-400">
                  {p.total_winnings_formatted}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
