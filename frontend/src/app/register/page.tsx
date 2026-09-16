"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Flame, Lock, Mail, User, Gamepad2, ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    display_name: "",
    free_fire_uid: "",
    free_fire_name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await register(formData);
    if (res.success) {
      router.push("/dashboard");
    } else {
      setError(res.error || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <Flame className="h-6 w-6 fill-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Create Player Profile</h1>
          <p className="text-xs text-slate-400 mt-1">Link your Free Fire UID to participate in scheduled matches</p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Viper_99"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="player@freefire.gg"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                Free Fire UID
              </label>
              <div className="relative">
                <Gamepad2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <input
                  type="text"
                  required
                  value={formData.free_fire_uid}
                  onChange={(e) => setFormData({ ...formData, free_fire_uid: e.target.value })}
                  placeholder="e.g. 194820194"
                  className="w-full rounded-lg border border-emerald-500/40 bg-slate-950 pl-10 pr-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                Free Fire Nickname
              </label>
              <div className="relative">
                <Gamepad2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <input
                  type="text"
                  required
                  value={formData.free_fire_name}
                  onChange={(e) => setFormData({ ...formData, free_fire_name: e.target.value })}
                  placeholder="Exact in-game name"
                  className="w-full rounded-lg border border-emerald-500/40 bg-slate-950 pl-10 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
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
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            By clicking Register, you confirm that you are at least 18 years old and agree to follow all platform Fair Play rules.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {loading ? "Creating Profile..." : "Register & Start Playing"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-emerald-400 hover:text-emerald-300">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
