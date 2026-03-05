import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../../components/Icon';
import { fetchCourses, fetchEnrollments } from '../../lib/studio';
import type { Course, Enrollment } from '../../types/studio';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#22863a18', text: '#22863a' },
  completed: { bg: '#C8A96E18', text: '#C8A96E' },
  paused: { bg: '#9A908018', text: '#9A9080' },
  waitlisted: { bg: '#A8545418', text: '#A85454' },
};

export default function ParticipantsScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  useEffect(() => {
    fetchCourses({ limit: 100 })
      .then((r) => {
        setCourses(r.data);
        if (r.data.length > 0) setSelectedCourse(r.data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoadingEnrollments(true);
    fetchEnrollments(selectedCourse)
      .then((r) => setEnrollments(r.data))
      .catch(() => setEnrollments([]))
      .finally(() => setLoadingEnrollments(false));
  }, [selectedCourse]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <Icon name="users" size={32} color={colors.textMuted} />
        <Text style={{ fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }}>
          Erstelle zuerst einen Kurs.
        </Text>
      </View>
    );
  }

  const renderEnrollment = ({ item }: { item: Enrollment }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.active;
    return (
      <View style={[styles.enrollCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={[styles.avatar, { backgroundColor: colors.glassBorder }]}>
          {item.user?.avatar_url ? (
            <Image source={{ uri: item.user.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Icon name="user" size={16} color={colors.textMuted} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.textH }]}>
            {item.user?.display_name ?? item.user?.username ?? 'User'}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textSec }}>
            Fortschritt: {item.progress_percent}%
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={{ fontSize: 8, letterSpacing: 1, color: statusStyle.text }}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSolid }]}>
      {/* Kurs-Auswahl */}
      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.courseRow}
        renderItem={({ item: c }) => (
          <TouchableOpacity
            style={[
              styles.coursePill,
              {
                backgroundColor: selectedCourse === c.id ? colors.goldBg : 'transparent',
                borderColor: selectedCourse === c.id ? colors.goldBorderS : colors.glassBorder,
              },
            ]}
            onPress={() => setSelectedCourse(c.id)}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 10, letterSpacing: 1,
                color: selectedCourse === c.id ? colors.goldText : colors.textMuted,
              }}
              numberOfLines={1}
            >
              {c.title}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Enrollments */}
      {loadingEnrollments ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={enrollments}
          keyExtractor={(e) => e.id}
          renderItem={renderEnrollment}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="users" size={24} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
                Keine Teilnehmer in diesem Kurs.
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },

  courseRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  coursePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, maxWidth: 160 },

  list: { padding: 20, paddingTop: 4, gap: 8 },
  enrollCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },

  avatar: {
    width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },

  userName: { fontSize: 13 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  empty: { alignItems: 'center', gap: 8, paddingTop: 40 },
});
