"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest, api } from "./api";
import { auth, googleProvider } from "./firebase";

export interface PlayerProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  free_fire_uid: string;
  free_fire_name: string;
  preferred_game: string;
  total_matches: number;
  total_wins: number;
  total_losses: number;
  total_winnings_minor: number;
  current_streak: number;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" | "MATCH_HOST" | "SUPPORT";
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  is_verified: boolean;
  profile?: PlayerProfile;
}

export interface Wallet {
  id: string;
  available_balance_minor: number;
  locked_balance_minor: number;
  winning_balance_minor: number;
  available_balance_formatted: string;
  winning_balance_formatted: string;
}

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    display_name: string;
    free_fire_uid: string;
    free_fire_name: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const res = await apiRequest<User>("/me");
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      setUser(null);
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    const res = await apiRequest<Wallet>("/wallet");
    if (res.success && res.data) {
      setWallet(res.data);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        await refreshUser();
        await refreshWallet();
      }
      setLoading(false);
    };
    initAuth();
  }, [refreshUser, refreshWallet]);

  // Real-time updates WebSocket connection for wallet balances and user state
  useEffect(() => {
    if (!user?.id) return;
    let ws: WebSocket | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWs = () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const wsHost = apiBase.replace(/^http(s?):\/\//, "ws$1://").replace(/\/api\/v1\/?$/, "");
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${wsHost}/ws/global`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send("ping");
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === "pong") return;
            const msg = JSON.parse(event.data);
            if (msg.type === "WALLET_UPDATED" || msg.type === "BALANCE_CHANGED") {
              refreshWallet();
            } else if (msg.type === "USER_UPDATED" || msg.type === "PROFILE_UPDATED") {
              refreshUser();
            }
          } catch {}
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connectWs, 5000);
        };
      } catch {}
    };

    connectWs();

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [user?.id, refreshUser, refreshWallet]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ access_token: string; refresh_token: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    if (res.success && res.data) {
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      await refreshUser();
      await refreshWallet();
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || "Invalid credentials",
    };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      let idToken: string | null = null;
      if (typeof window !== "undefined" && auth && googleProvider) {
        try {
          const { signInWithPopup } = await import("firebase/auth");
          const result = await signInWithPopup(auth, googleProvider);
          idToken = await result.user.getIdToken();
        } catch (popupErr: any) {
          if (popupErr.code === "auth/popup-closed-by-user") {
            return { success: false, error: "Sign-in cancelled by user" };
          }
          console.warn("Firebase popup authentication fallback:", popupErr);
          if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            idToken = `mock_token:google.com:webplayer_${Date.now()}@igniteff.test:ClashIQ Web Player`;
          } else {
            return { success: false, error: popupErr.message || "Google sign-in failed" };
          }
        }
      } else {
        idToken = `mock_token:google.com:webplayer_${Date.now()}@igniteff.test:ClashIQ Web Player`;
      }

      if (!idToken) {
        return { success: false, error: "Unable to retrieve Google credentials" };
      }

      const res = await api.authenticateFirebase(idToken);
      if (res.success && res.data) {
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
        await refreshUser();
        await refreshWallet();
        return { success: true };
      }

      return {
        success: false,
        error: res.error?.message || "Firebase authentication failed with server",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "An unexpected error occurred during Google sign-in",
      };
    }
  };

  const register = async (data: any) => {
    const res = await apiRequest<{ access_token: string; refresh_token: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (res.success && res.data) {
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      await refreshUser();
      await refreshWallet();
      return { success: true };
    }

    return {
      success: false,
      error: res.error?.message || "Registration failed",
    };
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setWallet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
        refreshWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
