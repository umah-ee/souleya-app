import { apiFetch } from './api';
import type {
  ChannelOverview, ChannelDetail, Channel,
  Message, ReactionSummary, UnreadCount,
} from '../types/chat';

// ══════════════════════════════════════════════════════════════
// CHANNELS
// ══════════════════════════════════════════════════════════════

export async function fetchChannels() {
  return apiFetch<ChannelOverview[]>('/chat/channels');
}

export async function fetchChannel(channelId: string) {
  return apiFetch<ChannelDetail>(`/chat/channels/${channelId}`);
}

export async function createDirectChannel(partnerId: string) {
  return apiFetch<{ id: string; created: boolean }>('/chat/channels/direct', {
    method: 'POST',
    body: JSON.stringify({ partner_id: partnerId }),
  });
}

export async function createGroupChannel(data: {
  name: string;
  description?: string;
  avatar_url?: string;
  max_members?: number;
  member_ids: string[];
}) {
  return apiFetch<Channel>('/chat/channels/group', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateChannel(channelId: string, data: {
  name?: string;
  description?: string;
  avatar_url?: string;
  max_members?: number;
}) {
  return apiFetch<Channel>(`/chat/channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Mitglieder ────────────────────────────────────────────────

export async function addChannelMember(channelId: string, userId: string) {
  return apiFetch<{ success: boolean }>(`/chat/channels/${channelId}/members/${userId}`, {
    method: 'POST',
  });
}

export async function removeChannelMember(channelId: string, userId: string) {
  return apiFetch<{ success: boolean }>(`/chat/channels/${channelId}/members/${userId}`, {
    method: 'DELETE',
  });
}

// ══════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════

export async function fetchMessages(channelId: string, page = 1, limit = 50) {
  return apiFetch<{ data: Message[]; total: number; hasMore: boolean }>(
    `/chat/channels/${channelId}/messages?page=${page}&limit=${limit}`,
  );
}

export async function sendMessage(channelId: string, data: {
  type: 'text' | 'image' | 'voice' | 'location' | 'seeds' | 'poll';
  content?: string;
  metadata?: Record<string, unknown>;
  reply_to?: string;
}) {
  return apiFetch<Message>(`/chat/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function editMessage(messageId: string, content: string) {
  return apiFetch<Message>(`/chat/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export async function deleteMessage(messageId: string) {
  return apiFetch<{ success: boolean }>(`/chat/messages/${messageId}`, {
    method: 'DELETE',
  });
}

// ══════════════════════════════════════════════════════════════
// REACTIONS
// ══════════════════════════════════════════════════════════════

export async function addReaction(messageId: string, emoji: string) {
  return apiFetch<{ success: boolean }>(`/chat/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

export async function removeReaction(messageId: string, emoji: string) {
  return apiFetch<{ success: boolean }>(
    `/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: 'DELETE' },
  );
}

export async function fetchReactions(messageId: string) {
  return apiFetch<ReactionSummary[]>(`/chat/messages/${messageId}/reactions`);
}

// ══════════════════════════════════════════════════════════════
// READ STATUS
// ══════════════════════════════════════════════════════════════

export async function markChannelAsRead(channelId: string) {
  return apiFetch<{ success: boolean }>(`/chat/channels/${channelId}/read`, {
    method: 'POST',
  });
}

export async function fetchUnreadCounts() {
  return apiFetch<UnreadCount[]>('/chat/unread');
}
