import { apiFetch } from './api';
import type { Place, PlaceReview, PlacePhoto, CreatePlaceData, CreateReviewData } from '../types/places';

// ── Tags ──────────────────────────────────────────────────────
// Gleich wie INTEREST_SUGGESTIONS + Ort-spezifische Tags
export const PLACE_TAGS = [
  // Aus User-Interests (identisch)
  'Achtsamkeit', 'Yoga', 'Meditation', 'Atemarbeit', 'Heilung',
  'Buddhismus', 'Schamanismus', 'Ayurveda', 'Reiki', 'Tantra',
  'Naturheilkunde', 'Psychologie', 'Coaching', 'Tanz', 'Musik',
  'Kunst', 'Journaling', 'Fasten', 'Qigong', 'Tai Chi',
  // Ort-spezifisch
  'Retreat', 'Tempel', 'Yoga Studio', 'Sauna', 'Vegan',
  'Bio', 'Natur', 'Cafe', 'Shop', 'Community',
];

// ── Places laden (geo-gefiltert, paginiert) ───────────────────
export async function fetchPlaces(options?: {
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  tags?: string[];
  q?: string;
  page?: number;
  limit?: number;
  userId?: string;
}) {
  const params = new URLSearchParams();
  if (options?.lat != null) params.set('lat', String(options.lat));
  if (options?.lng != null) params.set('lng', String(options.lng));
  if (options?.radius != null) params.set('radius', String(options.radius));
  if (options?.category) params.set('category', options.category);
  if (options?.tags && options.tags.length > 0) params.set('tags', options.tags.join(','));
  if (options?.q) params.set('q', options.q);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.userId) params.set('userId', options.userId);

  const qs = params.toString();
  return apiFetch<{ data: Place[]; total: number; hasMore: boolean }>(
    `/places${qs ? `?${qs}` : ''}`,
  );
}

// ── Nearby Places ─────────────────────────────────────────────
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radius?: number,
  tags?: string[],
) {
  const params = new URLSearchParams();
  params.set('lat', String(lat));
  params.set('lng', String(lng));
  if (radius != null) params.set('radius', String(radius));
  if (tags && tags.length > 0) params.set('tags', tags.join(','));

  return apiFetch<Place[]>(`/places/nearby?${params.toString()}`);
}

// ── Einzelnen Place laden ─────────────────────────────────────
export async function fetchPlace(id: string, userId?: string) {
  const qs = userId ? `?userId=${userId}` : '';
  return apiFetch<Place>(`/places/${id}${qs}`);
}

// ── Place erstellen ───────────────────────────────────────────
export async function createPlace(data: CreatePlaceData) {
  return apiFetch<Place>('/places', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Place aktualisieren ───────────────────────────────────────
export async function updatePlace(id: string, data: Partial<CreatePlaceData>) {
  return apiFetch<Place>(`/places/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Place loeschen ────────────────────────────────────────────
export async function deletePlace(id: string) {
  return apiFetch<void>(`/places/${id}`, { method: 'DELETE' });
}

// ── Reviews ───────────────────────────────────────────────────
export async function fetchPlaceReviews(placeId: string, page = 1, limit = 20) {
  return apiFetch<{ data: PlaceReview[]; total: number; hasMore: boolean }>(
    `/places/${placeId}/reviews?page=${page}&limit=${limit}`,
  );
}

export async function createPlaceReview(placeId: string, data: CreateReviewData) {
  return apiFetch<PlaceReview>(`/places/${placeId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlaceReview(placeId: string, data: CreateReviewData) {
  return apiFetch<PlaceReview>(`/places/${placeId}/reviews`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePlaceReview(placeId: string) {
  return apiFetch<void>(`/places/${placeId}/reviews`, { method: 'DELETE' });
}

// ── Save / Unsave ─────────────────────────────────────────────
export async function savePlace(placeId: string) {
  return apiFetch<{ saved: boolean }>(`/places/${placeId}/save`, { method: 'POST' });
}

export async function unsavePlace(placeId: string) {
  return apiFetch<{ saved: boolean }>(`/places/${placeId}/save`, { method: 'DELETE' });
}

// ── Photos ────────────────────────────────────────────────────
export async function fetchPlacePhotos(placeId: string) {
  return apiFetch<PlacePhoto[]>(`/places/${placeId}/photos`);
}

export async function deletePlacePhoto(placeId: string, photoId: string) {
  return apiFetch<void>(`/places/${placeId}/photos/${photoId}`, { method: 'DELETE' });
}
