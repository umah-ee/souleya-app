import { Platform } from 'react-native';
import { apiFetch } from './api';

// ── Types ──

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  actor_id: string | null;
  actor_avatar_url?: string | null;
  actor_display_name?: string | null;
  is_read: boolean;
  created_at: string;
}

// ── API Calls ──

export async function fetchNotifications(page = 1, limit = 20): Promise<AppNotification[]> {
  const res = await apiFetch<{ data: AppNotification[]; total: number } | AppNotification[]>(
    `/notifications?page=${page}&limit=${limit}`,
  );
  // API gibt { data: [...], total: N } zurueck — Array extrahieren
  if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as any).data)) {
    return (res as any).data;
  }
  // Fallback: falls API direkt ein Array liefert
  if (Array.isArray(res)) return res;
  return [];
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch<{ count: number }>('/notifications/unread-count');
  return res.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/notifications/read-all', { method: 'PATCH' });
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
}

export async function deleteReadNotifications(): Promise<void> {
  await apiFetch('/notifications/read', { method: 'DELETE' });
}

// ── Push Token (OneSignal) ──

export async function registerPushToken(playerId: string) {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return apiFetch('/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, platform }),
  });
}

export async function unregisterPushToken(playerId: string) {
  return apiFetch('/notifications/unregister', {
    method: 'DELETE',
    body: JSON.stringify({ player_id: playerId }),
  });
}
