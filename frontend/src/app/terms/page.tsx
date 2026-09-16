"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <FileText className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Terms of Service</h1>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            Welcome to IGNITE FF. By accessing our platform, registering an account, or entering scheduled tournaments,
            you agree to be bound by these Terms of Service.
          </p>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">1. Platform Nature</h2>
          <p>
            IGNITE FF is an independent tournament organizer providing scheduled match coordination and prize pool
            management. We are not affiliated with, sponsored by, or endorsed by Garena.
          </p>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">2. Financial Ledger & Wallet Rules</h2>
          <p>
            All wallet transactions are tracked via an immutable double-entry internal ledger. Balances cannot be directly
            manipulated by client applications. Withdrawals are subject to compliance reviews and feature flag governance.
          </p>
        </div>
      </div>
    </div>
  );
}
