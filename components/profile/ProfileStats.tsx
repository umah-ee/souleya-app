import { View, Text, StyleSheet, Platform } from 'react-native';
import type { Profile } from '../../types/profile';
import type { ThemeColors } from '../../lib/theme';

interface ProfileStatsProps {
  profile: Profile;
  colors: ThemeColors;
}

export default function ProfileStats({ profile, colors }: ProfileStatsProps) {
  const stats = [
    { label: 'Beitraege', value: profile.pulses_count ?? 0 },
    { label: 'Kontakte', value: profile.connections_count },
    { label: 'Circles', value: 0 },
  ];

  return (
    <View style={styles.container}>
      {/* Gradient Divider */}
      <View style={[styles.divider, { backgroundColor: colors.goldBorderS }]} />

      <View style={styles.row}>
        {stats.map((stat, i) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textH }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {stat.label.toUpperCase()}
            </Text>
            {i < stats.length - 1 && (
              <View style={[styles.verticalDivider, { backgroundColor: colors.goldBorderS }]} />
            )}
          </View>
        ))}
      </View>

      {/* Gradient Divider */}
      <View style={[styles.divider, { backgroundColor: colors.goldBorderS }]} />
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
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  divider: {
    height: 1,
    marginHorizontal: 40,
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  statValue: {
    fontSize: 26,
    fontFamily: SERIF_FONT,
    fontWeight: '400',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  verticalDivider: {
    position: 'absolute',
    right: 0,
    top: 4,
    bottom: 4,
    width: 1,
    opacity: 0.5,
  },
});
