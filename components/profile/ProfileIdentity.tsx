import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Icon } from '../Icon';
import type { Profile } from '../../types/profile';
import { SOUL_LEVEL_NAMES } from '../../types/profile';
import type { ThemeColors } from '../../lib/theme';

interface ProfileIdentityProps {
  profile: Profile;
  colors: ThemeColors;
}

export default function ProfileIdentity({ profile, colors }: ProfileIdentityProps) {
  const initials = (profile.display_name ?? profile.username ?? profile.email ?? '?')
    .slice(0, 1)
    .toUpperCase();
  const levelName = SOUL_LEVEL_NAMES[profile.soul_level] ?? `Level ${profile.soul_level}`;

  return (
    <View style={styles.container}>
      {/* Avatar Ring (112px outer, 72px photo) */}
      <View
        style={[
          styles.avatarRing,
          {
            borderColor: colors.ensoGradientStart,
            shadowColor: colors.gold,
          },
          profile.is_first_light && {
            shadowOpacity: 0.3,
            shadowRadius: 20,
          },
        ]}
      >
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.avatarBg }]}>
            <Text style={[styles.avatarInitials, { color: colors.gold }]}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Name (32px serif italic) */}
      <Text style={[styles.name, { color: colors.textH }]}>
        {profile.display_name ?? profile.email}
      </Text>

      {/* Handle */}
      {profile.username && (
        <Text style={[styles.handle, { color: colors.textMuted }]}>@{profile.username}</Text>
      )}

      {/* Level + Badges Row */}
      <View style={styles.badgesRow}>
        <View style={[styles.levelBadge, { borderColor: colors.goldBorderS }]}>
          <Text style={[styles.levelText, { color: colors.goldDeep }]}>
            {levelName.toUpperCase()}
          </Text>
        </View>

        {profile.is_first_light && (
          <View style={[styles.badge, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
            <Text style={[styles.badgeText, { color: colors.gold }]}>FIRST LIGHT</Text>
          </View>
        )}

        {profile.is_admin && (
          <View style={[styles.badge, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg, flexDirection: 'row', gap: 4 }]}>
            <Icon name="shield" size={10} color={colors.gold} />
            <Text style={[styles.badgeText, { color: colors.gold }]}>ADMIN</Text>
          </View>
        )}

        {profile.is_mentor && (
          <View style={[styles.badge, { borderColor: '#4CAF5044', backgroundColor: '#4CAF5014' }]}>
            <Text style={[styles.badgeText, { color: '#4CAF50' }]}>MENTOR</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: -56,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    marginBottom: 16,
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '500',
  },
  name: {
    fontSize: 32,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 4,
  },
  handle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  levelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
});
