import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiUrl || 
  "https://free-fire-game-rose.vercel.app/api/v1";

const TOKEN_KEY = "clashiq_auth_token";

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (err) {
    console.error("Failed to persist secure token", err);
  }
}

export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    console.error("Failed to delete secure token", err);
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function mobileApiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getStoredToken();
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Safe timeout via Promise.race: avoids calling native OkHttp controller.abort()
  // which crashes the Android process under React Native 0.76 (Hermes)
  const TIMEOUT_MS = 5000;
  const timeoutPromise = new Promise<ApiResponse<T>>((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        error: {
          code: "TIMEOUT",
          message: "Connection timed out. Please check your network.",
        },
      });
    }, TIMEOUT_MS);
  });

  const fetchPromise = (async (): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Gracefully handle non-JSON responses (such as Vercel HTML 404/502) without throwing SyntaxError
        return {
          success: false,
          error: {
            code: `HTTP_${res.status}`,
            message: res.ok
              ? "Received unexpected server response"
              : `Server returned status ${res.status}`,
          },
        };
      }

      const data = await res.json();
      return data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error?.message || "Failed to reach Clashiq game server",
        },
      };
    }
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

export const mobileApi = {
  // Authentication (Firebase federated Google/Facebook login)
  authenticateFirebase: (idToken: string) =>
    mobileApiRequest("/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    }),

  getProfile: () => mobileApiRequest("/users/me/profile"),

  // Gaming Identity (Free Fire UID & IGN)
  getGamingIdentity: () => mobileApiRequest("/gaming-identities/me"),
  linkGamingIdentity: (gameId: string, gameUid: string, inGameName: string) =>
    mobileApiRequest("/gaming-identities/", {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, game_uid: gameUid, in_game_name: inGameName }),
    }),
  requestUidChange: (identityId: string, newGameUid: string, newInGameName: string, reason: string) =>
    mobileApiRequest(`/gaming-identities/${identityId}/request-change`, {
      method: "POST",
      body: JSON.stringify({ new_game_uid: newGameUid, new_in_game_name: newInGameName, reason }),
    }),

  // Matches & Tournament Engine
  getMatches: (status?: string) =>
    mobileApiRequest(`/matches${status ? `?status=${status}` : ""}`),
  getMatch: (matchId: string) => mobileApiRequest(`/matches/${matchId}`),
  getMyMatches: (status?: string) =>
    mobileApiRequest(`/my-matches${status ? `?tab=${status}` : ""}`),
  getMatchSlots: (matchId: string) => mobileApiRequest(`/matches/${matchId}/slots`),

  // Slot Reservation & Concurrency Lock
  reserveSlot: (matchId: string, slotNumber: number, gamingIdentityId: string) =>
    mobileApiRequest(`/matches/${matchId}/reserve-slot`, {
      method: "POST",
      body: JSON.stringify({ slot_number: slotNumber, gaming_identity_id: gamingIdentityId }),
    }),

  // Timed Room Credentials (AES decrypted at release)
  getMatchRoom: (matchId: string) => mobileApiRequest(`/matches/${matchId}/room`),

  // Razorpay Payments
  createRazorpayOrder: (matchId: string, registrationId: string, amountPaise: number) =>
    mobileApiRequest("/payments/create-order", {
      method: "POST",
      body: JSON.stringify({
        match_id: matchId,
        registration_id: registrationId,
        amount_paise: amountPaise,
      }),
    }),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    mobileApiRequest("/payments/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Wallet & Double-Entry Ledger
  getWallet: () => mobileApiRequest("/wallet"),
  getWalletTransactions: (limit = 30) =>
    mobileApiRequest(`/wallet/transactions?limit=${limit}`),

  // Leaderboard
  getLeaderboard: () => mobileApiRequest("/leaderboard"),
};
