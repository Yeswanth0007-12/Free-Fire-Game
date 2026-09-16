"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "./api";

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

  const refreshUser = async () => {
    const res = await apiRequest<User>("/me");
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      setUser(null);
    }
  };

  const refreshWallet = async () => {
    const res = await apiRequest<Wallet>("/wallet");
    if (res.success && res.data) {
      setWallet(res.data);
    }
  };

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
  }, []);

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
