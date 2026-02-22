import { apiFetch } from './api';
import { supabase } from './supabase';
import type { Profile, UpdateProfileData } from '../types/profile';

export async function fetchProfile(): Promise<Profile> {
  return apiFetch<Profile>('/users/me');
}

export async function updateProfile(data: UpdateProfileData): Promise<Profile> {
  return apiFetch<Profile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  // Datei als Blob lesen
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);

  // Cache-Busting: Timestamp anhaengen damit neues Bild geladen wird
  return `${data.publicUrl}?t=${Date.now()}`;
}
