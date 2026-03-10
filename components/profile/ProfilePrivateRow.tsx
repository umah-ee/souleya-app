import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '../Icon';
import type { Profile } from '../../types/profile';
import type { ThemeColors } from '../../lib/theme';

interface ProfilePrivateRowProps {
  profile: Profile;
  colors: ThemeColors;
  onSeedsClick: () => void;
  onReferralClick: () => void;
}

export default function ProfilePrivateRow({
  profile,
  colors,
  onSeedsClick,
  onReferralClick,
}: ProfilePrivateRowProps) {
  return (
    <View style={styles.container}>
      {/* Seeds Chip */}
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: colors.goldBg, borderColor: colors.goldBorder }]}
        onPress={onSeedsClick}
        activeOpacity={0.7}
      >
        <Icon name="seedling" size={14} color={colors.gold} />
        <Text style={[styles.chipValue, { color: colors.gold }]}>{profile.seeds_balance}</Text>
        <Text style={[styles.chipLabel, { color: colors.textMuted }]}>Seeds</Text>
        <Icon name="chevron-right" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Einladungen Chip */}
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
        onPress={onReferralClick}
        activeOpacity={0.7}
      >
        <Icon name="users" size={14} color={colors.textSec} />
        <Text style={[styles.chipLabel, { color: colors.textSec }]}>Einladungen</Text>
        <Icon name="chevron-right" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
