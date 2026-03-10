import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../Icon';
import type { Profile } from '../../types/profile';
import type { ThemeColors } from '../../lib/theme';

interface ProfileBioProps {
  profile: Profile;
  colors: ThemeColors;
}

export default function ProfileBio({ profile, colors }: ProfileBioProps) {
  const memberSince = new Date(profile.created_at).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });

  const hasBio = !!profile.bio;
  const hasLocation = !!profile.location;

  if (!hasBio && !hasLocation) return null;

  return (
    <View style={styles.container}>
      {hasBio && (
        <Text style={[styles.bio, { color: colors.textBody }]}>{profile.bio}</Text>
      )}

      <View style={styles.metaRow}>
        {hasLocation && (
          <View style={styles.metaItem}>
            <Icon name="map-pin" size={13} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{profile.location}</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Icon name="calendar-event" size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>Seit {memberSince}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  bio: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
