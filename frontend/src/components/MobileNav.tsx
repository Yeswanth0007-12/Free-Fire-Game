"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords, Flame, Trophy, Wallet, User as UserIcon } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Matches", href: "/matches", icon: Swords },
    { label: "My Matches", href: "/my-matches", icon: Flame },
    { label: "Ranks", href: "/leaderboard", icon: Trophy },
    { label: "Wallet", href: "/wallet", icon: Wallet },
    { label: "Profile", href: "/profile", icon: UserIcon },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full py-1 transition-colors ${
                isActive ? "text-emerald-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
