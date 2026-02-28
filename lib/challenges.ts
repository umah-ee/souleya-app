import { apiFetch } from './api';
import type {
  Challenge, ChallengeParticipant, ChallengeProgress,
  CreateChallengeData, CheckinResult,
} from '../types/challenges';

// ── Challenges laden (paginiert) ──────────────────────────────
export async function fetchChallenges(options?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();

  return apiFetch<{ data: Challenge[]; total: number; hasMore: boolean }>(
    `/challenges${qs ? `?${qs}` : ''}`,
  );
}

// ── Einzelne Challenge laden ──────────────────────────────────
export async function fetchChallenge(id: string): Promise<Challenge> {
  return apiFetch<Challenge>(`/challenges/${id}`);
}

// ── Meine aktiven Challenges ──────────────────────────────────
export async function fetchMyChallenges(): Promise<Challenge[]> {
  return apiFetch<Challenge[]>('/challenges/my');
}

// ── Challenge erstellen ───────────────────────────────────────
export async function createChallenge(data: CreateChallengeData): Promise<Challenge> {
  return apiFetch<Challenge>('/challenges', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Challenge beitreten ───────────────────────────────────────
export async function joinChallenge(id: string): Promise<{ joined: boolean; participants_count: number }> {
  return apiFetch(`/challenges/${id}/join`, { method: 'POST' });
}

// ── Challenge verlassen ───────────────────────────────────────
export async function leaveChallenge(id: string): Promise<{ joined: boolean; participants_count: number }> {
  return apiFetch(`/challenges/${id}/leave`, { method: 'DELETE' });
}

// ── Tages-Check-in ────────────────────────────────────────────
export async function checkinChallenge(
  id: string,
  dayNumber: number,
  note?: string,
): Promise<CheckinResult> {
  return apiFetch<CheckinResult>(`/challenges/${id}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ day_number: dayNumber, note }),
  });
}

// ── Eigener Fortschritt ───────────────────────────────────────
export async function fetchChallengeProgress(id: string): Promise<ChallengeProgress> {
  return apiFetch<ChallengeProgress>(`/challenges/${id}/progress`);
}

// ── Teilnehmer-Liste ──────────────────────────────────────────
export async function fetchChallengeParticipants(id: string): Promise<ChallengeParticipant[]> {
  return apiFetch<ChallengeParticipant[]>(`/challenges/${id}/participants`);
}
