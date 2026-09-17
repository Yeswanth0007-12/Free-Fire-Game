"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
  Trophy, ArrowLeft, Shield, Calendar, Clock, MapPin, 
  Coins, Users, Key, AlertCircle, CheckCircle, Info, Lock, Eye, EyeOff 
} from "lucide-react";
import { api } from "@/lib/api";

export default function EditMatchPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [match, setMatch] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    map_name: "",
    room_id: "",
    room_password: "",
    room_release_at: "",
    match_start_at: "",
    result_deadline_at: "",
    notes: "",
  });

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await api.getMatch(matchId);
        if (res.success && res.data) {
          const m = res.data;
          setMatch(m);
          setFormData({
            map_name: m.map_name || "Bermuda",
            room_id: m.room_id || "",
            room_password: m.room_password || "",
            room_release_at: m.room_release_at ? new Date(m.room_release_at).toISOString().slice(0, 16) : "",
            match_start_at: m.match_start_at ? new Date(m.match_start_at).toISOString().slice(0, 16) : "",
            result_deadline_at: m.result_deadline_at ? new Date(m.result_deadline_at).toISOString().slice(0, 16) : "",
            notes: m.notes || "",
          });
        } else {
          setError(res.error?.message || "Failed to load match");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load match details");
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const payload: any = {
        map_name: formData.map_name,
        notes: formData.notes,
      };

      if (formData.room_id) payload.room_id = formData.room_id;
      if (formData.room_password) payload.room_password = formData.room_password;
      if (formData.room_release_at) payload.room_release_at = new Date(formData.room_release_at).toISOString();
      if (formData.match_start_at) payload.match_start_at = new Date(formData.match_start_at).toISOString();
      if (formData.result_deadline_at) payload.result_deadline_at = new Date(formData.result_deadline_at).toISOString();

      const res = await api.updateMatch(matchId, payload);
      if (res.success) {
        setSuccess("Tournament updated successfully! Encrypted room credentials saved.");
        setTimeout(() => {
          router.push("/admin/matches");
        }, 1200);
      } else {
        setError(res.error?.message || "Failed to update match");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-500 text-sm">
        <div className="h-6 w-6 animate-spin mx-auto mb-2 border-2 border-amber-500 border-t-transparent rounded-full" />
        Loading tournament details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/matches"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Edit Tournament #{match?.public_match_code}
          </h1>
          <p className="text-sm text-zinc-400">
            Update room credentials, schedule, map, and operational parameters without recreating the match.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Match Info Summary */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Shield className="h-4 w-4 text-amber-400" /> Match Information & Lock Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 uppercase">Format</span>
              <p className="font-bold text-white mt-1">{match?.match_format || "N/A"}</p>
            </div>
            <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 uppercase">Status</span>
              <p className="font-bold text-amber-400 mt-1">{match?.status}</p>
            </div>
            <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 uppercase">Players Booked</span>
              <p className="font-bold text-emerald-400 mt-1">{match?.current_players} / {match?.max_players}</p>
            </div>
            <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-500 uppercase">Entry Fee (Locked)</span>
              <p className="font-bold text-white mt-1">₹{(match?.entry_fee_minor || 0) / 100}</p>
            </div>
          </div>
        </div>

        {/* Section: Encrypted Room Credentials (Sections 21, 24, 72) */}
        <div className="bg-zinc-900/60 border border-amber-500/30 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-amber-400 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Key className="h-4 w-4 text-amber-500" /> Custom Room Credentials (AES-256 Encrypted)
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Update the Room ID and Password prior to the scheduled room release. Once updated, the backend tracker
            will automatically broadcast and release these credentials to confirmed participants at the exact release time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Custom Room ID
              </label>
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Room Password (Masked)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="e.g. ABCD12"
                  value={formData.room_password}
                  onChange={(e) => setFormData({ ...formData, room_password: e.target.value })}
                  className="w-full pl-3 pr-10 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-start gap-2 text-xs text-zinc-400">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Credentials are encrypted at rest with AES-256. Passwords are never logged or exposed in public match listings.
            </span>
          </div>
        </div>

        {/* Section: Schedule & Timers */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Clock className="h-4 w-4 text-amber-400" /> Schedule & Automated Timers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Room Release Timestamp
              </label>
              <input
                type="datetime-local"
                value={formData.room_release_at}
                onChange={(e) => setFormData({ ...formData, room_release_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Match Start Timestamp
              </label>
              <input
                type="datetime-local"
                value={formData.match_start_at}
                onChange={(e) => setFormData({ ...formData, match_start_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Result Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.result_deadline_at}
                onChange={(e) => setFormData({ ...formData, result_deadline_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section: Map & Operational Notes */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <MapPin className="h-4 w-4 text-amber-400" /> Map & Operational Directives
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Map Name
              </label>
              <select
                value={formData.map_name}
                onChange={(e) => setFormData({ ...formData, map_name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Bermuda">Bermuda</option>
                <option value="Purgatory">Purgatory</option>
                <option value="Kalahari">Kalahari</option>
                <option value="Alpine">Alpine</option>
                <option value="NeXTerra">NeXTerra</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Internal Admin Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Official stream link, host notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/matches"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-sm transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Tournament Updates"}
          </button>
        </div>
      </form>
    </div>
  );
}
