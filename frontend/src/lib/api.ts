const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: any }> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Attach token from localStorage if in browser and not explicitly passed
  if (typeof window !== "undefined") {
    const token = options.token || localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error.message || "Failed to communicate with tournament server",
      },
    };
  }
}

// Centralized API Client Object
export const api = {
  // Auth
  register: (data: any) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => apiRequest("/auth/me"),
  updateProfile: (data: any) => apiRequest("/users/me/profile", { method: "PATCH", body: JSON.stringify(data) }),

  // Games & Modes
  getGames: () => apiRequest("/games"),
  getGameModes: (gameId: string) => apiRequest(`/games/${gameId}/modes`),

  // Matches
  getMatches: (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.mode_id) query.append("mode_id", params.mode_id);
    if (params.limit) query.append("limit", params.limit.toString());
    const qs = query.toString();
    return apiRequest(`/matches${qs ? `?${qs}` : ""}`);
  },
  getMatch: (matchId: string) => apiRequest(`/matches/${matchId}`),
  joinMatch: (matchId: string) => apiRequest(`/matches/${matchId}/join`, { method: "POST" }),
  getMyMatches: (status?: string) => apiRequest(`/matches/my${status ? `?status=${status}` : ""}`),

  // Wallet & Payments
  getWallet: () => apiRequest("/wallet"),
  getWalletTransactions: (limit = 20) => apiRequest(`/wallet/transactions?limit=${limit}`),
  createPaymentOrder: (data: { match_id?: string; amount_paise: number }) =>
    apiRequest("/payments/create-order", { method: "POST", body: JSON.stringify(data) }),
  verifyPayment: (data: any) => apiRequest("/payments/verify", { method: "POST", body: JSON.stringify(data) }),
  requestWithdrawal: (data: any) => apiRequest("/wallet/withdraw", { method: "POST", body: JSON.stringify(data) }),

  // Disputes & Notifications
  createDispute: (data: any) => apiRequest("/disputes", { method: "POST", body: JSON.stringify(data) }),
  getMyDisputes: () => apiRequest("/disputes/my"),
  getNotifications: () => apiRequest("/notifications"),
  markNotificationRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: "POST" }),

  // Leaderboard
  getLeaderboard: (timeframe = "all_time") => apiRequest(`/leaderboard?timeframe=${timeframe}`),

  // Admin APIs
  getAdminStats: () => apiRequest("/admin/stats"),
  getAdminUsers: (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.limit) query.append("limit", params.limit.toString());
    const qs = query.toString();
    return apiRequest(`/admin/users${qs ? `?${qs}` : ""}`);
  },
  updateUserStatus: (userId: string, status: string) =>
    apiRequest(`/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  updateUserRole: (userId: string, role: string) =>
    apiRequest(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  createMatch: (data: any) => apiRequest("/admin/matches", { method: "POST", body: JSON.stringify(data) }),
  updateMatch: (matchId: string, data: any) =>
    apiRequest(`/admin/matches/${matchId}`, { method: "PATCH", body: JSON.stringify(data) }),
  getAdminHealth: () => apiRequest("/admin/system/health"),
  getGamingIdentities: (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.limit) query.append("limit", params.limit.toString());
    const qs = query.toString();
    return apiRequest(`/gaming-identities/admin/list${qs ? `?${qs}` : ""}`);
  },
  verifyGamingIdentity: (identityId: string, status: string, notes?: string) =>
    apiRequest(`/gaming-identities/admin/${identityId}/verify`, { method: "POST", body: JSON.stringify({ status, notes }) }),
  cancelMatch: (matchId: string, reason?: string) =>
    apiRequest(`/admin/matches/${matchId}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  submitMatchResult: (matchId: string, data: any) =>
    apiRequest(`/admin/matches/${matchId}/result`, { method: "POST", body: JSON.stringify(data) }),
  approveMatchResult: (matchId: string) =>
    apiRequest(`/admin/matches/${matchId}/approve`, { method: "POST" }),
  rejectMatchResult: (matchId: string, reason: string) =>
    apiRequest(`/admin/matches/${matchId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  getAdminDisputes: (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append("limit", params.limit.toString());
    const qs = query.toString();
    return apiRequest(`/admin/disputes${qs ? `?${qs}` : ""}`);
  },
  resolveDispute: (disputeId: string, data: any) =>
    apiRequest(`/admin/disputes/${disputeId}/resolve`, { method: "POST", body: JSON.stringify(data) }),
  getAdminAuditLogs: (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append("limit", params.limit.toString());
    const qs = query.toString();
    return apiRequest(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },
  getAdminRiskFlags: (params: any = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append("limit", params.limit.toString());
    const qs = query.toString();
    return apiRequest(`/admin/risk-flags${qs ? `?${qs}` : ""}`);
  },
};
