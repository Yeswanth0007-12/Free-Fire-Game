// Clashiq Mobile Type Definitions

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
  game_id: string;
  game_uid: string;
  in_game_name: string;
  status: GamingIdentityStatus;
  verified_at?: string;
  created_at: string;
}

export interface MatchSlot {
  id: string;
  slot_number: number;
  team_id?: string;
  team_name?: string;
  status: SlotStatus;
  is_mine: boolean;
  reserved_until?: string;
}

export interface MatchSummary {
  id: string;
  public_match_code: string;
  match_format: string;
  map_name: string;
  status: MatchStatus;
  entry_fee_minor: number;
  prize_pool_minor: number;
  max_players: number;
  current_players: number;
  registration_start_at: string;
  registration_close_at: string;
  room_release_at: string;
  match_start_at: string;
  room_release_status: "PENDING" | "RELEASED";
  is_registered?: boolean;
}

export interface MatchRoomDetails {
  match_id: string;
  room_id: string;
  room_password: string;
  released_at: string;
  instructions: string[];
}

export interface WalletSummary {
  available_balance_minor: number;
  winning_balance_minor: number;
  locked_balance_minor: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  transaction_type: "ENTRY_FEE" | "PRIZE" | "REFUND" | "WITHDRAWAL" | "ADJUSTMENT";
  amount_minor: number;
  direction: "CREDIT" | "DEBIT";
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "PLAYER" | "MATCH_HOST" | "ADMIN" | "SUPER_ADMIN";
  display_name: string;
  avatar_url?: string;
  gaming_identity?: GamingIdentity;
}
