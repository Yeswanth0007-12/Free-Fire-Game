"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Swords, Trophy, ShieldCheck, Flame, ArrowRight, CheckCircle2, Zap, Users, Lock, ChevronRight } from "lucide-react";
import MatchCard, { MatchCardData } from "@/components/MatchCard";
import { apiRequest } from "@/lib/api";

export default function HomePage() {
  const [featuredMatches, setFeaturedMatches] = useState<MatchCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      const res = await apiRequest<MatchCardData[]>("/matches?limit=4");
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : ((res.data as any)?.matches || []);
        setFeaturedMatches(list);
      }
      setLoading(false);
    };
    fetchMatches();
  }, []);

  return (
    <div className="flex flex-col gap-16 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-8 sm:p-14 shadow-2xl text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 mb-6">
          <Flame className="h-4 w-4 fill-emerald-500" />
          <span>OFFICIAL FREE FIRE COMPETITIVE PLATFORM</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 uppercase">
          Compete. Play. <span className="text-emerald-400">Win Real Cash.</span>
        </h1>

        <p className="mx-auto max-w-2xl text-sm sm:text-lg text-slate-400 mb-8 leading-relaxed">
          Join scheduled competitive matches with real Free Fire players. Verified host workflows,
          custom room release timers, and instant prize credit directly to your ledger wallet.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/clashiq-v1.0.3-release.apk"
            download="clashiq-v1.0.3-release.apk"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-sm font-extrabold uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
          >
            <Zap className="h-4 w-4 fill-black" />
            Download App (Android APK)
          </a>
          <Link
            href="/matches"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-8 py-3.5 text-sm font-extrabold uppercase tracking-wider text-slate-200 hover:bg-slate-700 transition"
          >
            <Swords className="h-4 w-4" />
            Browse Tournaments
          </Link>
        </div>

        {/* Stats banner */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800/80 pt-8">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">₹3,50,000+</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Prizes Paid Out</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Verified Results</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">5,000+</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Matches Played</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">&lt; 15 Mins</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Prize Settlement</div>
          </div>
        </div>
      </section>

      {/* Featured Tournaments */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase">Featured Tournaments</h2>
            <p className="text-xs text-slate-400 mt-1">Upcoming matches registering right now</p>
          </div>
          <Link
            href="/matches"
            className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
          >
            View All Matches <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse" />
            ))}
          </div>
        ) : featuredMatches.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
            <Swords className="mx-auto h-10 w-10 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-400">No scheduled matches at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {featuredMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* Supported Modes */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
        <h2 className="text-2xl font-black tracking-tight text-white uppercase mb-2">Supported Formats</h2>
        <p className="text-xs text-slate-400 mb-6">Choose your preferred Free Fire battle style</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-amber-400" />
              <h3 className="font-extrabold text-white text-base">Lone Wolf (1v1 & 2v2)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Fast-paced round-based duels on Iron Cage. Pure mechanical gun skill without external distractions.
            </p>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Starting from ₹20</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-emerald-400" />
              <h3 className="font-extrabold text-white text-base">Clash Squad (2v2 & 4v4)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Tactical team skirmishes across Bermuda & Kalahari. Synchronize strategies with auto-allocated teams.
            </p>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Starting from ₹50</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-blue-400" />
              <h3 className="font-extrabold text-white text-base">Solo Battle Royale</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Free-for-all survival tournaments. Last survivor and high kill counts claim the grand prize pool.
            </p>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Starting from ₹30</span>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="text-center">
        <h2 className="text-2xl font-black tracking-tight text-white uppercase mb-2">How It Works</h2>
        <p className="text-xs text-slate-400 mb-8 max-w-lg mx-auto">
          Four simple steps from entry to confirmed prize settlement
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-left">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-extrabold text-sm mb-4">
              1
            </div>
            <h4 className="font-bold text-white text-sm mb-1">Link Free Fire UID</h4>
            <p className="text-xs text-slate-400">
              Sign up and register your in-game Free Fire UID and nickname to your profile.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-extrabold text-sm mb-4">
              2
            </div>
            <h4 className="font-bold text-white text-sm mb-1">Reserve Slot & Enter</h4>
            <p className="text-xs text-slate-400">
              Select any upcoming match and pay the entry fee with wallet balance or Razorpay UPI.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-extrabold text-sm mb-4">
              3
            </div>
            <h4 className="font-bold text-white text-sm mb-1">Unlock Room & Play</h4>
            <p className="text-xs text-slate-400">
              At release time, copy your secret Room ID & Password to join the custom match in Free Fire.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-extrabold text-sm mb-4">
              4
            </div>
            <h4 className="font-bold text-white text-sm mb-1">Get Paid Instantly</h4>
            <p className="text-xs text-slate-400">
              After match completion, the verified result credits prize money straight to your ledger wallet.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Invariants */}
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-white text-sm">Double-Entry Financial Ledger</h4>
              <p className="text-xs text-slate-400 mt-1">
                Every rupee is tracked with immutable transactions and server-authoritative idempotency keys.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Lock className="h-6 w-6 text-emerald-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-white text-sm">Encrypted Room Release</h4>
              <p className="text-xs text-slate-400 mt-1">
                Room credentials are AES encrypted and released strictly to registered players at release time.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-white text-sm">Structured Admin Review</h4>
              <p className="text-xs text-slate-400 mt-1">
                Official tournament hosts verify match results with dispute protection and automated settlement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Section (Sections 79, 80) */}
      <section id="download-app" className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-emerald-500/10 p-8 sm:p-12 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
              <Zap className="h-3.5 w-3.5 fill-amber-400" />
              <span>MOBILE-FIRST TOURNAMENT PLATFORM</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Play Tournaments on the Go. Download Clashiq Mobile.
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Experience zero-latency slot booking, Google/Facebook authentication, real-time AES-256 room credential reveals, and direct UPI wallet withdrawals right from your mobile device.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="/clashiq-v1.0.3-release.apk"
                download="clashiq-v1.0.3-release.apk"
                className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20"
              >
                <Zap className="h-4 w-4 fill-black" />
                Download for Android (APK)
              </a>
              <button
                disabled
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800/80 text-zinc-500 font-semibold text-sm rounded-xl cursor-not-allowed border border-zinc-750"
                title="iOS version coming soon to the Apple App Store"
              >
                App Store (Coming Soon)
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              Compatible with Android 8.0+ • Version 1.0.0 (Release Build) • Signed SHA-256
            </p>
          </div>

          <div className="w-full md:w-auto flex justify-center">
            <div className="w-48 h-80 rounded-3xl border-4 border-zinc-700 bg-zinc-950 shadow-2xl p-3 flex flex-col justify-between">
              <div className="w-16 h-4 bg-zinc-800 rounded-full mx-auto" />
              <div className="text-center space-y-2">
                <Flame className="h-8 w-8 text-amber-500 mx-auto fill-amber-500" />
                <div className="font-mono text-xs font-bold text-white">Clashiq</div>
                <div className="text-[10px] text-emerald-400 font-bold">SLOT 03 BOOKED ✓</div>
              </div>
              <div className="h-1 w-20 bg-zinc-800 rounded-full mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 pt-8 pb-12 text-center text-xs text-slate-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
          <Link href="/rules" className="hover:text-slate-300">Tournament Rules</Link>
          <Link href="/disputes" className="hover:text-slate-300">Dispute Support</Link>
        </div>
        <p>© 2026 Clashiq Tournament Platform. All rights reserved. Not affiliated with or endorsed by Garena.</p>
      </footer>
    </div>
  );
}
