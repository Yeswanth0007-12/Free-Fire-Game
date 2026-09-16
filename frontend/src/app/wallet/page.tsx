"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";
import WalletModal from "@/components/WalletModal";
import {
  Wallet as WalletIcon,
  Trophy,
  Lock,
  PlusCircle,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  Clock,
  Coins
} from "lucide-react";

export default function WalletPage() {
  const { wallet, refreshWallet } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"deposit" | "withdraw">("deposit");

  const loadTransactions = async () => {
    setLoading(true);
    await refreshWallet();
    const res = await apiRequest<any[]>("/wallet/transactions?limit=100");
    if (res.success && res.data) {
      setTransactions(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Fintech Wallet & Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable transaction ledger, deposit funds, and withdraw verified prize winnings
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Balance Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <WalletIcon className="h-4 w-4 text-emerald-400" />
              Available Balance
            </span>
            <div className="text-3xl font-black text-white">
              {wallet ? wallet.available_balance_formatted : "₹0.00"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Available to join upcoming tournament matches</p>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => { setModalTab("deposit"); setIsModalOpen(true); }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-emerald-500 shadow transition"
            >
              <PlusCircle className="h-4 w-4" />
              Deposit Cash
            </button>
          </div>
        </div>

        {/* Winning Balance */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Winning Balance
            </span>
            <div className="text-3xl font-black text-emerald-400">
              {wallet ? wallet.winning_balance_formatted : "₹0.00"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Legally eligible for withdrawal to verified UPI</p>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => { setModalTab("withdraw"); setIsModalOpen(true); }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-200 hover:bg-slate-700 transition"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw Prize
            </button>
          </div>
        </div>

        {/* Locked / In-Play Balance */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Lock className="h-4 w-4 text-blue-400" />
              Locked in Contests
            </span>
            <div className="text-3xl font-black text-white">
              ₹{(wallet ? wallet.locked_balance_minor / 100 : 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Temporarily locked in active live tournament rooms</p>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              100% Escrow Protected
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Transaction Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="border-b border-slate-800 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black uppercase text-white tracking-wider">
              Double-Entry Transaction Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only audit trail of all entry fees, prize payouts, and adjustments
            </p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono font-bold text-slate-400">
            {transactions.length} Records
          </span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No ledger transactions recorded yet. Join a tournament or add cash to start.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {transactions.map((tx) => {
              const isCredit = tx.direction === "CREDIT";
              return (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:px-6 hover:bg-slate-900/80 transition gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg font-black text-sm shrink-0 mt-0.5 ${
                        isCredit
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {tx.description}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            tx.type === "PRIZE"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : tx.type === "ENTRY_FEE"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono mt-1">
                        <span>Ref: {tx.reference_type}</span>
                        <span>•</span>
                        <span>Key: {tx.idempotency_key}</span>
                        <span>•</span>
                        <span>{formatDate(tx.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:pl-4">
                    <span
                      className={`text-base font-black font-mono block ${
                        isCredit ? "text-emerald-400" : "text-slate-200"
                      }`}
                    >
                      {isCredit ? "+" : "-"}{formatPaise(tx.amount_minor)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      Bal After: {formatPaise(tx.balance_after_minor)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTab={modalTab}
      />
    </div>
  );
}
