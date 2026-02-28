import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { fetchFeed } from '../../lib/pulse';
import type { Pulse } from '../../types/pulse';
import PulseCard from '../../components/PulseCard';
import CreatePulseModal from '../../components/CreatePulseModal';
import { Icon } from '../../components/Icon';

export default function HomeScreen() {
  const { session } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

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
