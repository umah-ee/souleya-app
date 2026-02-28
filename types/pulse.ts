export interface PulseAuthor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  soul_level: number;
  is_first_light: boolean;
}

export interface PollOption {
  id: string;
  label: string;
  position: number;
  votes_count: number;
}

export interface PulsePoll {
  id: string;
  pulse_id: string;
  question: string;
  multiple_choice: boolean;
  expires_at: string | null;
  created_at: string;
  options: PollOption[];
  user_vote_option_id?: string | null;
  total_votes?: number;
}

export interface Pulse {
  id: string;
  content: string;
  image_url: string | null;
  image_urls?: string[];
  metadata?: Record<string, unknown> | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_name?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author: PulseAuthor;
  has_liked?: boolean;
  poll?: PulsePoll | null;
}

export interface PulseComment {
  id: string;
  content: string;
  created_at: string;
  author: Pick<PulseAuthor, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}

export interface CreatePulseData {
  content?: string;
  image_url?: string;
  image_urls?: string[];
  metadata?: Record<string, unknown>;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  poll?: {
    question: string;
    multiple_choice?: boolean;
    options: { label: string }[];
  };
}
