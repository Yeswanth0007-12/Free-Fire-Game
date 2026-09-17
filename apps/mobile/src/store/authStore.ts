import { create } from "zustand";
import { UserProfile, GamingIdentity, WalletSummary } from "../types";
import { getStoredToken, setStoredToken, clearStoredToken, mobileApi } from "../services/api";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  gamingIdentity: GamingIdentity | null;
  wallet: WalletSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  loginWithFirebaseToken: (firebaseIdToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  gamingIdentity: null,
  wallet: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        set({ token, isAuthenticated: true });
        await get().refreshProfile();
        await get().refreshWallet();
      }
    } catch (err) {
      console.error("Auth init error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithFirebaseToken: async (firebaseIdToken: string) => {
    set({ isLoading: true });
    try {
      const res = await mobileApi.authenticateFirebase(firebaseIdToken);
      if (res.success && res.data) {
        const sessionToken = res.data.access_token || res.data.token;
        await setStoredToken(sessionToken);
        set({ token: sessionToken, isAuthenticated: true });
        await get().refreshProfile();
        await get().refreshWallet();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Firebase exchange error:", err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await clearStoredToken();
    set({ token: null, user: null, gamingIdentity: null, wallet: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    try {
      const [profileRes, identityRes] = await Promise.all([
        mobileApi.getProfile(),
        mobileApi.getGamingIdentity(),
      ]);

      if (profileRes.success && profileRes.data) {
        set({ user: profileRes.data });
      }
      if (identityRes.success && identityRes.data) {
        set({ gamingIdentity: identityRes.data });
      }
    } catch (err) {
      console.error("Refresh profile failed", err);
    }
  },

  refreshWallet: async () => {
    try {
      const res = await mobileApi.getWallet();
      if (res.success && res.data) {
        set({ wallet: res.data });
      }
    } catch (err) {
      console.error("Refresh wallet failed", err);
    }
  },
}));
