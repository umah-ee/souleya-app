import { apiFetch } from './api';

export interface UserSearchResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  soul_level: number;
  is_first_light: boolean;
  connections_count: number;
}

export async function searchUsers(query: string, page = 1, limit = 20) {
  return apiFetch<{ data: UserSearchResult[]; total: number; hasMore: boolean }>(
    `/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );
}
