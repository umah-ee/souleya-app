import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { fetchFeed } from '../../lib/pulse';
import { fetchChallenges, joinChallenge, checkinChallenge, fetchChallenge } from '../../lib/challenges';
import type { Pulse } from '../../types/pulse';
import type { Challenge } from '../../types/challenges';
import PulseCard from '../../components/PulseCard';
import CreatePulseModal from '../../components/CreatePulseModal';
import ChallengeCard from '../../components/challenges/ChallengeCard';
import CreateChallengeModal from '../../components/challenges/CreateChallengeModal';
import { Icon } from '../../components/Icon';

export default function HomeScreen() {
  const { session } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);

  const userId = session?.user.id;

  const loadFeed = useCallback(async (pageNum: number, replace: boolean) => {
    const result = await fetchFeed(pageNum, 20);
    setPulses((prev) => replace ? result.pulses : [...prev, ...result.pulses]);
    setHasMore(result.hasMore);
    setPage(pageNum);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadFeed(1, true).finally(() => setLoading(false));
  }, [loadFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(1, true);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadFeed(page + 1, false);
    setLoadingMore(false);
  };

  const handleCreated = (pulse: Pulse) => {
    setPulses((prev) => [pulse, ...prev]);
  };

  const handleDelete = (id: string) => {
    setPulses((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Challenges laden ────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetchChallenges({ page: 1, limit: 10 })
      .then((res) => setChallenges(res.data))
      .catch(console.error);
  }, [session]);

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const res = await joinChallenge(challengeId);
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId
            ? { ...c, has_joined: true, participants_count: res.participants_count }
            : c,
        ),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckinChallenge = async (challengeId: string) => {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge) return;
    const startDate = new Date(challenge.starts_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - startDay.getTime();
    const currentDayNumber = Math.max(
      1,
      Math.min(challenge.duration_days, Math.floor(diffMs / 86400000) + 1),
    );
    try {
      await checkinChallenge(challengeId, currentDayNumber);
      const updated = await fetchChallenge(challengeId);
      setChallenges((prev) => prev.map((c) => (c.id === challengeId ? updated : c)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleChallengeCreated = (challenge: Challenge) => {
    setChallenges((prev) => [challenge, ...prev]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bgSolid }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Icon name="sparkles" size={22} color={colors.gold} />
        <Text style={[styles.headerTitle, { color: colors.gold }]}>PULSE</Text>
      </View>

      <FlatList
        data={pulses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PulseCard pulse={item} currentUserId={userId} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            {/* Challenges Section */}
            {challenges.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="target" size={14} color={colors.gold} />
                    <Text style={{ fontSize: 9, letterSpacing: 3, color: colors.gold, textTransform: 'uppercase' }}>Challenges</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCreateChallenge(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass }}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={10} color={colors.textMuted} />
                    <Text style={{ fontSize: 9, letterSpacing: 1, color: colors.textMuted }}>NEU</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {challenges.map((challenge) => {
                    const startDate = new Date(challenge.starts_at);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDay = new Date(startDate);
                    startDay.setHours(0, 0, 0, 0);
                    const diffMs = today.getTime() - startDay.getTime();
                    const currentDayNumber = Math.max(1, Math.min(challenge.duration_days, Math.floor(diffMs / 86400000) + 1));
                    const checkinDays = new Set((challenge.my_progress?.checkins ?? []).map((c: any) => c.day_number));
                    const checkedInToday = checkinDays.has(currentDayNumber);
                    return (
                      <View key={challenge.id} style={{ width: 260 }}>
                        <ChallengeCard
                          challenge={challenge}
                          currentDayNumber={currentDayNumber}
                          checkedInToday={checkedInToday}
                          onJoin={() => handleJoinChallenge(challenge.id)}
                          onCheckin={() => handleCheckinChallenge(challenge.id)}
                          onPress={() => router.push(`/challenges/${challenge.id}` as any)}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            {/* "Erste Challenge" button wenn keine Challenges */}
            {challenges.length === 0 && session && (
              <TouchableOpacity
                onPress={() => setShowCreateChallenge(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 12, marginBottom: 12, borderRadius: 12,
                  borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass,
                }}
                activeOpacity={0.7}
              >
                <Icon name="target" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 10, letterSpacing: 2, color: colors.textMuted }}>ERSTE CHALLENGE STARTEN</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.gold} style={{ margin: 16 }} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.goldDeep }]}>Der Pulse wartet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Teile als erstes deinen Impuls.</Text>
          </View>
        }
      />

      {/* FAB – Neuer Pulse */}
      {session && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80, backgroundColor: colors.gold }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={24} color={colors.textOnGold} />
        </TouchableOpacity>
      )}

      <CreatePulseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />

      <CreateChallengeModal
        visible={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        onCreated={handleChallengeCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 11, letterSpacing: 4 },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '400', marginBottom: 8, letterSpacing: 1 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  fab: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8A96E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
