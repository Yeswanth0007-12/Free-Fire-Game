"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, HelpCircle, ArrowLeft } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <ShieldCheck className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Official Tournament Rules</h1>
        </div>

        <section className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">1. Player Eligibility</h2>
          <p>
            All tournament participants must be at least 18 years of age. A valid Free Fire UID and exact in-game
            nickname must be registered to the player&apos;s platform account prior to joining any scheduled match.
          </p>
        </section>

        <section className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">2. Room Release & Entry Protocol</h2>
          <p>
            Custom Room ID and Password are encrypted and released strictly to registered competitors at the
            configured room release time (typically 10-15 minutes before scheduled match start). Players must join
            the custom room immediately upon release. Failure to join the room before start time forfeits participation without refund.
          </p>
        </section>

        <section className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">3. Strict Anti-Cheating & Integrity</h2>
          <p>
            Do not modify, inject into, hook into, or reverse engineer the Free Fire client. Emulators, packet manipulation,
            aimbots, speed hacks, or wall hacks result in an immediate lifetime ban, forfeiture of all wallet balances, and
            permanent blacklisting of player UIDs and payment destinations.
          </p>
        </section>

        <section className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">4. Result Verification & Prize Settlements</h2>
          <p>
            Per platform standards, match results are officially entered and verified by assigned match hosts and admins.
            Once verified, the prize pool is settled atomically into winners&apos; platform wallets with immutable ledger tracking.
          </p>
        </section>
      </div>
    </div>
  );
}
