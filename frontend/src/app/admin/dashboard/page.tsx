"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { formatPaise } from "@/lib/utils";
import {
  Users,
  Swords,
  Coins,
  Trophy,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  PlusCircle
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const res = await apiRequest("/admin/dashboard");
      if (res.success && res.data) {
        setStats(res.data);
      }
      setLoading(false);
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-900 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.total_users || 0, icon: Users, color: "text-white" },
    { label: "Active Players", value: stats?.active_players || 0, icon: Users, color: "text-emerald-400" },
    { label: "Matches Today", value: stats?.matches_today || 0, icon: Swords, color: "text-blue-400" },
    { label: "Live Matches", value: stats?.live_matches || 0, icon: Flame, color: "text-rose-400" },
    { label: "Completed Matches", value: stats?.completed_matches || 0, icon: CheckCircle2, color: "text-slate-300" },
    { label: "Entry Fee Revenue", value: formatPaise(stats?.entry_revenue_minor || 0), icon: Coins, color: "text-white font-mono" },
    { label: "Prizes Distributed", value: formatPaise(stats?.prize_distributed_minor || 0), icon: Trophy, color: "text-emerald-400 font-mono" },
    { label: "Pending Settlements", value: stats?.pending_settlements || 0, icon: Clock, color: "text-amber-400", alert: stats?.pending_settlements > 0 },
    { label: "Pending Disputes", value: stats?.pending_disputes || 0, icon: AlertTriangle, color: "text-rose-400", alert: stats?.pending_disputes > 0 },
    { label: "Pending Withdrawals", value: stats?.pending_withdrawals || 0, icon: ArrowUpRight, color: "text-blue-400" },
    { label: "Failed Payments", value: stats?.failed_payments || 0, icon: ShieldAlert, color: "text-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Overview</h1>
          <p className="text-xs text-slate-400 mt-1">Platform operations, liquidity, and pending tournament actions</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/matches/create"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white shadow hover:bg-emerald-500 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Schedule New Match
          </Link>
          <Link
            href="/admin/results"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-slate-200 hover:bg-slate-700 transition"
          >
            <Trophy className="h-4 w-4 text-amber-400" />
            Verify Results
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`rounded-2xl border p-4 flex flex-col justify-between ${
                card.alert
                  ? "border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-950/20"
                  : "border-slate-800 bg-slate-900/70"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-[11px] uppercase tracking-wider">{card.label}</span>
                <Icon className="h-4 w-4 text-slate-500" />
              </div>
              <div className={`text-xl sm:text-2xl font-black ${card.color}`}>
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Result Verification Queue
          </h3>
          <p className="text-xs text-slate-400">
            Official match hosts submit structured results for completed tournaments. Review round scores and approve payouts.
          </p>
          <Link
            href="/admin/results"
            className="inline-block text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
          >
            Open Verification Panel &rarr;
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            Player Disputes
          </h3>
          <p className="text-xs text-slate-400">
            Review player contest inquiries regarding scores or room credentials. Resolve tickets with automated audit tracking.
          </p>
          <Link
            href="/admin/disputes"
            className="inline-block text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider"
          >
            Manage Open Disputes &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
