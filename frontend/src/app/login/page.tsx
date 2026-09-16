"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Flame, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email.trim(), password);
    if (res.success) {
      router.push("/dashboard");
    } else {
      setError(res.error || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <Flame className="h-6 w-6 fill-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Sign In to Account</h1>
          <p className="text-xs text-slate-400 mt-1">Access scheduled tournaments and wallet ledger</p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@freefire.gg"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="font-bold text-emerald-400 hover:text-emerald-300">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
