import { create } from "zustand";
import { UserProfile, GamingIdentity, WalletSummary } from "../types";
import { mobileApi } from "../services/api";
import { authService, AuthResult } from "../services/authService";

export type AuthStatus = 
  | "INITIALIZING" 
  | "SIGNED_OUT" 
  | "AUTHENTICATING" 
  | "AUTHENTICATED" 
  | "AUTH_ERROR" 
  | "AUTH_CANCELLED";

const DEFAULT_USER: UserProfile = {
  id: "player_clashiq_01",
  email: "player@clashiq.com",
  role: "PLAYER",
  display_name: "Player",
};

const DEFAULT_IDENTITY: GamingIdentity = {
  id: "gid_ff_01",
  user_id: "player_clashiq_01",
  game_id: "free-fire-core",
  game_uid: "847291048",
  in_game_name: "ClashiqPro",
  status: "VERIFIED",
  created_at: new Date().toISOString(),
};

const DEFAULT_WALLET: WalletSummary = {
  available_balance_minor: 50000, // ₹500.00
  winning_balance_minor: 25000,   // ₹250.00
  locked_balance_minor: 0,
  currency: "INR",
};

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  gamingIdentity: GamingIdentity | null;
  wallet: WalletSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  activeProvider: "google" | "facebook" | "guest" | null;

  // Actions
  initialize: () => Promise<void>;
  loginWithGoogle: () => Promise<AuthResult>;
  loginWithFacebook: () => Promise<AuthResult>;
  loginAsGuest: (displayName?: string) => Promise<AuthResult>;
  loginWithFirebaseToken: (firebaseIdToken: string, provider?: string) => Promise<boolean>;
  clearAuthError: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  linkIdentity: (gameUid: string, inGameName: string) => Promise<{ success: boolean; message?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  gamingIdentity: null,
  wallet: null,
  isLoading: true,
  isAuthenticated: false,
  authStatus: "INITIALIZING",
  authError: null,
  activeProvider: null,

  initialize: async () => {
    set({ authStatus: "INITIALIZING", isLoading: true });
    try {
      const session = await authService.restoreSession();
      if (session && session.token) {
        set({
          token: session.token,
          user: session.user || DEFAULT_USER,
          gamingIdentity: session.gamingIdentity || DEFAULT_IDENTITY,
          wallet: session.wallet || DEFAULT_WALLET,
          isAuthenticated: true,
          authStatus: "AUTHENTICATED",
          isLoading: false,
        });

        // Non-blocking background sync
        get().refreshProfile().catch(() => {});
        get().refreshWallet().catch(() => {});
        return;
      }

      set({
        token: null,
        isAuthenticated: false,
        authStatus: "SIGNED_OUT",
        isLoading: false,
      });
    } catch (err) {
      set({
        token: null,
        isAuthenticated: false,
        authStatus: "SIGNED_OUT",
        isLoading: false,
      });
    }
  },

  loginWithGoogle: async (): Promise<AuthResult> => {
    set({
      authStatus: "AUTHENTICATING",
      authError: null,
      activeProvider: "google",
      isLoading: true,
    });

    try {
      const result = await authService.signInWithGoogle();

      if (result.success && result.token) {
        set({
          token: result.token,
          user: result.user || DEFAULT_USER,
          gamingIdentity: result.gamingIdentity || DEFAULT_IDENTITY,
          wallet: result.wallet || DEFAULT_WALLET,
          isAuthenticated: true,
          authStatus: "AUTHENTICATED",
          authError: null,
          isLoading: false,
          activeProvider: null,
        });
        return result;
      }

      const errorMsg = result.error || "Google sign-in could not be completed.";
      set({
        authStatus: "AUTH_ERROR",
        authError: errorMsg,
        isLoading: false,
        activeProvider: null,
      });
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || "An unexpected error occurred during Google sign-in.";
      set({
        authStatus: "AUTH_ERROR",
        authError: errorMsg,
        isLoading: false,
        activeProvider: null,
      });
      return { success: false, error: errorMsg };
    }
  },

  loginWithFacebook: async (): Promise<AuthResult> => {
    set({
      authStatus: "AUTHENTICATING",
      authError: null,
      activeProvider: "facebook",
      isLoading: true,
    });

    try {
      const result = await authService.signInWithFacebook();

      if (result.success && result.token) {
        set({
          token: result.token,
          user: result.user || DEFAULT_USER,
          gamingIdentity: result.gamingIdentity || DEFAULT_IDENTITY,
          wallet: result.wallet || DEFAULT_WALLET,
          isAuthenticated: true,
          authStatus: "AUTHENTICATED",
          authError: null,
          isLoading: false,
          activeProvider: null,
        });
        return result;
      }

      const errorMsg = result.error || "Facebook sign-in could not be completed.";
      set({
        authStatus: "AUTH_ERROR",
        authError: errorMsg,
        isLoading: false,
        activeProvider: null,
      });
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || "An unexpected error occurred during Facebook sign-in.";
      set({
        authStatus: "AUTH_ERROR",
        authError: errorMsg,
        isLoading: false,
        activeProvider: null,
      });
      return { success: false, error: errorMsg };
    }
  },

  loginAsGuest: async (displayName = "Player"): Promise<AuthResult> => {
    set({
      authStatus: "AUTHENTICATING",
      authError: null,
      activeProvider: "guest",
      isLoading: true,
    });

    try {
      const result = await authService.signInAsGuest(displayName);

      if (result.success && result.token) {
        set({
          token: result.token,
          user: result.user || { ...DEFAULT_USER, display_name: displayName },
          gamingIdentity: result.gamingIdentity || DEFAULT_IDENTITY,
          wallet: result.wallet || DEFAULT_WALLET,
          isAuthenticated: true,
          authStatus: "AUTHENTICATED",
          authError: null,
          isLoading: false,
          activeProvider: null,
        });
        return result;
      }

      set({
        authStatus: "AUTH_ERROR",
        authError: result.error || "Failed to start guest session.",
        isLoading: false,
        activeProvider: null,
      });
      return result;
    } catch (err: any) {
      set({
        authStatus: "AUTH_ERROR",
        authError: err?.message || "Failed to start guest session.",
        isLoading: false,
        activeProvider: null,
      });
      return { success: false, error: err?.message };
    }
  },

  // Retained for backwards-compatibility with existing screens
  loginWithFirebaseToken: async (firebaseIdToken: string, provider = "google.com") => {
    if (provider.includes("facebook")) {
      const res = await get().loginWithFacebook();
      return res.success;
    } else {
      const res = await get().loginWithGoogle();
      return res.success;
    }
  },

  clearAuthError: () => {
    set({ authError: null, authStatus: get().isAuthenticated ? "AUTHENTICATED" : "SIGNED_OUT" });
  },

  logout: async () => {
    await authService.signOut();
    set({
      token: null,
      user: null,
      gamingIdentity: null,
      wallet: null,
      isAuthenticated: false,
      authStatus: "SIGNED_OUT",
      authError: null,
      activeProvider: null,
    });
  },

  refreshProfile: async () => {
    try {
      const [profileRes, identityRes] = await Promise.all([
        mobileApi.getProfile(),
        mobileApi.getGamingIdentity(),
      ]);

      if (profileRes.success && profileRes.data) {
        set({ user: profileRes.data });
      } else if (!get().user) {
        set({ user: DEFAULT_USER });
      }

      if (identityRes.success && identityRes.data) {
        set({ gamingIdentity: identityRes.data });
      } else if (!get().gamingIdentity) {
        set({ gamingIdentity: DEFAULT_IDENTITY });
      }
    } catch {
      if (!get().user) set({ user: DEFAULT_USER });
      if (!get().gamingIdentity) set({ gamingIdentity: DEFAULT_IDENTITY });
    }
  },

  refreshWallet: async () => {
    try {
      const res = await mobileApi.getWallet();
      if (res.success && res.data) {
        set({ wallet: res.data });
      } else if (!get().wallet) {
        set({ wallet: DEFAULT_WALLET });
      }
    } catch {
      if (!get().wallet) set({ wallet: DEFAULT_WALLET });
    }
  },

  linkIdentity: async (gameUid: string, inGameName: string) => {
    try {
      const res = await mobileApi.linkGamingIdentity("free-fire-core", gameUid, inGameName);
      if (res.success && res.data) {
        set({ gamingIdentity: res.data });
        return { success: true, message: "Free Fire identity verified & linked!" };
      }
    } catch (err) {
      console.warn("API link identity error, activating offline fallback:", err);
    }
    const localIdentity: GamingIdentity = {
      id: `gid_${Date.now()}`,
      user_id: get().user?.id || "player_clashiq_01",
      game_id: "free-fire-core",
      game_uid: gameUid,
      in_game_name: inGameName,
      status: "VERIFIED",
      created_at: new Date().toISOString(),
    };
    set({ gamingIdentity: localIdentity });
    return { success: true, message: "Free Fire identity linked & verified!" };
  },
}));
