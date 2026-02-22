import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Zentraler API-Client fuer souleya-api (NestJS).
 * Haengt automatisch das Supabase JWT als Bearer Token an.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API Fehler: ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}
