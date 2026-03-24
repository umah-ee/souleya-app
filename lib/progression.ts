import { apiFetch } from './api';

// ── Types ──

export interface ProgressionRequirement {
  key: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface ProgressionStatus {
  currentLevel: number;
  currentLevelName: string;
  nextLevel: number | null;
  nextLevelName: string | null;
  requirements: ProgressionRequirement[];
  overallProgress: number;
  unlocksAtNextLevel: string[];
}

export interface LevelHistoryEntry {
  id: string;
  from_level: number;
  to_level: number;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── API Calls ──

export async function fetchProgression() {
  return apiFetch<ProgressionStatus>('/users/me/progression');
}

export async function fetchLevelHistory() {
  return apiFetch<{ data: LevelHistoryEntry[] }>('/users/me/level-history');
}

export async function checkOnboarding() {
  return apiFetch<{
    leveled_up: boolean;
    new_level: number;
    new_level_name: string;
    message: string;
  }>('/users/me/onboarding', { method: 'POST' });
}

// ── Event Reviews ──

export interface EventReview {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_first_light: boolean;
    soul_level: number;
  };
}

export async function fetchEventReviews(eventId: string, page = 1) {
  return apiFetch<{ data: EventReview[]; total: number; hasMore: boolean }>(
    `/events/${eventId}/reviews?page=${page}`,
  );
}

export async function createEventReview(eventId: string, rating: number, comment?: string) {
  return apiFetch<EventReview>(`/events/${eventId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}

export async function updateEventReview(eventId: string, rating: number, comment?: string) {
  return apiFetch<EventReview>(`/events/${eventId}/reviews`, {
    method: 'PUT',
    body: JSON.stringify({ rating, comment }),
  });
}

export async function deleteEventReview(eventId: string) {
  return apiFetch<void>(`/events/${eventId}/reviews`, { method: 'DELETE' });
}

// ── Nominations (Mentor-Voting) ──

export interface Nomination {
  id: string;
  nominee_id: string;
  status: 'active' | 'approved' | 'rejected';
  eligible_voters: number;
  votes_for: number;
  votes_against: number;
  souleya_decision: boolean | null;
  voting_ends_at: string;
  created_at: string;
  nominee?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    soul_level: number;
    is_first_light: boolean;
  };
  my_vote?: boolean | null;
}

export async function fetchActiveNominations() {
  return apiFetch<Nomination[]>('/nominations/active');
}

export async function fetchNomination(id: string) {
  return apiFetch<Nomination>(`/nominations/${id}`);
}

export async function voteNomination(id: string, vote: boolean) {
  return apiFetch<Nomination>(`/nominations/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
  });
}
