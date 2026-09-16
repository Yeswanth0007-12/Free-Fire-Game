"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Bell, CheckCheck, CheckCircle2, Flame, Trophy, AlertTriangle } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const res = await apiRequest<any[]>("/notifications?limit=50");
    if (res.success && res.data) {
      setNotifications(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    await apiRequest("/notifications/read-all", { method: "POST" });
    await loadNotifications();
  };

  const markRead = async (id: string) => {
    await apiRequest(`/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Room credentials releases, match start reminders, and wallet settlement credits
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <CheckCheck className="h-4 w-4 text-emerald-400" />
            Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="font-bold text-lg text-white">No Notifications</h3>
          <p className="text-xs text-slate-400 mt-1">
            You are all caught up! Notifications about your tournament rooms will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800 shadow-xl">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start justify-between p-4 sm:p-5 transition ${
                notif.is_read ? "bg-slate-950/40" : "bg-slate-900/80"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                  {notif.type === "PRIZE_CREDITED" ? (
                    <Trophy className="h-4 w-4 text-amber-400" />
                  ) : notif.type === "ROOM_READY" ? (
                    <Flame className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-white text-sm">{notif.title}</h4>
                    {!notif.is_read && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                  <span className="text-[11px] text-slate-500 mt-2 block">{formatDate(notif.created_at)}</span>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => markRead(notif.id)}
                  title="Mark as read"
                  className="text-slate-500 hover:text-emerald-400 transition ml-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
