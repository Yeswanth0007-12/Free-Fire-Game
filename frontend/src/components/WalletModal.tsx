"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { X, ArrowUpRight, ArrowDownLeft, ShieldCheck, AlertCircle } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "deposit" | "withdraw";
}

export default function WalletModal({ isOpen, onClose, defaultTab = "deposit" }: WalletModalProps) {
  const { refreshWallet, wallet } = useAuth();
  const [tab, setTab] = useState<"deposit" | "withdraw">(defaultTab);
  const [amountRupees, setAmountRupees] = useState("100");
  const [payoutType, setPayoutType] = useState<"UPI" | "BANK_TRANSFER">("UPI");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleDeposit = async () => {
    setLoading(true);
    setMessage(null);
    const amountMinor = Math.round(parseFloat(amountRupees) * 100);

    if (isNaN(amountMinor) || amountMinor < 1000) {
      setMessage({ type: "error", text: "Minimum deposit is ₹10.00" });
      setLoading(false);
      return;
    }

    // 1. Create deposit order
    const orderRes = await apiRequest("/wallet/deposit", {
      method: "POST",
      body: JSON.stringify({ amount_minor: amountMinor }),
    });

    if (!orderRes.success || !orderRes.data) {
      setMessage({ type: "error", text: orderRes.error?.message || "Failed to initiate payment" });
      setLoading(false);
      return;
    }

    const orderData = orderRes.data;

    // 2. Complete payment verification (simulated / test checkout)
    const verifyRes = await apiRequest("/payments/verify", {
      method: "POST",
      body: JSON.stringify({
        payment_id: orderData.payment_id,
        provider_order_id: orderData.provider_order_id,
        provider_payment_id: `pay_${Date.now()}`,
        provider_signature: "sim_sig_valid",
      }),
    });

    if (verifyRes.success) {
      await refreshWallet();
      setMessage({ type: "success", text: `Successfully deposited ₹${amountRupees} to your wallet!` });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1500);
    } else {
      setMessage({ type: "error", text: verifyRes.error?.message || "Payment verification failed" });
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    setLoading(true);
    setMessage(null);
    const amountMinor = Math.round(parseFloat(amountRupees) * 100);

    if (isNaN(amountMinor) || amountMinor < 10000) {
      setMessage({ type: "error", text: "Minimum withdrawal is ₹100.00" });
      setLoading(false);
      return;
    }

    if (!payoutDetails.trim()) {
      setMessage({ type: "error", text: "Please enter your UPI ID or Bank account details" });
      setLoading(false);
      return;
    }

    const res = await apiRequest("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({
        amount_minor: amountMinor,
        payout_destination_type: payoutType,
        payout_details: payoutDetails.trim(),
      }),
    });

    if (res.success) {
      await refreshWallet();
      setMessage({ type: "success", text: "Withdrawal request submitted for review" });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1500);
    } else {
      setMessage({ type: "error", text: res.error?.message || "Withdrawal failed" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tabs */}
        <div className="flex rounded-lg bg-slate-900 p-1 mb-5">
          <button
            onClick={() => { setTab("deposit"); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition ${
              tab === "deposit" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" />
            Add Cash (Deposit)
          </button>
          <button
            onClick={() => { setTab("withdraw"); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition ${
              tab === "withdraw" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdrawal
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-xs font-semibold ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}
          >
            {message.type === "success" ? <ShieldCheck className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {tab === "deposit" ? (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select or Enter Amount (INR)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {["50", "100", "200", "500"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountRupees(preset)}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    amountRupees === preset
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            <div className="relative mb-5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="Enter custom amount"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-4 py-2.5 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {loading ? "Processing Payment..." : `Deposit ₹${amountRupees} via Razorpay`}
            </button>
          </div>
        ) : (
          <div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 mb-4">
              <span className="text-[11px] text-slate-400 block font-semibold">Available Winning Balance</span>
              <span className="text-lg font-extrabold text-emerald-400">
                {wallet ? wallet.winning_balance_formatted : "₹0.00"}
              </span>
            </div>

            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Withdrawal Amount (Min ₹100)
            </label>
            <div className="relative mb-4">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-4 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Payout Destination
            </label>
            <div className="flex gap-2 mb-3">
              {(["UPI", "BANK_TRANSFER"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPayoutType(mode)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                    payoutType === mode
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {mode === "UPI" ? "UPI ID" : "Bank Account"}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={payoutDetails}
              onChange={(e) => setPayoutDetails(e.target.value)}
              placeholder={payoutType === "UPI" ? "e.g. yourname@oksbi" : "Account Number, IFSC Code"}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none mb-4"
            />

            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 py-3 text-sm font-extrabold uppercase tracking-wider text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Withdrawal Request"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
