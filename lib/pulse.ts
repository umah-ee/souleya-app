import { apiFetch } from './api';
import { useAuthStore } from '../store/auth';
import type { Pulse, PulseComment, CreatePulseData } from '../types/pulse';

// ── Feed laden (paginiert) ──────────────────────────────────
export async function fetchFeed(page = 1, limit = 20) {
  const res = await apiFetch<{ data: Pulse[]; total: number; hasMore: boolean }>(
    `/pulse?page=${page}&limit=${limit}`,
  );
  return { pulses: res.data, total: res.total, hasMore: res.hasMore };
}

// ── Pulse erstellen (erweitert: Bilder, Orte, Metadata, Umfragen) ──
export async function createPulse(data: CreatePulseData): Promise<Pulse> {
  return apiFetch<Pulse>('/pulse', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Like togglen ────────────────────────────────────────────
export async function toggleLike(
  pulseId: string,
  currentlyLiked: boolean,
): Promise<{ liked: boolean; likes_count: number }> {
  if (currentlyLiked) {
    return apiFetch(`/pulse/${pulseId}/like`, { method: 'DELETE' });
  } else {
    return apiFetch(`/pulse/${pulseId}/like`, { method: 'POST' });
  }
}

// ── Pulse loeschen ──────────────────────────────────────────
export async function deletePulse(pulseId: string) {
  await apiFetch(`/pulse/${pulseId}`, { method: 'DELETE' });
}

// ── Kommentare laden ────────────────────────────────────────
export async function fetchComments(pulseId: string): Promise<PulseComment[]> {
  return apiFetch<PulseComment[]>(`/pulse/${pulseId}/comments`);
}

// ── Kommentar hinzufuegen ───────────────────────────────────
export async function addComment(pulseId: string, content: string): Promise<PulseComment> {
  return apiFetch<PulseComment>(`/pulse/${pulseId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ── Bild hochladen (ueber API → Supabase Storage) ──────────
export async function uploadPulseImage(uri: string): Promise<string> {
  const session = useAuthStore.getState().session;
  if (!session?.access_token) throw new Error('Nicht angemeldet');

  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    name: filename,
  } as unknown as Blob);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
  const res = await fetch(`${apiUrl}/pulse/upload-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Upload fehlgeschlagen: ${res.status}`);
  }

  const data = await res.json();
  return data.url;
}

// ── Poll abstimmen ──────────────────────────────────────────
export async function votePoll(pulseId: string, optionId: string) {
  return apiFetch(`/pulse/${pulseId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ option_id: optionId }),
  });
}
