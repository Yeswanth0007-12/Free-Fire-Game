"use client";

import { useState, useEffect } from "react";
import { 
  Users, Search, Shield, ShieldAlert, ShieldCheck, 
  Ban, CheckCircle, RefreshCw, AlertTriangle 
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers({ limit: 100, search: search || undefined });
      if (res.success && res.data) {
        setUsers(Array.isArray(res.data) ? res.data : (res.data.users || []));
      }
    } catch (err: any) {
      console.error(err);
      setMsg({ text: "Failed to fetch user directory", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    try {
      const res = await api.updateUserStatus(userId, newStatus);
      if (res.success) {
        setMsg({ text: `User account status updated to ${newStatus}`, type: "success" });
        fetchUsers();
      } else {
        setMsg({ text: res.error?.message || "Failed to update user", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Action failed", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await api.updateUserRole(userId, newRole);
      if (res.success) {
        setMsg({ text: `User role updated to ${newRole}`, type: "success" });
        fetchUsers();
      } else {
        setMsg({ text: res.error?.message || "Failed to update role", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Action failed", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" /> Player & User Directory
          </h1>
          <p className="text-sm text-zinc-400">
            RBAC roles, Free Fire UID inspection, account status moderation, and anti-fraud management.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/40 border-red-800/60 text-red-300"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl">
        <Search className="h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Filter by email or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          onClick={fetchUsers}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
            Querying account directory...
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            No registered users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User / Email</th>
                  <th className="py-3 px-4">Free Fire Profile</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{u.email}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{u.id}</div>
                    </td>

                    <td className="py-3 px-4">
                      {u.profile ? (
                        <div>
                          <div className="font-medium text-zinc-200">{u.profile.display_name}</div>
                          <div className="text-[11px] text-amber-400 font-mono">
                            UID: {u.profile.free_fire_uid || "Not Linked"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic">No profile linked</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={actionLoading === u.id}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 font-semibold focus:outline-none focus:border-amber-500"
                      >
                        <option value="PLAYER">PLAYER</option>
                        <option value="MATCH_HOST">MATCH_HOST</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        u.status === "BANNED" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-zinc-400">
                      {formatDate(u.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      {u.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleUpdateStatus(u.id, "BANNED")}
                          disabled={actionLoading === u.id}
                          className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          Ban User
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(u.id, "ACTIVE")}
                          disabled={actionLoading === u.id}
                          className="px-2.5 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          Unban User
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
