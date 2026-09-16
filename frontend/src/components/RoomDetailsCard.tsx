"use client";

import React, { useState } from "react";
import { Lock, Unlock, Copy, Check, ShieldAlert } from "lucide-react";
import MatchCountdown from "./MatchCountdown";

interface RoomDetailsProps {
  isReleased: boolean;
  releaseTime: string;
  roomId?: string;
  roomPassword?: string;
  isRegistered: boolean;
}

export default function RoomDetailsCard({
  isReleased,
  releaseTime,
  roomId,
  roomPassword,
  isRegistered,
}: RoomDetailsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isRegistered) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-slate-500 mb-2" />
        <h3 className="font-bold text-slate-200">Room Details Restricted</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Custom match room ID and password are only accessible to confirmed registered players.
        </p>
      </div>
    );
  }

  if (!isReleased) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
        <Lock className="mx-auto h-8 w-8 text-amber-400 mb-2" />
        <h3 className="font-bold text-slate-200">Room Details Locked</h3>
        <p className="text-xs text-slate-400 mt-1">
          Credentials unlock automatically at the configured release time.
        </p>
        <div className="mt-3 inline-flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 px-4 py-2">
          <MatchCountdown targetDate={releaseTime} prefix="Unlocks in:" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Unlock className="h-5 w-5 text-emerald-400" />
          <h3 className="font-extrabold text-white text-base">Custom Room Credentials</h3>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
          LIVE CREDENTIALS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Room ID */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3.5">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              ROOM ID
            </span>
            <span className="font-mono text-lg font-black text-emerald-400">
              {roomId || "N/A"}
            </span>
          </div>
          {roomId && (
            <button
              onClick={() => copyToClipboard(roomId, "id")}
              className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {copiedField === "id" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedField === "id" ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        {/* Room Password */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3.5">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              ROOM PASSWORD
            </span>
            <span className="font-mono text-lg font-black text-emerald-400">
              {roomPassword || "N/A"}
            </span>
          </div>
          {roomPassword && (
            <button
              onClick={() => copyToClipboard(roomPassword, "pass")}
              className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {copiedField === "pass" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedField === "pass" ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 text-center">
        Open Free Fire &rarr; Custom Match &rarr; Search Room ID &rarr; Enter Password &rarr; Join your assigned team slot.
      </p>
    </div>
  );
}
