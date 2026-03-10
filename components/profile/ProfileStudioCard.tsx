import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '../Icon';
import type { Profile } from '../../types/profile';
import type { ThemeColors } from '../../lib/theme';

interface ProfileStudioCardProps {
  profile: Profile;
  colors: ThemeColors;
}

export default function ProfileStudioCard({ profile, colors }: ProfileStudioCardProps) {
  if (!profile.is_mentor) return null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      onPress={() => router.push('/studio' as any)}
      activeOpacity={0.7}
    >
      <Icon name="layout-dashboard" size={20} color={colors.gold} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textH }]}>Coach Studio</Text>
        <Text style={[styles.desc, { color: colors.textMuted }]}>
          Kurse, Kalender und Buchungen verwalten
        </Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  desc: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
