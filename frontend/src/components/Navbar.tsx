"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Swords, Wallet as WalletIcon, Trophy, Bell, Shield, User as UserIcon, LogOut, Flame, Zap } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, wallet, logout } = useAuth();

  const navLinks = [
    { name: "Matches", href: "/matches", icon: Swords },
    { name: "My Matches", href: "/my-matches", icon: Flame },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Wallet", href: "/wallet", icon: WalletIcon },
  ];

  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "MATCH_HOST");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Flame className="h-5 w-5 fill-emerald-500" />
          </div>
          <span className="font-extrabold tracking-wider text-white text-lg">
            CLASH<span className="text-emerald-400">IQ</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.name}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20 ${
                pathname.startsWith("/admin") ? "border-amber-400" : ""
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              ADMIN PANEL
            </Link>
          )}
        </nav>

        {/* User actions */}
        <div className="flex items-center gap-3">
          <a
            href="/clashiq-v1.0.0-release.apk"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition shadow-sm"
            title="Download Android APK"
          >
            <Zap className="h-3.5 w-3.5 fill-emerald-400" />
            <span className="hidden sm:inline">Download APK</span>
            <span className="sm:hidden text-[11px] font-black">APK</span>
          </a>
          {user ? (
            <>
              {/* Wallet pill */}
              <Link
                href="/wallet"
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-sm font-semibold text-emerald-400 hover:border-slate-700 transition"
              >
                <WalletIcon className="h-4 w-4" />
                <span>{wallet ? wallet.available_balance_formatted : "₹0.00"}</span>
              </Link>

              {/* Notifications */}
              <Link
                href="/notifications"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <Bell className="h-4 w-4" />
              </Link>

              {/* Profile dropdown / link */}
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-slate-700 transition"
              >
                <UserIcon className="h-4 w-4 text-emerald-400" />
                <span className="hidden sm:inline-block truncate max-w-[100px]">
                  {user.profile?.display_name || user.email.split("@")[0]}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Logout"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-500 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
