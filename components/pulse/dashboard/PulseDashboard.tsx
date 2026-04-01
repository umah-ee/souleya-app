/**
 * PulseDashboard – Modulares Wellness-Dashboard
 * Entspricht der Web-Version: src/components/pulse/dashboard/PulseDashboard.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { fetchProfile } from '../../../lib/profile';
import { fetchEvents } from '../../../lib/events';
import { fetchMyChallenges, checkinChallenge } from '../../../lib/challenges';
import { useChatStore } from '../../../store/chat';
import { useAuthStore } from '../../../store/auth';
import type { Profile } from '../../../types/profile';

import GreetingCard from './GreetingCard';
import ActivityBar from './ActivityBar';
import WisdomCard from './WisdomCard';
import ToolkitSection from './ToolkitSection';
import ChallengeWidget from './ChallengeWidget';
import NearbyEventsWidget from './NearbyEventsWidget';

export default function PulseDashboard() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({});
  const totalUnread = useChatStore((s) => s.totalUnread);

  useEffect(() => {
    // Profil laden
    fetchProfile()
      .then(setProfile)
      .catch(() => {});

    // Challenges laden
    fetchMyChallenges()
      .then((data) => {
        const active = (data ?? []).filter((c: any) => c.status === 'active');
        setChallenges(active);
      })
      .catch(() => {});

    // Nahe Events laden
    fetchEvents()
      .then((res) => {
        const now = Date.now();
        const upcoming = (res?.data ?? [])
          .filter((e: any) => new Date(e.starts_at).getTime() > now)
          .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
          .slice(0, 3);
        setNearbyEvents(upcoming);
      })
      .catch(() => {});
  }, []);

  const handleCheckin = useCallback(async (id: string, dayNumber: number) => {
    setCheckingIn((prev) => ({ ...prev, [id]: true }));
    try {
      await checkinChallenge(id, dayNumber);
      setChallenges((prev) =>
        prev.map((ch) =>
          ch.id === id
            ? {
                ...ch,
                my_progress: {
                  ...ch.my_progress,
                  total_checkins: (ch.my_progress?.total_checkins ?? 0) + 1,
                  current_streak: (ch.my_progress?.current_streak ?? 0) + 1,
                },
              }
            : ch,
        ),
      );
    } catch {}
    setCheckingIn((prev) => ({ ...prev, [id]: false }));
  }, []);

  return (
    <View style={styles.container}>
      {/* Begruessung */}
      <GreetingCard displayName={profile?.display_name ?? ''} />

      {/* Aktivitaet (nur wenn ungelesen) */}
      <ActivityBar unreadMessages={totalUnread} newPosts={0} />

      {/* Tageszitat */}
      <WisdomCard userId={userId} />

      {/* Toolkit */}
      <ToolkitSection />

      {/* Challenges */}
      {challenges.length > 0 && (
        <ChallengeWidget
          challenges={challenges}
          onCheckin={handleCheckin}
          checkingIn={checkingIn}
        />
      )}

      {/* Events in der Naehe */}
      {nearbyEvents.length > 0 && (
        <NearbyEventsWidget
          events={nearbyEvents}
          userLat={profile?.location_lat ?? undefined}
          userLng={profile?.location_lng ?? undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 8,
  },
});
