import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../../components/Icon';
import { fetchDashboardKPIs, fetchRecentActivity } from '../../lib/studio';
import type { StudioDashboardKPIs } from '../../types/studio';

const QUICK_ACTIONS: { route: string; icon: IconName; label: string }[] = [
  { route: '/studio/courses', icon: 'book', label: 'Kurse' },
  { route: '/studio/calendar', icon: 'calendar-event', label: 'Kalender' },
  { route: '/studio/f2f', icon: 'users', label: 'F2F' },
  { route: '/studio/messages', icon: 'message-circle', label: 'Nachrichten' },
];

export default function StudioDashboard() {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();
  const [kpis, setKpis] = useState<StudioDashboardKPIs | null>(null);
  const [activity, setActivity] = useState<{ type: string; text: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDashboardKPIs().catch(() => null),
      fetchRecentActivity().catch(() => []),
    ]).then(([k, a]) => {
      if (k) setKpis(k);
      if (Array.isArray(a)) setActivity(a);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const mainKPIs = [
    { label: 'KURSE', value: kpis?.active_courses ?? 0, icon: 'book' as IconName },
    { label: 'TEILNEHMER', value: kpis?.total_students ?? 0, icon: 'users' as IconName },
    { label: 'UMSATZ', value: `${((kpis?.total_revenue_cents ?? 0) / 100).toFixed(0)} €`, icon: 'wallet' as IconName },
    { label: 'BEWERTUNG', value: kpis?.avg_rating ? kpis.avg_rating.toFixed(1) : '–', icon: 'star' as IconName },
  ];

  const secondaryKPIs = [
    { label: 'NEUE EINSCHR.', value: kpis?.new_enrollments_this_month ?? 0 },
    { label: 'TERMINE', value: kpis?.upcoming_sessions ?? 0 },
    { label: 'REVIEWS', value: kpis?.pending_reviews ?? 0 },
    { label: 'NACHRICHTEN', value: kpis?.unread_messages ?? 0 },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgSolid }]} contentContainerStyle={styles.content}>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        {mainKPIs.map((kpi) => (
          <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Icon name={kpi.icon} size={18} color={colors.gold} />
            <Text style={[styles.kpiValue, { color: colors.textH }]}>
              {kpi.value}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
              {kpi.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Secondary KPIs */}
      <View style={[styles.secondaryRow, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        {secondaryKPIs.map((kpi, i) => (
          <View key={kpi.label} style={[
            styles.secondaryItem,
            i < secondaryKPIs.length - 1 && { borderRightWidth: 1, borderRightColor: colors.dividerL },
          ]}>
            <Text style={[styles.secondaryValue, { color: colors.textSec }]}>{kpi.value}</Text>
            <Text style={[styles.secondaryLabel, { color: colors.textMuted }]}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.goldDeep }]}>SCHNELLZUGRIFF</Text>
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={[styles.quickBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
            onPress={() => router.push(action.route as never)}
            activeOpacity={0.7}
          >
            <Icon name={action.icon} size={20} color={colors.gold} />
            <Text style={[styles.quickLabel, { color: colors.textH }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      {activity.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.goldDeep }]}>LETZTE AKTIVITAET</Text>
          <View style={[styles.activityCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            {activity.map((item, i) => (
              <View
                key={`${item.created_at}-${i}`}
                style={[
                  styles.activityItem,
                  i < activity.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.dividerL },
                ]}
              >
                <Text style={[styles.activityText, { color: colors.textBody }]} numberOfLines={2}>
                  {item.text}
                </Text>
                <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                  {new Date(item.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  kpiCard: {
    width: '48%' as unknown as number,
    flexGrow: 1,
    borderRadius: 16, borderWidth: 1, padding: 16,
    alignItems: 'center', gap: 6,
  },
  kpiValue: { fontSize: 24, fontWeight: '500' },
  kpiLabel: { fontSize: 8, letterSpacing: 2.5 },

  secondaryRow: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 24,
  },
  secondaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  secondaryValue: { fontSize: 16, fontWeight: '500' },
  secondaryLabel: { fontSize: 6, letterSpacing: 2 },

  sectionTitle: { fontSize: 9, letterSpacing: 3, marginBottom: 10 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickBtn: {
    width: '48%' as unknown as number,
    flexGrow: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  quickLabel: { fontSize: 14, fontWeight: '400' },

  activityCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  activityItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, gap: 10 },
  activityText: { flex: 1, fontSize: 13 },
  activityTime: { fontSize: 11 },
});
