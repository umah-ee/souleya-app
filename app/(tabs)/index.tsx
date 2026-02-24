import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { fetchFeed } from '../../lib/pulse';
import type { Pulse } from '../../types/pulse';
import PulseCard from '../../components/PulseCard';
import CreatePulseModal from '../../components/CreatePulseModal';
import { Icon } from '../../components/Icon';

export default function HomeScreen() {
  const { session } = useAuthStore();
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
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#C8A96E" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="home" size={22} color="#C8A96E" />
        <Text style={styles.headerTitle}>PULSE</Text>
      </View>

      <FlatList
        data={pulses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PulseCard pulse={item} currentUserId={userId} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#C8A96E" />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#C8A96E" style={{ margin: 16 }} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Der Pulse wartet</Text>
            <Text style={styles.emptyText}>Teile als erstes deinen Impuls.</Text>
          </View>
        }
      />

      {/* FAB – Neuer Pulse */}
      {session && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={24} color="#2C2A35" />
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
  container: { flex: 1, backgroundColor: '#18161F' },
  center: { flex: 1, backgroundColor: '#18161F', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.08)',
  },
  headerLogo: { fontSize: 22, color: '#C8A96E' },
  headerTitle: { fontSize: 11, letterSpacing: 4, color: '#C8A96E' },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '300', color: '#A8894E', marginBottom: 8, letterSpacing: 1 },
  emptyText: { fontSize: 13, color: '#5A5450', textAlign: 'center' },
  fab: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#C8A96E',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8A96E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 24, color: '#2C2A35', lineHeight: 28, fontWeight: '300' },
});
