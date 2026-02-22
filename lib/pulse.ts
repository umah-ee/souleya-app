import { supabase } from './supabase';
import type { Pulse } from '../types/pulse';

export async function fetchFeed(page = 1, limit = 20, userId?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('pulses')
    .select(
      `*, author:profiles!author_id(id, username, display_name, avatar_url, vip_level, is_origin_soul)`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const pulses = (data ?? []) as Pulse[];

  if (userId && pulses.length > 0) {
    const { data: likes } = await supabase
      .from('pulse_likes')
      .select('pulse_id')
      .eq('user_id', userId)
      .in('pulse_id', pulses.map((p) => p.id));

    const likedSet = new Set((likes ?? []).map((l: { pulse_id: string }) => l.pulse_id));
    pulses.forEach((p) => { p.has_liked = likedSet.has(p.id); });
  }

  return { pulses, total: count ?? 0, hasMore: (count ?? 0) > page * limit };
}

export async function createPulse(content: string): Promise<Pulse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  const { data, error } = await supabase
    .from('pulses')
    .insert({ author_id: user.id, content })
    .select(`*, author:profiles!author_id(id, username, display_name, avatar_url, vip_level, is_origin_soul)`)
    .single();

  if (error) throw error;
  return { ...(data as Pulse), has_liked: false };
}

export async function toggleLike(pulseId: string, currentlyLiked: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  if (currentlyLiked) {
    await supabase.from('pulse_likes').delete()
      .eq('user_id', user.id).eq('pulse_id', pulseId);
    return { liked: false };
  } else {
    await supabase.from('pulse_likes').insert({ user_id: user.id, pulse_id: pulseId });
    return { liked: true };
  }
}

export async function deletePulse(pulseId: string) {
  const { error } = await supabase.from('pulses').delete().eq('id', pulseId);
  if (error) throw error;
}
