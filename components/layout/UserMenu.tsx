/**
 * UserMenu – NotificationBell + Profil-EnsoRing (oben rechts im Header)
 * Entspricht der Web-Version: src/components/layout/UserMenu.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme';
import { fetchProfile } from '../../lib/profile';
import type { Profile } from '../../types/profile';
import NotificationBell from '../notifications/NotificationBell';
import EnsoRing from '../shared/EnsoRing';
import { Icon } from '../Icon';

export default function UserMenu() {
  const colors = useThemeStore((s) => s.colors);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  const loadProfile = useCallback(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <View style={styles.container}>
      <NotificationBell />
      <TouchableOpacity
        onPress={() => router.push('/profile' as never)}
        activeOpacity={0.7}
        style={styles.profileBtn}
      >
        <EnsoRing
          soulLevel={profile?.soul_level ?? 1}
          isFirstLight={profile?.is_first_light ?? false}
          isMentor={profile?.is_mentor ?? false}
          size="header"
        >
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.gold + '20' }]}>
              <Icon name="user" size={14} color={colors.gold} />
            </View>
          )}
        </EnsoRing>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileBtn: {
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
