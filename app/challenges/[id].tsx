import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Alert, RefreshControl, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../../components/Icon';
import Svg, { Circle } from 'react-native-svg';
import {
  fetchChallenge, fetchChallengeProgress, fetchChallengeParticipants,
  joinChallenge, leaveChallenge, checkinChallenge,
} from '../../lib/challenges';
import type { Challenge, ChallengeParticipant, ChallengeProgress } from '../../types/challenges';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDayNumber(startsAt: string): number {
  const start = new Date(startsAt);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1; // Tag 1 = Starttag
}

// ── Progress Ring Konstanten ──────────────────────────────────
const RING_SIZE = 130;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const colors = useThemeStore((s) => s.colors);
  const userId = session?.user?.id;

  // ── State ───────────────────────────────────────────────
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Daten laden ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [challengeData, participantsData] = await Promise.all([
        fetchChallenge(id),
        fetchChallengeParticipants(id),
      ]);
      setChallenge(challengeData);
      setParticipants(participantsData);

      // Fortschritt nur laden, wenn User beigetreten ist
      if (challengeData.has_joined) {
        try {
          const progressData = await fetchChallengeProgress(id);
          setProgress(progressData);
        } catch {
          // Kein Fortschritt vorhanden
          setProgress(null);
        }
      } else {
        setProgress(null);
      }
    } catch (e) {
      console.error('Challenge laden fehlgeschlagen:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Aktionen ────────────────────────────────────────────
  const handleJoin = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      await joinChallenge(id);
      await loadData();
    } catch (e) {
      Alert.alert('Fehler', 'Beitreten fehlgeschlagen.');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = () => {
    if (!id) return;
    Alert.alert('Challenge verlassen', 'Moechtest du diese Challenge wirklich verlassen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Verlassen',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaveChallenge(id);
            await loadData();
          } catch (e) {
            Alert.alert('Fehler', 'Verlassen fehlgeschlagen.');
            console.error(e);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCheckin = async () => {
    if (!id || !challenge || actionLoading) return;
    const dayNum = getDayNumber(challenge.starts_at);
    if (dayNum < 1 || dayNum > challenge.duration_days) return;

    // Optimistic UI
    const prevProgress = progress;
    if (progress) {
      setProgress({
        ...progress,
        total_checkins: progress.total_checkins + 1,
        current_streak: progress.current_streak + 1,
        checkins: [...progress.checkins, { day_number: dayNum, checked_at: new Date().toISOString(), note: null }],
      });
    }

    setActionLoading(true);
    try {
      await checkinChallenge(id, dayNum);
      await loadData();
    } catch (e) {
      // Rollback
      setProgress(prevProgress);
      Alert.alert('Fehler', 'Check-in fehlgeschlagen.');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!challenge) return;
    try {
      await Share.share({
        message: `${challenge.emoji} ${challenge.title} – Mach mit bei der ${challenge.duration_days}-Tage-Challenge auf Souleya!`,
        url: `https://circle.souleya.com/challenges/${challenge.id}`,
      });
    } catch {
      // Abgebrochen
    }
  };

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Challenge nicht gefunden.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.gold, fontSize: 14 }}>Zurueck</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Berechnungen ────────────────────────────────────────
  const hasJoined = challenge.has_joined ?? false;
  const isCreator = challenge.creator_id === userId;
  const currentDay = getDayNumber(challenge.starts_at);
  const checkins = progress?.checkins ?? [];
  const checkedDays = new Set(checkins.map((c) => c.day_number));
  const checkedInToday = checkedDays.has(currentDay);
  const totalCheckins = progress?.total_checkins ?? 0;
  const progressPercent = Math.round((totalCheckins / challenge.duration_days) * 100);
  const creatorName = challenge.creator?.display_name ?? challenge.creator?.username ?? 'Unbekannt';

  // SVG Progress Ring
  const strokeDashoffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * Math.min(progressPercent, 100)) / 100;

  // ── Tages-Grid rendern ──────────────────────────────────
  const renderDayGrid = () => {
    const rows: React.ReactNode[] = [];
    const totalDays = challenge.duration_days;
    const daysPerRow = 7;
    const rowCount = Math.ceil(totalDays / daysPerRow);

    for (let row = 0; row < rowCount; row++) {
      const cells: React.ReactNode[] = [];
      for (let col = 0; col < daysPerRow; col++) {
        const dayNum = row * daysPerRow + col + 1;
        if (dayNum > totalDays) {
          cells.push(<View key={`empty-${col}`} style={styles.dayCell} />);
          continue;
        }

        const isChecked = checkedDays.has(dayNum);
        const isToday = dayNum === currentDay;
        const isFuture = dayNum > currentDay;
        const isMissed = dayNum < currentDay && !isChecked && hasJoined;

        let cellStyle: object[] = [styles.dayCell];
        let cellTextStyle: object = { color: colors.textMuted, fontSize: 10 };
        let cellContent = String(dayNum);

        if (isChecked) {
          cellStyle = [...cellStyle, { backgroundColor: colors.gold }];
          cellTextStyle = { color: colors.textOnGold, fontSize: 12, fontWeight: '600' as const };
          cellContent = '\u2713';
        } else if (isToday) {
          cellStyle = [...cellStyle, { borderWidth: 2, borderColor: colors.gold }];
          cellTextStyle = { color: colors.gold, fontSize: 10, fontWeight: '600' as const };
        } else if (isFuture) {
          cellStyle = [...cellStyle, { backgroundColor: colors.glass }];
          cellTextStyle = { color: colors.textMuted, fontSize: 10 };
        } else if (isMissed) {
          cellStyle = [...cellStyle, { backgroundColor: colors.glass }];
          cellTextStyle = { color: colors.textMuted, fontSize: 10 };
          cellContent = '\u2013';
        }

        cells.push(
          <View key={dayNum} style={cellStyle}>
            <Text style={cellTextStyle}>{cellContent}</Text>
          </View>,
        );
      }
      rows.push(
        <View key={`row-${row}`} style={styles.dayRow}>
          {cells}
        </View>,
      );
    }
    return rows;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
        }
      >
        {/* ── Header Bar ─────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.glass }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={20} color={colors.textH} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: colors.textH }]} numberOfLines={1}>
            {challenge.title}
          </Text>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.glass }]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Icon name="share" size={18} color={colors.textH} />
          </TouchableOpacity>
        </View>

        {/* ── Emoji + Info Card ───────────────────────────────── */}
        <View style={[styles.headerCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Text style={styles.headerEmoji}>{challenge.emoji}</Text>
          <Text style={[styles.headerTitle, { color: colors.textH }]}>{challenge.title}</Text>
          <Text style={[styles.headerCreator, { color: colors.textSec }]}>
            von {creatorName}
          </Text>
          <Text style={[styles.headerDates, { color: colors.textMuted }]}>
            {formatDate(challenge.starts_at)} – {formatDate(challenge.ends_at)}
          </Text>

          {challenge.description ? (
            <Text style={[styles.description, { color: colors.textBody }]}>
              {challenge.description}
            </Text>
          ) : null}

          {/* Teilnehmer-Zaehler */}
          <View style={[styles.participantsBadge, { backgroundColor: colors.goldBg }]}>
            <Icon name="users" size={12} color={colors.gold} />
            <Text style={[styles.participantsBadgeText, { color: colors.gold }]}>
              {challenge.participants_count} Teilnehmer
            </Text>
          </View>
        </View>

        {/* ── Progress Ring (nur wenn beigetreten) ───────────── */}
        {hasJoined && (
          <View style={[styles.section, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <View style={styles.sectionHeader}>
              <Icon name="target" size={14} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textH }]}>Fortschritt</Text>
            </View>

            <View style={styles.progressCenter}>
              {/* SVG Progress Ring */}
              <View style={styles.ringContainer}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  {/* Background Circle */}
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={colors.divider}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  {/* Progress Circle */}
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={colors.gold}
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${RING_CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>
                <View style={styles.ringContent}>
                  <Text style={[styles.ringFraction, { color: colors.gold }]}>
                    {totalCheckins}/{challenge.duration_days}
                  </Text>
                  <Text style={[styles.ringPercent, { color: colors.textMuted }]}>
                    {progressPercent}%
                  </Text>
                </View>
              </View>

              {/* Streak */}
              {(progress?.current_streak ?? 0) > 0 && (
                <View style={styles.streakRow}>
                  <Icon name="flame" size={16} color={colors.gold} />
                  <Text style={[styles.streakValue, { color: colors.gold }]}>
                    {progress?.current_streak} Tage Streak
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Tage-Grid ──────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <View style={styles.sectionHeader}>
            <Icon name="circle-check" size={14} color={colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: colors.textH }]}>Tagesplan</Text>
          </View>

          {/* Wochentag-Header */}
          <View style={styles.dayRow}>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
              <View key={d} style={styles.dayHeaderCell}>
                <Text style={[styles.dayHeaderText, { color: colors.textMuted }]}>{d}</Text>
              </View>
            ))}
          </View>

          {renderDayGrid()}
        </View>

        {/* ── Teilnehmer ─────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <View style={styles.sectionHeader}>
            <Icon name="users" size={14} color={colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: colors.textH }]}>
              Teilnehmer ({challenge.participants_count})
            </Text>
          </View>

          {participants.map((p) => {
            const user = p.user;
            const name = user?.display_name ?? user?.username ?? 'Anonym';
            const initial = name.slice(0, 1).toUpperCase();
            const avatarUri = user?.avatar_url;
            const pPercent = Math.round((p.total_checkins / challenge.duration_days) * 100);

            return (
              <View key={p.id} style={[styles.participantItem, { borderBottomColor: colors.dividerL }]}>
                {/* Avatar */}
                <View style={[styles.participantAvatar, { backgroundColor: colors.avatarBg, borderColor: colors.goldBorderS }]}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.participantAvatarImg} />
                  ) : (
                    <Text style={[styles.participantInitial, { color: colors.gold }]}>{initial}</Text>
                  )}
                </View>

                {/* Info */}
                <View style={styles.participantInfo}>
                  <Text style={[styles.participantName, { color: colors.textH }]}>{name}</Text>
                  <View style={styles.participantMeta}>
                    {p.current_streak > 0 && (
                      <View style={styles.streakBadge}>
                        <Icon name="flame" size={10} color={colors.gold} />
                        <Text style={[styles.participantStreak, { color: colors.textMuted }]}>
                          {p.current_streak}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.participantProgress, { color: colors.textMuted }]}>
                      {pPercent}%
                    </Text>
                  </View>
                </View>

                {/* Fortschrittsbalken */}
                <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.gold,
                        width: `${Math.min(pPercent, 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          {participants.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Noch keine Teilnehmer.
            </Text>
          )}
        </View>

        {/* ── Aktionsbereich ─────────────────────────────────── */}
        <View style={styles.actionsContainer}>
          {!hasJoined ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.gold }, actionLoading && { opacity: 0.5 }]}
              onPress={handleJoin}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.textOnGold} />
              ) : (
                <>
                  <Icon name="plus" size={16} color={colors.textOnGold} />
                  <Text style={[styles.primaryBtnText, { color: colors.textOnGold }]}>Mitmachen</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              {/* Check-in Button */}
              {currentDay >= 1 && currentDay <= challenge.duration_days && !checkedInToday && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.gold }, actionLoading && { opacity: 0.5 }]}
                  onPress={handleCheckin}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.textOnGold} />
                  ) : (
                    <>
                      <Icon name="check" size={16} color={colors.textOnGold} />
                      <Text style={[styles.primaryBtnText, { color: colors.textOnGold }]}>
                        Tag {currentDay} geschafft
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {checkedInToday && (
                <View style={[styles.checkedBanner, { backgroundColor: colors.goldBg, borderColor: colors.goldBorder }]}>
                  <Icon name="circle-check" size={16} color={colors.gold} />
                  <Text style={[styles.checkedBannerText, { color: colors.gold }]}>
                    Heute bereits eingecheckt
                  </Text>
                </View>
              )}

              {/* Teilen */}
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.goldBorderS }]}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Icon name="share" size={14} color={colors.textMuted} />
                <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Teilen</Text>
              </TouchableOpacity>

              {/* Verlassen */}
              {!isCreator && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.divider }]}
                  onPress={handleLeave}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Verlassen</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // ── Top Bar ───────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header Card ───────────────────────────────────────────
  headerCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  headerEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerCreator: {
    fontSize: 13,
  },
  headerDates: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    marginTop: 4,
  },
  participantsBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Section ───────────────────────────────────────────────
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Progress Ring ─────────────────────────────────────────
  progressCenter: {
    alignItems: 'center',
    gap: 12,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContent: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  ringFraction: {
    fontSize: 22,
    fontWeight: '600',
  },
  ringPercent: {
    fontSize: 11,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Tage-Grid ─────────────────────────────────────────────
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayHeaderCell: {
    width: 36,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Teilnehmer ────────────────────────────────────────────
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  participantAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  participantInitial: {
    fontSize: 14,
    fontWeight: '400',
  },
  participantInfo: {
    flex: 1,
    gap: 2,
  },
  participantName: {
    fontSize: 13,
    fontWeight: '500',
  },
  participantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  participantStreak: {
    fontSize: 11,
  },
  participantProgress: {
    fontSize: 11,
  },
  progressBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // ── Aktionen ──────────────────────────────────────────────
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  checkedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkedBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
