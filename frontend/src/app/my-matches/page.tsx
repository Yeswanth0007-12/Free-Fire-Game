"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import MatchCard, { MatchCardData } from "@/components/MatchCard";
import { Flame, Clock, Swords, Trophy, AlertTriangle } from "lucide-react";

export default function MyMatchesPage() {
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "LIVE" | "COMPLETED" | "DISPUTED">("UPCOMING");
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyMatches = async (tab: string) => {
    setLoading(true);
    const res = await apiRequest<MatchCardData[]>(`/my-matches?tab=${tab}`);
    if (res.success && res.data) {
      setMatches(res.data);
    } else {
      setMatches([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyMatches(activeTab);
  }, [activeTab]);

  const tabs = [
    { key: "UPCOMING", label: "Upcoming", icon: Clock },
    { key: "LIVE", label: "Live Matches", icon: Swords },
    { key: "COMPLETED", label: "Completed", icon: Trophy },
    { key: "DISPUTED", label: "Disputed", icon: AlertTriangle },
  ];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          My Match Registrations
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review your upcoming match schedule, live rooms, and completed tournament records
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <Flame className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="font-bold text-lg text-white">No {activeTab.toLowerCase()} matches</h3>
          <p className="text-xs text-slate-400 mt-1">
            You currently have no tournaments in the {activeTab.toLowerCase()} category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
