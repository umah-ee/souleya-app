export interface SoEvent {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: 'meetup' | 'course';
  location_name: string;
  location_address: string | null;
  location_lat: number;
  location_lng: number;
  starts_at: string;
  ends_at: string | null;
  max_participants: number | null;
  participants_count: number;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_first_light: boolean;
  };
  has_joined?: boolean;
}

export interface CreateEventData {
  title: string;
  description?: string;
  category?: 'meetup' | 'course';
  location_name: string;
  location_address?: string;
  location_lat: number;
  location_lng: number;
  starts_at: string;
  ends_at?: string;
  max_participants?: number;
  cover_url?: string;
}
