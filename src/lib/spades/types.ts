// Row shapes for the sp_* tables (see supabase-migration-spades.sql).

export type TournamentStatus = 'draft' | 'registration' | 'locked' | 'live' | 'completed' | 'archived'
export type TeamStatus = 'pending' | 'approved' | 'waitlist' | 'rejected'
export type MatchStatus = 'pending' | 'ready' | 'live' | 'paused' | 'completed' | 'final'
export type HandStatus = 'bidding' | 'playing' | 'review' | 'disputed' | 'verified' | 'void'
export type StaffRole = 'director' | 'supervisor'
export type DisputeKind = 'report_mismatch' | 'renege' | 'other' | 'correction_request' | 'director_request' | 'forfeit_report'

export interface TournamentRow {
  id: string
  slug: string
  name: string
  subtitle: string | null
  venue: string | null
  address: string | null
  timezone: string
  starts_at: string | null
  ends_at: string | null
  schedule_note: string | null
  award: string | null
  status: TournamentStatus
  capacity: number
  registration_open: boolean
  waitlist_enabled: boolean
  roster_locked: boolean
  bracket_published: boolean
  is_featured: boolean
  champion_team_id: string | null
  rules: unknown
  pulse: string
  created_at: string
  updated_at: string
}

export interface TeamRow {
  id: string
  tournament_id: string
  name: string
  name_key: string
  status: TeamStatus
  seed: number | null
  contact: string | null
  checked_in_at: string | null
  created_at: string
}

export interface PlayerRow {
  id: string
  tournament_id: string
  team_id: string
  seat: number
  display_name: string
  name_key: string
  is_captain: boolean
  contact: string | null
  created_at: string
}

export interface StaffRow {
  id: string
  tournament_id: string
  display_name: string
  role: StaffRole
  active: boolean
  contact: string | null
  created_at: string
}

export interface TableRow {
  id: string
  tournament_id: string
  number: number
  label: string | null
  supervisor_id: string | null
  created_at: string
}

export interface MatchRow {
  id: string
  tournament_id: string
  round: number
  slot: number
  team_a_id: string | null
  team_b_id: string | null
  table_id: string | null
  status: MatchStatus
  winner_team_id: string | null
  result_kind: 'played' | 'forfeit' | 'dq' | 'bye' | null
  result_note: string | null
  target: number
  time_limit_min: number
  rules: unknown
  started_at: string | null
  paused_at: string | null
  paused_ms: number
  completed_at: string | null
  completion_verified_by: string | null
  finalized_at: string | null
  score_a: number
  score_b: number
  bags_a: number
  bags_b: number
  hands_verified: number
  version: number
  created_at: string
}

export interface HandRow {
  id: string
  tournament_id: string
  match_id: string
  hand_number: number
  status: HandStatus
  dealer_pos: number
  is_tiebreak: boolean
  bids_locked_at: string | null
  books_a: number | null
  books_b: number | null
  renege_team_id: string | null
  ruling: string | null
  verified_at: string | null
  version: number
  created_at: string
}

export interface BidRow {
  id: string
  tournament_id: string
  match_id: string
  hand_id: string
  player_id: string
  team_id: string
  bid: number
  entered_by_kind: string
  entered_by_id: string | null
  entered_by_name: string | null
  active: boolean
  superseded_at: string | null
  created_at: string
}

export interface ReportRow {
  id: string
  tournament_id: string
  match_id: string
  hand_id: string
  team_id: string
  books_a: number
  books_b: number
  reporter_kind: string
  reporter_id: string | null
  reporter_name: string | null
  active: boolean
  superseded_at: string | null
  created_at: string
}

export interface ApprovalRow {
  id: string
  tournament_id: string
  match_id: string
  hand_id: string
  team_id: string
  approver_kind: string
  approver_id: string | null
  approver_name: string | null
  created_at: string
}

export interface LedgerRow {
  id: string
  tournament_id: string
  match_id: string
  hand_id: string
  hand_number: number
  team_id: string
  bid: number
  books: number
  made: boolean
  renege: boolean
  points: number
  bags_earned: number
  bag_penalty: number
  total_after: number
  bags_after: number
  created_at: string
}

export interface DisputeRow {
  id: string
  tournament_id: string
  match_id: string
  hand_id: string | null
  kind: DisputeKind
  status: 'open' | 'resolved' | 'dismissed'
  raised_by_kind: string
  raised_by_id: string | null
  raised_by_name: string | null
  reason: string
  resolution: string | null
  resolved_by_name: string | null
  resolved_at: string | null
  created_at: string
}

export interface AuditRow {
  id: number
  tournament_id: string | null
  match_id: string | null
  hand_id: string | null
  actor_kind: string
  actor_id: string | null
  actor_name: string | null
  actor_role: string | null
  action: string
  before: unknown
  after: unknown
  reason: string | null
  created_at: string
}

export interface InviteRow {
  id: string
  tournament_id: string
  kind: 'player' | 'staff'
  player_id: string | null
  staff_id: string | null
  token_hash: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface SessionRow {
  id: string
  token_hash: string
  kind: 'owner' | 'staff' | 'player'
  tournament_id: string | null
  player_id: string | null
  staff_id: string | null
  invitation_id: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
}
