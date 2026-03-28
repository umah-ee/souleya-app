import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

interface Challenge {
  id: string;
  title: string;
  duration_days: number;
  my_progress?: {
    total_checkins: number;
    current_streak: number;
    completed: boolean;
  };
}

interface Props {
  challenges: Challenge[];
  onCheckin: (id: string, dayNumber: number) => void;
  checkingIn?: Record<string, boolean>;
}

export default function ChallengeWidget({ challenges, onCheckin, checkingIn = {} }: Props) {
  const colors = useThemeStore((s) => s.colors);

  if (!challenges.length) return null;
  const ch = challenges[0];
  const checkins = ch.my_progress?.total_checkins ?? 0;
  const streak = ch.my_progress?.current_streak ?? 0;
  const completed = ch.my_progress?.completed ?? false;
  const totalDays = ch.duration_days;
  const todayNumber = checkins + 1;
  const maxDots = Math.min(totalDays, 14);
  const isLoading = checkingIn[ch.id];

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="sparkles" size={16} color={colors.gold} />
        <Text style={[styles.headerLabel, { color: colors.gold }]}>AKTIVE CHALLENGE</Text>
        {streak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: colors.gold + '20' }]}>
            <Text style={[styles.streakText, { color: colors.gold }]}>{streak} Tage</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.textH }]}>{ch.title}</Text>
      <Text style={[styles.progress, { color: colors.textMuted }]}>
        Tag {Math.min(todayNumber, totalDays)} von {totalDays}
      </Text>

      {/* Dots */}
      <View style={styles.dots}>
        {Array.from({ length: maxDots }, (_, i) => {
          const day = i + 1;
          const isDone = day <= checkins;
          const isCurrent = day === todayNumber && !completed;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                isDone && { backgroundColor: colors.gold },
                isCurrent && { borderWidth: 2, borderColor: colors.gold, backgroundColor: 'transparent' },
                !isDone && !isCurrent && { backgroundColor: colors.divider },
              ]}
            />
          );
        })}
        {totalDays > 14 && (
          <Text style={[styles.moreDots, { color: colors.textMuted }]}>+{totalDays - 14}</Text>
        )}
      </View>

      {/* CTA */}
      {!completed && todayNumber <= totalDays && (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.gold }]}
          onPress={() => onCheckin(ch.id, todayNumber)}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textOnGold} />
          ) : (
            <Text style={[styles.ctaText, { color: colors.textOnGold }]}>Erledigt</Text>
          )}
        </TouchableOpacity>
      )}
      {completed && (
        <Text style={[styles.completedText, { color: colors.gold }]}>Abgeschlossen</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLabel: { flex: 1, fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  streakBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  streakText: { fontSize: 10, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600' },
  progress: { fontSize: 12, fontWeight: '500' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  moreDots: { fontSize: 10, fontWeight: '600', marginLeft: 2 },
  cta: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  ctaText: { fontSize: 13, fontWeight: '600' },
  completedText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
});
