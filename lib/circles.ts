import { apiFetch } from './api';
import type { Connection, ConnectionStatusResponse } from '../types/circles';
import type { Pulse } from '../types/pulse';

// ── Anfragen ──────────────────────────────────────────────

export async function sendConnectionRequest(addresseeId: string) {
  return apiFetch<Connection>('/circles/request', {
    method: 'POST',
    body: JSON.stringify({ addressee_id: addresseeId }),
  });
}

export async function getIncomingRequests(page = 1, limit = 20) {
  return apiFetch<{ data: Connection[]; total: number; hasMore: boolean }>(
    `/circles/requests/incoming?page=${page}&limit=${limit}`,
  );
}

export async function getOutgoingRequests(page = 1, limit = 20) {
  return apiFetch<{ data: Connection[]; total: number; hasMore: boolean }>(
    `/circles/requests/outgoing?page=${page}&limit=${limit}`,
  );
}

export async function respondToRequest(connectionId: string, status: 'accepted' | 'declined') {
  return apiFetch<Connection>(`/circles/requests/${connectionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function cancelRequest(connectionId: string) {
  return apiFetch<{ success: boolean }>(`/circles/requests/${connectionId}`, {
    method: 'DELETE',
  });
}

// ── Verbindungen ──────────────────────────────────────────

export async function getConnections(page = 1, limit = 20) {
  return apiFetch<{ data: Connection[]; total: number; hasMore: boolean }>(
    `/circles/connections?page=${page}&limit=${limit}`,
  );
}

export async function removeConnection(connectionId: string) {
  return apiFetch<{ success: boolean }>(`/circles/connections/${connectionId}`, {
    method: 'DELETE',
  });
}

// ── Circle Feed ───────────────────────────────────────────

export async function fetchCircleFeed(page = 1, limit = 20) {
  const res = await apiFetch<{ data: Pulse[]; total: number; hasMore: boolean }>(
    `/circles/feed?page=${page}&limit=${limit}`,
  );
  return { pulses: res.data, total: res.total, hasMore: res.hasMore };
}

// ── Status ────────────────────────────────────────────────

export async function getConnectionStatus(userId: string) {
  return apiFetch<ConnectionStatusResponse>(`/circles/status/${userId}`);
}
