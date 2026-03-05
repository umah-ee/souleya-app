import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../../components/Icon';
import { fetchMediaItems } from '../../lib/studio';
import type { MediaItem } from '../../types/studio';

const TYPE_FILTERS = [
  { key: '', label: 'Alle' },
  { key: 'video', label: 'Video' },
  { key: 'audio', label: 'Audio' },
  { key: 'pdf', label: 'PDF' },
  { key: 'image', label: 'Bild' },
];

const TYPE_ICONS: Record<string, IconName> = {
  video: 'video',
  audio: 'microphone',
  pdf: 'file-text',
  image: 'photo',
};

const TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  image: 'Bild',
};

export default function ContentScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchMediaItems({ content_type: typeFilter || undefined });
      setItems(res.data);
    } catch {
      setItems([]);
    }
  }, [typeFilter]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: MediaItem }) => {
    const icon = TYPE_ICONS[item.content_type] ?? 'file-text';
    const typeLabel = TYPE_LABELS[item.content_type] ?? item.content_type;

    return (
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.goldBg }]}>
            <Icon name={icon} size={18} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.textH }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{typeLabel}</Text>
          </View>
          {item.is_micro_content && (
            <View style={[styles.microBadge, { backgroundColor: colors.goldBg }]}>
              <Text style={{ fontSize: 7, letterSpacing: 0.5, color: colors.goldText }}>MICRO</Text>
            </View>
          )}
        </View>

        <View style={styles.cardMeta}>
          {item.duration_seconds != null && item.duration_seconds > 0 && (
            <Text style={{ fontSize: 10, color: colors.textSec }}>
              {Math.floor(item.duration_seconds / 60)} Min
            </Text>
          )}
          {item.rating_avg > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="star" size={10} color={colors.gold} />
              <Text style={{ fontSize: 10, color: colors.goldText }}>
                {item.rating_avg.toFixed(1)}
              </Text>
            </View>
          )}
          {item.download_count > 0 && (
            <Text style={{ fontSize: 10, color: colors.textSec }}>
              {item.download_count}x
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSolid }]}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              {
                backgroundColor: typeFilter === f.key ? colors.goldBg : 'transparent',
                borderColor: typeFilter === f.key ? colors.goldBorderS : colors.glassBorder,
              },
            ]}
            onPress={() => setTypeFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={{
              fontSize: 10, letterSpacing: 1,
              color: typeFilter === f.key ? colors.goldText : colors.textMuted,
            }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="photo" size={32} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
                Noch keine Medien hochgeladen.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },

  list: { padding: 20, paddingTop: 4 },
  gridRow: { gap: 10, marginBottom: 10 },

  card: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 13, fontStyle: 'italic' },
  microBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
});
