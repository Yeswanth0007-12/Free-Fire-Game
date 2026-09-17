"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import MatchCard, { MatchCardData } from "@/components/MatchCard";
import { Swords, Filter, RefreshCw, Search } from "lucide-react";

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<string>("ALL");
  const [selectedFormat, setSelectedFormat] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const fetchMatches = async () => {
    setLoading(true);
    let query = "/matches?limit=50";
    if (selectedMode !== "ALL") query += `&mode=${selectedMode}`;
    if (selectedFormat !== "ALL") query += `&format=${selectedFormat}`;
    if (selectedStatus !== "ALL") query += `&status=${selectedStatus}`;

    const res = await apiRequest<MatchCardData[]>(query);
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : ((res.data as any)?.matches || []);
      setMatches(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, [selectedMode, selectedFormat, selectedStatus]);

  const modes = [
    { label: "All Modes", value: "ALL" },
    { label: "Solo", value: "solo" },
    { label: "Lone Wolf 1v1", value: "lone-wolf-1v1" },
    { label: "Lone Wolf 2v2", value: "lone-wolf-2v2" },
    { label: "Clash Squad 1v1", value: "clash-squad-1v1" },
    { label: "Clash Squad 2v2", value: "clash-squad-2v2" },
    { label: "Clash Squad 4v4", value: "clash-squad-4v4" },
  ];

  const formats = [
    { label: "All Formats", value: "ALL" },
    { label: "1v1", value: "1v1" },
    { label: "2v2", value: "2v2" },
    { label: "4v4", value: "4v4" },
    { label: "SOLO", value: "SOLO" },
  ];

  const statuses = [
    { label: "All Statuses", value: "ALL" },
    { label: "Registering", value: "REGISTRATION_OPEN" },
    { label: "Scheduled", value: "SCHEDULED" },
    { label: "Full", value: "FULL" },
    { label: "Room Ready / Live", value: "ROOM_READY" },
    { label: "Completed", value: "COMPLETED" },
  ];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Tournament Arena
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and register for live and scheduled Free Fire competitive tournaments
          </p>
        </div>

        <button
          onClick={fetchMatches}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Tournaments
        </button>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          <Filter className="h-3.5 w-3.5 text-emerald-400" />
          Filter Tournaments
        </div>

        {/* Mode Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMode(m.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                selectedMode === m.value
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Format & Status dropdowns */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Format:</span>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
            >
              {formats.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Match Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <Swords className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="font-bold text-lg text-white">No Tournaments Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your filters or check back shortly as new competitive rooms are scheduled constantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
