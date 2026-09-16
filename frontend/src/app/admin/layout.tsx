"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Swords,
  PlusCircle,
  Trophy,
  Users,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ArrowLeft,
  Shield
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "MATCH_HOST");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="py-16 text-center space-y-3">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-black text-white uppercase">Access Forbidden</h2>
        <p className="text-xs text-slate-400">You must be an administrator or official match host to view this portal.</p>
        <Link href="/dashboard" className="inline-block text-xs font-bold text-emerald-400">Return to Dashboard</Link>
      </div>
    );
  }

  const adminNav = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Matches", href: "/admin/matches", icon: Swords },
    { label: "Create Match", href: "/admin/matches/create", icon: PlusCircle },
    { label: "Result Verification", href: "/admin/results", icon: Trophy },
    { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
    { label: "User Accounts", href: "/admin/users", icon: Users },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
    { label: "Risk Telemetry", href: "/admin/risk-flags", icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Admin Sub-bar */}
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400 tracking-wider">
            <Shield className="h-4 w-4" />
            <span>ADMINISTRATIVE CONTROL CENTER</span>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-mono">
              {user?.role}
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Player App
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 p-4 sm:p-6 lg:p-8">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 shrink-0 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Main Admin Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
