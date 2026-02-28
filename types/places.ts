export interface Place {
  id: string;
  created_by: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string;
  tags: string[];
  address: string | null;
  city: string | null;
  country: string | null;
  location_lat: number;
  location_lng: number;
  mapbox_id: string | null;
  cover_url: string | null;
  avg_rating: number;
  reviews_count: number;
  saves_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  is_saved?: boolean;
  user_review?: { id: string; rating: number } | null;
}

export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface PlacePhoto {
  id: string;
  place_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  url?: string;
}

export interface CreatePlaceData {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  address?: string;
  city?: string;
  country?: string;
  location_lat: number;
  location_lng: number;
  mapbox_id?: string;
  cover_url?: string;
}

export interface CreateReviewData {
  rating: number;
  content?: string;
}
