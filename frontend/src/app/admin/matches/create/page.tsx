"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Trophy, ArrowLeft, Shield, Calendar, Clock, MapPin, 
  Coins, Users, Key, AlertCircle, CheckCircle, Info 
} from "lucide-react";
import { api } from "@/lib/api";

export default function CreateMatchPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [modes, setModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    game_id: "",
    mode_id: "",
    map_name: "Bermuda",
    match_format: "Clash Squad 4v4",
    entry_fee: "50", // in ₹
    prize_pool: "350", // in ₹
    max_players: 8,
    max_teams: 2,
    registration_start_at: new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16),
    registration_close_at: new Date(Date.now() + 25 * 60 * 1000).toISOString().slice(0, 16),
    match_start_at: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16),
    room_release_at: new Date(Date.now() + 20 * 60 * 1000).toISOString().slice(0, 16),
    result_deadline_at: new Date(Date.now() + 90 * 60 * 1000).toISOString().slice(0, 16),
    room_id: "",
    room_password: "",
  });

  useEffect(() => {
    const fetchGamesAndModes = async () => {
      try {
        const res = await api.getGames();
        if (res.success && res.data) {
          setGames(res.data);
          if (res.data.length > 0) {
            const firstGame = res.data[0];
            setFormData((prev) => ({ ...prev, game_id: firstGame.id }));
            
            const modesRes = await api.getGameModes(firstGame.id);
            if (modesRes.success && modesRes.data) {
              setModes(modesRes.data);
              if (modesRes.data.length > 0) {
                const defaultMode = modesRes.data[0];
                setFormData((prev) => ({
                  ...prev,
                  mode_id: defaultMode.id,
                  match_format: defaultMode.name,
                  max_players: defaultMode.maximum_players,
                  max_teams: defaultMode.format.includes("4v4") ? 2 : defaultMode.format.includes("2v2") ? 2 : 2,
                }));
              }
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load games/modes", err);
      }
    };

    fetchGamesAndModes();
  }, []);

  const handleModeChange = (modeId: string) => {
    const selectedMode = modes.find((m) => m.id === modeId);
    if (selectedMode) {
      setFormData((prev) => ({
        ...prev,
        mode_id: selectedMode.id,
        match_format: selectedMode.name,
        max_players: selectedMode.maximum_players,
        max_teams: selectedMode.format.includes("4v4") ? 2 : selectedMode.format.includes("2v2") ? 2 : 2,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const entryFeeMinor = Math.round(parseFloat(formData.entry_fee) * 100);
      const prizePoolMinor = Math.round(parseFloat(formData.prize_pool) * 100);

      const payload = {
        game_id: formData.game_id,
        mode_id: formData.mode_id,
        map_name: formData.map_name,
        match_format: formData.match_format,
        entry_fee_minor: entryFeeMinor,
        prize_pool_minor: prizePoolMinor,
        max_players: Number(formData.max_players),
        max_teams: Number(formData.max_teams),
        registration_start_at: new Date(formData.registration_start_at).toISOString(),
        registration_close_at: new Date(formData.registration_close_at).toISOString(),
        match_start_at: new Date(formData.match_start_at).toISOString(),
        room_release_at: new Date(formData.room_release_at).toISOString(),
        result_deadline_at: new Date(formData.result_deadline_at).toISOString(),
        room_id: formData.room_id || undefined,
        room_password: formData.room_password || undefined,
        payout_rules: {
          type: "WINNER_TAKES_ALL",
          first_place_paise: prizePoolMinor,
        },
      };

      const res = await api.createMatch(payload);
      if (res.success) {
        router.push("/admin/matches");
      } else {
        setError(res.error?.message || "Failed to create match");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

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
            <Trophy className="h-6 w-6 text-amber-500" /> Create Scheduled Tournament
          </h1>
          <p className="text-sm text-zinc-400">
            Configure match format, map, capacity, entry fee, prizes, and encrypted room credentials.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Tournament Specification */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Shield className="h-4 w-4 text-amber-400" /> 1. Game & Mode Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Game
              </label>
              <select
                value={formData.game_id}
                onChange={(e) => setFormData({ ...formData, game_id: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Mode / Format
              </label>
              <select
                value={formData.mode_id}
                onChange={(e) => handleModeChange(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.format})
                  </option>
                ))}
              </select>
            </div>

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
                <option value="NexTerra">NexTerra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Total Player Capacity
              </label>
              <input
                type="number"
                min="2"
                max="48"
                value={formData.max_players}
                onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) || 2 })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
              <span className="text-[11px] text-zinc-500">Automatically matched to mode requirement.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Total Teams
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.max_teams}
                onChange={(e) => setFormData({ ...formData, max_teams: parseInt(e.target.value) || 2 })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
              <span className="text-[11px] text-zinc-500">Number of competing sides/squads.</span>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Pool & Entry Rules */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Coins className="h-4 w-4 text-emerald-400" /> 2. Financial Economics (in INR ₹)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Entry Fee (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.entry_fee}
                  onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                  className="w-full pl-8 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <span className="text-[11px] text-zinc-500">Stored in database as integer minor units (paise).</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Total Prize Pool (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.prize_pool}
                  onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                  className="w-full pl-8 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <span className="text-[11px] text-zinc-500">Winner payout calculated by atomic settlement service.</span>
            </div>
          </div>
        </div>

        {/* Section 3: Match Timings */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Clock className="h-4 w-4 text-cyan-400" /> 3. Schedule & State Transition Timers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Registration Opens
              </label>
              <input
                type="datetime-local"
                value={formData.registration_start_at}
                onChange={(e) => setFormData({ ...formData, registration_start_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Registration Closes
              </label>
              <input
                type="datetime-local"
                value={formData.registration_close_at}
                onChange={(e) => setFormData({ ...formData, registration_close_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Room Details Release Time
              </label>
              <input
                type="datetime-local"
                value={formData.room_release_at}
                onChange={(e) => setFormData({ ...formData, room_release_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
              <span className="text-[11px] text-zinc-500">Encrypted room credentials unlocked to confirmed players at this time.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Official Match Start
              </label>
              <input
                type="datetime-local"
                value={formData.match_start_at}
                onChange={(e) => setFormData({ ...formData, match_start_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 4: Secret Room Credentials */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <Key className="h-4 w-4 text-amber-500" /> 4. Free Fire Custom Room Credentials (Encrypted at Rest)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Custom Room ID
              </label>
              <input
                type="text"
                placeholder="e.g. 98124501"
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Room Password
              </label>
              <input
                type="text"
                placeholder="e.g. 7788"
                value={formData.room_password}
                onChange={(e) => setFormData({ ...formData, room_password: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-start gap-2 text-xs text-zinc-400">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Credentials are encrypted using AES-256-GCM prior to database insertion. They are NEVER exposed in public match endpoints and will only be released to confirmed registered participants after the configured release timestamp.
            </span>
          </div>
        </div>

        {/* Form CTA */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/matches"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-sm transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50"
          >
            {loading ? "Publishing Tournament..." : "Publish Tournament"}
          </button>
        </div>
      </form>
    </div>
  );
}
