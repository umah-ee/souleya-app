import { View, Text, TouchableOpacity, StyleSheet, Platform, Share, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Icon } from '../Icon';
import { useThemeStore } from '../../store/theme';
import type { Profile } from '../../types/profile';
import { fetchReferrals, type ReferralData } from '../../lib/profile';
import BottomPanel from './BottomPanel';

interface ReferralPanelProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ReferralPanel({ isOpen, onClose, profile }: ReferralPanelProps) {
  const colors = useThemeStore((s) => s.colors);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);

  const referralUrl = `https://souleya.com?ref=${profile.referral_code}`;

  useEffect(() => {
    if (isOpen) {
      fetchReferrals().then(setData).catch(() => {});
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await Share.share({ message: referralUrl, url: referralUrl });
    } catch {
      // Share dialog dismissed
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BottomPanel isOpen={isOpen} onClose={onClose} title="Einladungen">
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textH }]}>{data?.count ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>EINGELADEN</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.goldBorderS }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.gold }]}>{data?.seeds_earned ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>SEEDS VERDIENT</Text>
        </View>
      </View>

      {/* Referral Link */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DEIN EINLADUNGSLINK</Text>
      <View style={[styles.linkRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Icon name="link" size={14} color={colors.textMuted} />
        <Text style={[styles.linkText, { color: colors.textBody }]} numberOfLines={1}>
          {referralUrl}
        </Text>
        <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={styles.copyBtn}>
          <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? colors.success : colors.gold} />
        </TouchableOpacity>
      </View>

      {copied && (
        <Text style={[styles.copiedHint, { color: colors.success }]}>Kopiert!</Text>
      )}

      {/* Eingeladene User */}
      {data && data.invited.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DEINE EINLADUNGEN</Text>
          {data.invited.map((user, i) => (
            <View
              key={i}
              style={[
                styles.userRow,
                i > 0 ? { borderTopWidth: 1, borderTopColor: colors.inputBorder } : undefined,
              ]}
            >
              {user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={[styles.userInitials, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Text style={[styles.userInitialsText, { color: colors.textSec }]}>
                    {getInitials(user.display_name)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.textBody }]} numberOfLines={1}>
                  {user.display_name || 'Neues Mitglied'}
                </Text>
                <Text style={[styles.userDate, { color: colors.textSec }]}>
                  {new Date(user.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.userSeeds}>+100</Text>
            </View>
          ))}
        </View>
      )}

      {/* Info */}
      <View style={[styles.infoBox, { backgroundColor: colors.goldBg }]}>
        <Text style={[styles.infoText, { color: colors.textSec }]}>
          Teile deinen Einladungslink mit Freunden. Fuer jede Anmeldung erhaeltst du 100 Seeds.
        </Text>
      </View>
    </BottomPanel>
  );
}

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: SERIF_FONT,
    fontWeight: '400',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  statDivider: {
    width: 1,
    height: 40,
    opacity: 0.5,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  copyBtn: {
    padding: 4,
  },
  copiedHint: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  userInitials: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitialsText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userDate: {
    fontSize: 11,
    marginTop: 2,
  },
  userSeeds: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#52B788',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
});
