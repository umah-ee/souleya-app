import { View, Text, StyleSheet, Platform } from 'react-native';
import { Icon, type IconName } from '../Icon';
import { useThemeStore } from '../../store/theme';
import type { Profile } from '../../types/profile';
import BottomPanel from './BottomPanel';

interface SeedsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

export default function SeedsPanel({ isOpen, onClose, profile }: SeedsPanelProps) {
  const colors = useThemeStore((s) => s.colors);

  // Placeholder-Transaktionen (spaeter durch API ersetzen)
  const transactions: { id: number; icon: IconName; title: string; date: string; amount: number }[] = [
    { id: 1, icon: 'gift', title: 'Willkommensbonus', date: 'Maerz 2026', amount: +50 },
    { id: 2, icon: 'users', title: 'Einladung angenommen', date: 'Maerz 2026', amount: +25 },
  ];

  return (
    <BottomPanel isOpen={isOpen} onClose={onClose} title="Seeds">
      {/* Balance */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceValue, { color: colors.textH }]}>
          {profile.seeds_balance}
        </Text>
        <Text style={[styles.balanceLabel, { color: colors.textSec }]}>Seeds</Text>
        <Text style={[styles.balanceEur, { color: colors.textMuted }]}>
          {'\u2248'} {(profile.seeds_balance * 0.10).toFixed(2)} EUR
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.goldBorderS }]} />

      {/* Transaktionsverlauf */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>VERLAUF</Text>

      {transactions.map((tx) => (
        <View
          key={tx.id}
          style={[styles.txRow, { backgroundColor: colors.glass }]}
        >
          <View style={[styles.txIcon, { backgroundColor: colors.goldBg }]}>
            <Icon name={tx.icon} size={14} color={colors.gold} />
          </View>
          <View style={styles.txContent}>
            <Text style={[styles.txTitle, { color: colors.textH }]}>{tx.title}</Text>
            <Text style={[styles.txDate, { color: colors.textMuted }]}>{tx.date}</Text>
          </View>
          <Text
            style={[
              styles.txAmount,
              { color: tx.amount > 0 ? colors.success : colors.error },
            ]}
          >
            {tx.amount > 0 ? '+' : ''}{tx.amount}
          </Text>
        </View>
      ))}
    </BottomPanel>
  );
}

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const styles = StyleSheet.create({
  balanceSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceValue: {
    fontSize: 48,
    fontFamily: SERIF_FONT,
    fontWeight: '400',
    lineHeight: 52,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  balanceEur: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 60,
    marginBottom: 20,
    opacity: 0.5,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  txAmount: {
    fontSize: 14,
    fontFamily: SERIF_FONT,
    fontWeight: '500',
  },
});
