export interface Profile {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  vip_level: number;
  is_origin_soul: boolean;
  seeds_balance: number;
  connections_count: number;
  referral_code: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  username?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  location_lat?: number;
  location_lng?: number;
}

export const VIP_NAMES: Record<number, string> = {
  1: 'Soul Spark',
  2: 'Radiant Soul',
  3: 'Harmony Keeper',
  4: 'Zen Master',
  5: 'Soul Mentor',
};
