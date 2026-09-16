"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <ShieldCheck className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Privacy Policy</h1>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            Your privacy and data security are paramount. We collect only necessary tournament coordination data,
            specifically your Free Fire UID and in-game nickname, to assign match slots and verify match outcomes.
          </p>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">1. Data Minimization</h2>
          <p>
            We do not request sensitive device permissions or unnecessary personal data. Passwords are cryptographically
            hashed using Argon2id.
          </p>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">2. Payment Security</h2>
          <p>
            Payment transactions are processed through certified PCI-DSS compliant providers (Razorpay). No credit card or UPI
            PIN credentials ever touch or reside on our application servers.
          </p>
        </div>
      </div>
    </div>
  );
}
