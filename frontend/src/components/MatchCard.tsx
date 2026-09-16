"use client";

import React from "react";
import Link from "next/link";
import { Users, Trophy, Coins, MapPin, Swords } from "lucide-react";
import MatchCountdown from "./MatchCountdown";
import { formatPaise } from "@/lib/utils";

export interface MatchCardData {
  id: string;
  public_match_code: string;
  map_name: string;
  match_format: string;
  entry_fee_minor: number;
  prize_pool_minor: number;
  max_players: number;
  current_players: number;
  match_start_at: string;
  room_release_at: string;
  registration_close_at: string;
  status: string;
  is_registered?: boolean;
  mode?: {
    name: string;
    slug: string;
    format: string;
  };
}

export default function MatchCard({ match }: { match: MatchCardData }) {
  const isFull = match.current_players >= match.max_players;
  const isCompleted = match.status === "COMPLETED";
  const isLive = match.status === "IN_PROGRESS" || match.status === "ROOM_READY";

  // Capacity percentage for progress bar
  const capacityPercent = Math.min(100, Math.round((match.current_players / match.max_players) * 100));

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/90 shadow-lg shadow-black/30">
      {/* Top row: Mode badge and Status pill */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Swords className="h-3.5 w-3.5 text-emerald-400" />
            <span>{match.mode?.name || match.match_format}</span>
          </div>

          <div className="flex items-center gap-2">
            {match.is_registered && (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                REGISTERED
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                isLive
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                  : isCompleted
                  ? "bg-slate-800 text-slate-400"
                  : isFull
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {match.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Map & Code */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-500" />
            <span>Map: <strong className="text-slate-200 font-semibold">{match.map_name}</strong></span>
          </div>
          <span className="font-mono text-slate-500 font-medium">{match.public_match_code}</span>
        </div>

        {/* Financial Highlights: Entry Fee & Prize Pool */}
        <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 mb-4">
          <div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <Coins className="h-3 w-3 text-slate-500" />
              Entry Fee
            </span>
            <span className="text-base font-extrabold text-white">
              {match.entry_fee_minor === 0 ? "FREE" : formatPaise(match.entry_fee_minor)}
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <Trophy className="h-3 w-3 text-amber-400" />
              Prize Pool
            </span>
            <span className="text-base font-extrabold text-emerald-400">
              {formatPaise(match.prize_pool_minor)}
            </span>
          </div>
        </div>

        {/* Slots progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-slate-400">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              Slots
            </span>
            <span className="font-bold font-mono text-slate-200">
              {match.current_players} / {match.max_players}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                isFull ? "bg-amber-400" : "bg-emerald-500"
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom row: Timing and CTA */}
      <div className="border-t border-slate-800/80 pt-3.5 mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {!isCompleted && !isLive && (
            <MatchCountdown targetDate={match.match_start_at} prefix="Starts in:" />
          )}
          {isLive && (
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              Match in Progress
            </span>
          )}
          {isCompleted && (
            <span className="text-xs font-semibold text-slate-400">
              Completed & Settled
            </span>
          )}
        </div>

        <Link
          href={`/matches/${match.id}`}
          className={`text-center rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition shadow-sm ${
            match.is_registered
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700"
              : isCompleted
              ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
              : isFull
              ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-950"
          }`}
        >
          {match.is_registered
            ? "View Match Room"
            : isCompleted
            ? "View Results"
            : isFull
            ? "Match Full"
            : "Join Match"}
        </Link>
      </div>
    </div>
  );
}
