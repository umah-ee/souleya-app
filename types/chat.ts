// ── Chat-System Typen ────────────────────────────────────────

export type ChannelType = 'direct' | 'event_group' | 'course_group' | 'custom_group';
export type MsgType = 'text' | 'image' | 'voice' | 'location' | 'seeds' | 'poll' | 'challenge' | 'system';
export type MemberRole = 'admin' | 'member';

export interface ChannelSettings {
  ai_summary: boolean;
  dup_detection: boolean;
  polls_allowed: boolean;
  admin_only: boolean;
}

export interface Channel {
  id: string;
  type: ChannelType;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  source_id: string | null;
  max_members: number | null;
  settings: ChannelSettings;
  created_by: string;
  created_at: string;
}

export interface MemberProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  soul_level: number;
  is_first_light: boolean;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  role: MemberRole;
  last_read_at: string;
  muted_until: string | null;
  joined_at: string;
  profile: MemberProfile;
}

export interface ChannelOverview {
  id: string;
  type: ChannelType;
  name: string | null;
  avatar_url: string | null;
  last_message: {
    content: string | null;
    type: MsgType;
    author_name: string | null;
    created_at: string;
  } | null;
  unread_count: number;
  members_count: number;
}

export interface ChannelDetail extends Channel {
  members: ChannelMember[];
  unread_count: number;
}

export interface MessageAuthor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ReplyMessage {
  id: string;
  content: string | null;
  user_id: string;
  author: { display_name: string | null };
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  type: MsgType;
  content: string | null;
  metadata: Record<string, unknown>;
  reply_to: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author: MessageAuthor;
  reply_message?: ReplyMessage | null;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  has_reacted: boolean;
}

export interface UnreadCount {
  channel_id: string;
  unread_count: number;
}

// ── Polls ─────────────────────────────────────────────────────

export interface PollOption {
  id: string;
  label: string;
  position: number;
  vote_count: number;
  percentage: number;
  has_voted: boolean;
}

export interface PollResult {
  poll_id: string;
  message_id: string;
  question: string;
  multiple_choice: boolean;
  is_anonymous: boolean;
  expires_at: string | null;
  is_expired: boolean;
  total_votes: number;
  options: PollOption[];
}
