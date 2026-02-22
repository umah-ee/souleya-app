export interface PulseAuthor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  vip_level: number;
  is_origin_soul: boolean;
}

export interface Pulse {
  id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author: PulseAuthor;
  has_liked?: boolean;
}
