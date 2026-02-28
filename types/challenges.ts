// ── Challenge-System Typen ───────────────────────────────────

export interface ChallengeCreator {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  completed: boolean;
  completed_at: string | null;
  user?: ChallengeCreator;
}

export interface ChallengeProgress {
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  completed: boolean;
  checkins: { day_number: number; checked_at: string; note: string | null }[];
}

export interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  emoji: string;
  duration_days: number;
  starts_at: string;
  ends_at: string;
  pulse_id: string | null;
  message_id: string | null;
  channel_id: string | null;
  participants_count: number;
  max_participants: number | null;
  is_public: boolean;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  creator?: ChallengeCreator;
  participants?: ChallengeParticipant[];
  my_progress?: ChallengeProgress | null;
  has_joined?: boolean;
}

export interface CreateChallengeData {
  title: string;
  description?: string;
  emoji?: string;
  duration_days: number;
  starts_at?: string;
  max_participants?: number;
  is_public?: boolean;
  channel_id?: string;
}

export interface CheckinResult {
  day_number: number;
  current_streak: number;
  total_checkins: number;
  completed: boolean;
}
