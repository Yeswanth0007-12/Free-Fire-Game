"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { formatPaise } from "@/lib/utils";
import MatchCard, { MatchCardData } from "@/components/MatchCard";
import WalletModal from "@/components/WalletModal";
import {
  Wallet as WalletIcon,
  Trophy,
  Swords,
  Flame,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  ShieldAlert
} from "lucide-react";

export default function DashboardPage() {
  const { user, wallet } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState<MatchCardData[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchCardData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"deposit" | "withdraw">("deposit");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      // 1. Fetch upcoming registered matches
      const upcomingRes = await apiRequest<MatchCardData[]>("/my-matches?tab=UPCOMING");
      if (upcomingRes.success && upcomingRes.data) {
        setUpcomingMatches(upcomingRes.data);
      }

      // 2. Fetch live matches
      const liveRes = await apiRequest<MatchCardData[]>("/my-matches?tab=LIVE");
      if (liveRes.success && liveRes.data) {
        setLiveMatches(liveRes.data);
      }

      // 3. Fetch recent wallet transactions
      const txRes = await apiRequest<any[]>("/wallet/transactions?limit=5");
      if (txRes.success && txRes.data) {
        setRecentTransactions(txRes.data);
      }

      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const profile = user?.profile;
  const winRate = profile && profile.total_matches > 0
    ? Math.round((profile.total_wins / profile.total_matches) * 100)
    : 0;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner & UID Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            COMPETITOR DASHBOARD
          </span>
          <h1 className="text-2xl font-black text-white mt-0.5">
            Welcome back, {profile?.display_name || user?.email.split("@")[0]}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <strong className="text-slate-200">UID:</strong> {profile?.free_fire_uid || "Not linked"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <strong className="text-slate-200">IGN:</strong> {profile?.free_fire_name || "N/A"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/matches"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow hover:bg-emerald-500 transition"
          >
            <Swords className="h-4 w-4" />
            Browse Matches
          </Link>
        </div>
      </div>

      {/* Financial & Performance Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <WalletIcon className="h-4 w-4 text-emerald-400" />
              Available Balance
            </span>
          </div>
          <div className="text-2xl font-black text-white my-1">
            {wallet ? wallet.available_balance_formatted : "₹0.00"}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => { setModalTab("deposit"); setIsWalletModalOpen(true); }}
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-emerald-600/20 border border-emerald-500/30 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Cash
            </button>
            <button
              onClick={() => { setModalTab("withdraw"); setIsWalletModalOpen(true); }}
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-slate-800 border border-slate-700 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Total Winnings Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Trophy className="h-4 w-4 text-amber-400" />
              Total Winnings
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 my-1">
            {profile ? formatPaise(profile.total_winnings_minor) : "₹0.00"}
          </div>
          <span className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
            Winning Balance: <strong className="text-slate-300">{wallet?.winning_balance_formatted || "₹0.00"}</strong>
          </span>
        </div>

        {/* Win Rate Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Percent className="h-4 w-4 text-blue-400" />
              Win Rate
            </span>
          </div>
          <div className="text-2xl font-black text-white my-1">
            {winRate}%
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
            <span>Wins: <strong className="text-emerald-400">{profile?.total_wins || 0}</strong></span>
            <span>Losses: <strong className="text-rose-400">{profile?.total_losses || 0}</strong></span>
          </div>
        </div>

        {/* Matches & Streak */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Current Streak
            </span>
          </div>
          <div className="text-2xl font-black text-white my-1 flex items-center gap-2">
            {profile?.current_streak || 0}
            <Flame className="h-5 w-5 fill-amber-500 text-amber-500" />
          </div>
          <span className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
            Total Matches: <strong className="text-slate-300">{profile?.total_matches || 0}</strong>
          </span>
        </div>
      </div>

      {/* Live Tournaments */}
      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-lg font-black uppercase text-white tracking-wider">Your Live Tournaments</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Registered Tournaments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase text-white tracking-wider">Upcoming Registered Matches</h2>
          <Link href="/my-matches" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase">
            View All Registered
          </Link>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">You have no upcoming registered matches.</p>
            <Link
              href="/matches"
              className="inline-block mt-3 text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
            >
              Browse Open Tournaments &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Ledger Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase text-white tracking-wider">Recent Wallet Ledger Activity</h2>
          <Link href="/wallet" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase">
            Full Wallet History
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-400">
            No recent wallet transactions.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 text-xs">
                <div>
                  <span className="font-bold text-slate-200 block">{tx.description}</span>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">{tx.idempotency_key}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono text-sm font-black ${
                      tx.direction === "CREDIT" ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {tx.direction === "CREDIT" ? "+" : "-"}
                    {formatPaise(tx.amount_minor)}
                  </span>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Deposit/Withdrawal Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        defaultTab={modalTab}
      />
    </div>
  );
}
