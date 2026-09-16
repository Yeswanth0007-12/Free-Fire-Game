"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatPaise, formatDate } from "@/lib/utils";
import MatchCountdown from "@/components/MatchCountdown";
import RoomDetailsCard from "@/components/RoomDetailsCard";
import {
  Swords,
  Trophy,
  Coins,
  MapPin,
  Users,
  ShieldAlert,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from "lucide-react";

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;
  const router = useRouter();
  const { user, wallet, refreshWallet } = useAuth();

  const [match, setMatch] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadMatchData = async () => {
    // 1. Fetch match details
    const res = await apiRequest(`/matches/${matchId}`);
    if (res.success && res.data) {
      setMatch(res.data);
      setIsRegistered(!!res.data.is_registered);
    }

    // 2. Fetch teams
    const teamsRes = await apiRequest(`/matches/${matchId}/teams`);
    if (teamsRes.success && teamsRes.data) {
      setTeams(teamsRes.data);
    }

    // 3. If registered, attempt room credentials fetch
    const roomRes = await apiRequest(`/matches/${matchId}/room`);
    if (roomRes.success && roomRes.data) {
      setRoomData(roomRes.data);
    } else {
      setRoomData(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadMatchData();

    // Setup real-time WebSocket connection for live match slot updates
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`ws://localhost:8000/ws/matches/${matchId}`);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "SLOT_OCCUPIED" || payload.type === "STATUS_CHANGED") {
            loadMatchData();
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (ws) ws.close();
    };
  }, [matchId]);

  const handleJoinMatch = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setJoining(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await apiRequest(`/matches/${matchId}/join`, {
      method: "POST",
      body: JSON.stringify({ payment_method: "WALLET" }),
    });

    if (res.success) {
      setSuccessMsg("Registration confirmed! You have joined this tournament match.");
      setIsRegistered(true);
      await refreshWallet();
      await loadMatchData();
    } else {
      setErrorMsg(res.error?.message || "Failed to join match");
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <div className="py-12 px-4 max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-40 bg-slate-900 rounded-lg animate-pulse" />
        <div className="h-96 bg-slate-900/40 rounded-2xl border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-16 px-4 max-w-md mx-auto text-center space-y-4">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold text-white">Match Not Found</h2>
        <p className="text-xs text-slate-400">This tournament match code does not exist or has been removed.</p>
        <Link href="/matches" className="inline-block text-xs font-bold text-emerald-400">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const isFull = match.current_players >= match.max_players;
  const isCompleted = match.status === "COMPLETED";

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Arena
      </Link>

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {match.mode?.name || match.match_format}
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-slate-400">
                {match.public_match_code}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                {match.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Free Fire {match.mode?.name || match.match_format} Championship
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              Battlefield: <strong className="text-slate-200">{match.map_name}</strong>
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
            <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Grand Prize Pool</span>
            <span className="text-3xl font-black text-emerald-400">{formatPaise(match.prize_pool_minor)}</span>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Key Metrics Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-slate-800/80 py-4 my-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Entry Fee</span>
            <span className="text-lg font-black text-white">
              {match.entry_fee_minor === 0 ? "FREE" : formatPaise(match.entry_fee_minor)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Confirmed Slots</span>
            <span className="text-lg font-black text-white font-mono">
              {match.current_players} / {match.max_players}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Match Start Time</span>
            <span className="text-xs font-bold text-slate-200 block mt-1">{formatDate(match.match_start_at)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Room Release</span>
            <span className="text-xs font-bold text-slate-200 block mt-1">{formatDate(match.room_release_at)}</span>
          </div>
        </div>

        {/* Join CTA or Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {!isCompleted && match.status !== "IN_PROGRESS" && (
              <MatchCountdown targetDate={match.match_start_at} prefix="Match starts in:" />
            )}
          </div>

          <div>
            {isRegistered ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                You are confirmed for this tournament!
              </div>
            ) : isCompleted ? (
              <span className="text-xs font-semibold text-slate-400">Tournament has concluded.</span>
            ) : isFull ? (
              <button
                disabled
                className="rounded-xl bg-slate-800 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-not-allowed"
              >
                Match Fully Booked
              </button>
            ) : (
              <button
                onClick={handleJoinMatch}
                disabled={joining}
                className="rounded-xl bg-emerald-600 px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-950 hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {joining ? "Confirming Slot..." : `Join Match (${match.entry_fee_minor === 0 ? "Free" : formatPaise(match.entry_fee_minor)})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Secret Room Credentials Section */}
      <RoomDetailsCard
        isReleased={roomData?.is_released || false}
        releaseTime={match.room_release_at}
        roomId={roomData?.room_id}
        roomPassword={roomData?.room_password}
        isRegistered={isRegistered}
      />

      {/* Rosters / Team Structures */}
      {teams.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-black uppercase text-white tracking-wider mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            Assigned Team Rosters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                  <h3 className="font-extrabold text-white text-sm">{t.name}</h3>
                  <span className="text-[11px] font-mono text-slate-400">Slot #{t.slot_number}</span>
                </div>

                <div className="space-y-2">
                  {t.members && t.members.length > 0 ? (
                    t.members.map((m: any, idx: number) => (
                      <div key={m.id} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-slate-300">
                          {idx + 1}. {m.player_name}
                        </span>
                        <span className="font-mono text-slate-500">{m.free_fire_uid}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No players assigned yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tournament Rules */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-black uppercase text-white tracking-wider mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-slate-400" />
          Tournament Match Rules & Fair Play
        </h2>
        <div className="text-xs text-slate-400 leading-relaxed space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <p>{match.rules_text}</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Ensure your Free Fire in-game name and UID strictly match your registered platform profile.</li>
            <li>Players must join the custom room before the scheduled start time. Late arrivals forfeit entry fees.</li>
            <li>Any use of third-party modifications, scripts, or cheats will result in an immediate account ban and forfeiture.</li>
            <li>Official tournament admins monitor the match and verify structured results post-game.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
