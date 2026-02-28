import React from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../Icon';
import type { Challenge } from '../../types/challenges';

interface Props {
  challenge: Challenge;
  onJoin?: () => void;
  onCheckin?: () => void;
  onPress?: () => void;
  currentDayNumber?: number;
  checkedInToday?: boolean;
}

export default function ChallengeCard({
  challenge,
  onJoin,
  onCheckin,
  onPress,
  currentDayNumber,
  checkedInToday,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const hasJoined = challenge.has_joined ?? false;
  const totalCheckins = challenge.my_progress?.total_checkins ?? 0;
  const streak = challenge.my_progress?.current_streak ?? 0;
  const participants = challenge.participants ?? [];
  const avatarsToShow = participants.slice(0, 5);
  const remainingCount = challenge.participants_count - avatarsToShow.length;

  // ── Fortschritts-Punkte ──────────────────────────────────
  const duration = challenge.duration_days;
  const showTruncated = duration > 14;
  const dotsToShow = showTruncated ? 12 : duration;
  const remainingDots = duration - dotsToShow;

  const renderProgressDots = () => {
    const dots = [];
    for (let i = 1; i <= dotsToShow; i++) {
      const isChecked = i <= totalCheckins;
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            isChecked
              ? { backgroundColor: colors.gold }
              : { borderWidth: 1, borderColor: colors.divider },
          ]}
        />,
      );
    }
    return dots;
  };

  // ── Action-Button ────────────────────────────────────────
  const renderActionButton = () => {
    if (!hasJoined) {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.gold }]}
          onPress={onJoin}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, { color: colors.textOnGold }]}>Mitmachen</Text>
        </TouchableOpacity>
      );
    }
    if (checkedInToday) {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.divider, opacity: 0.5 }]}
          disabled
          activeOpacity={1}
        >
          <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Erledigt ✓</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gold }]}
        onPress={onCheckin}
        activeOpacity={0.7}
      >
        <Text style={[styles.actionBtnText, { color: colors.gold }]}>Heute geschafft ✓</Text>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}>
          <Icon name={(challenge.emoji || 'target') as IconName} size={20} color={colors.gold} />
        </View>
        <Text style={[styles.title, { color: colors.textH }]} numberOfLines={1}>
          {challenge.title}
        </Text>
        <View style={[styles.durationBadge, { borderColor: colors.goldBorder }]}>
          <Text style={[styles.durationText, { color: colors.gold }]}>
            {challenge.duration_days} Tage
          </Text>
        </View>
      </View>

      {/* ── Progress Dots ───────────────────────────────────── */}
      <View style={styles.dotsRow}>
        {renderProgressDots()}
        {showTruncated && remainingDots > 0 && (
          <Text style={[styles.dotsMore, { color: colors.textMuted }]}>...+{remainingDots}</Text>
        )}
      </View>

      {/* ── Bottom Row ──────────────────────────────────────── */}
      <View style={styles.bottomRow}>
        {/* Teilnehmer */}
        <View style={styles.participantsRow}>
          {avatarsToShow.map((p, i) => {
            const user = p.user;
            const avatarUri = user?.avatar_url;
            const initial = (user?.display_name ?? user?.username ?? '?').slice(0, 1).toUpperCase();

            return (
              <View
                key={p.id}
                style={[
                  styles.avatar,
                  { backgroundColor: colors.avatarBg, borderColor: colors.bgSolid },
                  i > 0 && { marginLeft: -8 },
                ]}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarInitial, { color: colors.gold }]}>{initial}</Text>
                )}
              </View>
            );
          })}
          {remainingCount > 0 && (
            <Text style={[styles.participantsMore, { color: colors.textMuted }]}>
              +{remainingCount}
            </Text>
          )}
        </View>

        {/* Streak */}
        {hasJoined && streak > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="flame" size={12} color={colors.textMuted} />
            <Text style={[styles.streakText, { color: colors.textMuted }]}>
              {streak} Tage
            </Text>
          </View>
        )}

        {/* Action */}
        {renderActionButton()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  durationBadge: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // ── Progress Dots ───────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotsMore: {
    fontSize: 10,
    marginLeft: 2,
  },

  // ── Bottom Row ──────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarInitial: {
    fontSize: 10,
    fontWeight: '500',
  },
  participantsMore: {
    fontSize: 11,
    marginLeft: 4,
  },
  streakText: {
    fontSize: 11,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
