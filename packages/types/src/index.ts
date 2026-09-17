// Core Shared Types for IGNITE FF Platform

export type UserRole = "PLAYER" | "ADMIN" | "SUPER_ADMIN" | "MATCH_HOST" | "SUPPORT";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_VERIFICATION";

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  is_verified: boolean;
  created_at: string;
}

export type GamingIdentityStatus =
  | "UNVERIFIED"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "LOCKED"
  | "UID_CHANGE_REQUESTED";

export interface GamingIdentity {
  id: string;
  user_id: string;
  game: string;
  free_fire_uid: string;
  nickname: string;
  status: GamingIdentityStatus;
  verified_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  free_fire_uid: string;
  free_fire_name: string;
  total_matches: number;
  total_wins: number;
  total_losses: number;
  total_winnings_minor: number;
  current_streak: number;
}

export type MatchStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "REGISTRATION_OPEN"
  | "FULL"
  | "REGISTRATION_CLOSED"
  | "ROOM_PENDING"
  | "ROOM_READY"
  | "ROOM_RELEASED"
  | "IN_PROGRESS"
  | "AWAITING_RESULT"
  | "RESULT_SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "SETTLED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type SlotStatus = "AVAILABLE" | "RESERVED" | "CONFIRMED" | "BLOCKED";

export interface MatchSlot {
  id: string;
  slot_number: number;
  team_id?: string | null;
  status: SlotStatus;
  is_my_slot?: boolean;
  reserved_until?: string | null;
  confirmed_at?: string | null;
}

export interface MatchSlotsSummary {
  match_id: string;
  max_slots: number;
  available_slots: number;
  reserved_slots: number;
  confirmed_slots: number;
  slots: MatchSlot[];
}

export interface Match {
  id: string;
  public_match_code: string;
  game_id: string;
  mode_id: string;
  map_name: string;
  match_format: string; // 1v1, 2v2, 4v4, SOLO
  entry_fee_minor: number; // in paise
  prize_pool_minor: number; // in paise
  currency: string;
  max_players: number;
  current_players: number;
  registration_start_at: string;
  registration_close_at: string;
  match_start_at: string;
  room_release_at: string;
  status: MatchStatus;
  room_release_status?: "PENDING" | "RELEASED";
  health_state?: "HEALTHY" | "WARNING" | "ACTION_REQUIRED" | "ERROR";
  rules_text?: string | null;
  is_registered?: boolean;
  mode?: {
    id: string;
    name: string;
    slug: string;
    team_size: number;
  };
}

export interface RoomCredentials {
  match_id: string;
  public_match_code: string;
  room_id?: string | null;
  room_password?: string | null;
  is_released: boolean;
  release_time: string;
  message: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  currency: string;
  available_balance_minor: number; // integer paise
  winning_balance_minor: number;
  locked_balance_minor: number;
}

export type TransactionType =
  | "ENTRY_FEE"
  | "PRIZE"
  | "REFUND"
  | "WITHDRAWAL"
  | "BONUS"
  | "ADJUSTMENT"
  | "REVERSAL"
  | "DEPOSIT";

export type TransactionDirection = "CREDIT" | "DEBIT";

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount_minor: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  reference_type?: string | null;
  reference_id?: string | null;
  description?: string | null;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}
