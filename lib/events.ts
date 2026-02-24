import { apiFetch } from './api';
import type { SoEvent, CreateEventData } from '../types/events';

// ── Events laden (optional geo-gefiltert) ───────────────────
export async function fetchEvents(options?: {
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.lat != null) params.set('lat', String(options.lat));
  if (options?.lng != null) params.set('lng', String(options.lng));
  if (options?.radius != null) params.set('radius', String(options.radius));
  if (options?.category) params.set('category', options.category);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));

  const qs = params.toString();
  return apiFetch<{ data: SoEvent[]; total: number; hasMore: boolean }>(
    `/events${qs ? `?${qs}` : ''}`,
  );
}

// ── Event erstellen ─────────────────────────────────────────
export async function createEvent(data: CreateEventData): Promise<SoEvent> {
  return apiFetch<SoEvent>('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Event beitreten ─────────────────────────────────────────
export async function joinEvent(eventId: string) {
  return apiFetch<{ joined: boolean; participants_count: number }>(
    `/events/${eventId}/join`,
    { method: 'POST' },
  );
}

// ── Event verlassen ─────────────────────────────────────────
export async function leaveEvent(eventId: string) {
  return apiFetch<{ joined: boolean; participants_count: number }>(
    `/events/${eventId}/leave`,
    { method: 'DELETE' },
  );
}

// ── Nearby Users ────────────────────────────────────────────
export async function fetchNearbyUsers(lat: number, lng: number, radius = 25) {
  return apiFetch<{
    data: Array<{
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      location: string | null;
      location_lat: number;
      location_lng: number;
      soul_level: number;
      is_first_light: boolean;
      connections_count: number;
    }>;
    total: number;
    hasMore: boolean;
  }>(`/users/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
}

// ── Geocoding (via API Proxy) ───────────────────────────────
export async function geocodeLocation(query: string, type: 'forward' | 'reverse' = 'forward') {
  return apiFetch<{
    results: Array<{
      place_name: string;
      lat: number;
      lng: number;
      feature_type: string;
    }>;
  }>('/users/geocode', {
    method: 'POST',
    body: JSON.stringify({ query, type }),
  });
}
