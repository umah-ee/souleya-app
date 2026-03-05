import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../../components/Icon';
import { fetchCourses, updateCourse } from '../../lib/studio';
import type { Course, CourseStatus } from '../../types/studio';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'active', label: 'Aktiv' },
  { key: 'draft', label: 'Entwurf' },
  { key: 'archived', label: 'Archiv' },
];

const STATUS_COLORS: Record<CourseStatus, { bg: string; text: string }> = {
  active: { bg: '#22863a18', text: '#22863a' },
  draft: { bg: '#C8A96E18', text: '#C8A96E' },
  archived: { bg: '#9A908018', text: '#9A9080' },
  sold_out: { bg: '#A8545418', text: '#A85454' },
};

export default function CoursesScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await fetchCourses(filter !== 'all' ? { status: filter } : undefined);
      setCourses(res.data);
    } catch {
      // silent
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleStatus = async (course: Course) => {
    const newStatus: CourseStatus = course.status === 'active' ? 'draft' : 'active';
    try {
      const updated = await updateCourse(course.id, { status: newStatus });
      setCourses((prev) => prev.map((c) => (c.id === course.id ? updated : c)));
    } catch {
      // silent
    }
  };

  const renderCourse = ({ item }: { item: Course }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <View style={[styles.courseCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        {item.cover_url && (
          <Image source={{ uri: item.cover_url }} style={styles.courseCover} />
        )}
        <View style={styles.courseBody}>
          <View style={styles.courseHeader}>
            <Text style={[styles.courseTitle, { color: colors.textH }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.courseMeta}>
            <View style={styles.metaItem}>
              <Icon name="users" size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {item.participants_count}{item.max_participants ? `/${item.max_participants}` : ''}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="star" size={12} color={colors.gold} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {item.rating_avg > 0 ? item.rating_avg.toFixed(1) : '–'}
              </Text>
            </View>
            {item.price_cents > 0 && (
              <Text style={[styles.priceText, { color: colors.gold }]}>
                {(item.price_cents / 100).toFixed(0)} €
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.toggleBtn, { borderColor: colors.goldBorderS }]}
            onPress={() => toggleStatus(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, { color: colors.goldText }]}>
              {item.status === 'active' ? 'DEAKTIVIEREN' : 'AKTIVIEREN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSolid }]}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              filter === tab.key && { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS },
              filter !== tab.key && { borderColor: colors.glassBorder },
            ]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterText,
              { color: filter === tab.key ? colors.gold : colors.textMuted },
            ]}>
              {tab.label}
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
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourse}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="book" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keine Kurse gefunden</Text>
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
  list: { padding: 20, gap: 12 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  filterText: { fontSize: 10, letterSpacing: 2 },

  courseCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  courseCover: { width: '100%', height: 120 },
  courseBody: { padding: 16, gap: 10 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  courseTitle: { fontSize: 16, fontWeight: '500', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 8, letterSpacing: 2, fontWeight: '600' },

  courseMeta: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  priceText: { fontSize: 14, fontWeight: '500', marginLeft: 'auto' },

  toggleBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  toggleText: { fontSize: 8, letterSpacing: 2 },

  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyText: { fontSize: 13 },
});
