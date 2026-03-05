import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../../components/Icon';
import { fetchFinanceOverview, fetchCoupons, fetchPayouts, toggleCoupon, deleteCoupon } from '../../lib/studio';
import type { FinanceOverview, Coupon, MentorPayout } from '../../types/studio';

export default function FinanceScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [payouts, setPayouts] = useState<MentorPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchFinanceOverview().catch(() => null),
      fetchCoupons().catch(() => []),
      fetchPayouts().then((r) => r.data).catch(() => []),
    ]).then(([o, c, p]) => {
      if (o) setOverview(o);
      if (Array.isArray(c)) setCoupons(c);
      if (Array.isArray(p)) setPayouts(p);
    }).finally(() => setLoading(false));
  }, []);

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const updated = await toggleCoupon(coupon.id);
      setCoupons((prev) => prev.map((c) => c.id === coupon.id ? updated : c));
    } catch {}
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    Alert.alert('Coupon loeschen', `Coupon "${coupon.code}" wirklich loeschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Loeschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCoupon(coupon.id);
            setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const formatEur = (cents: number) =>
    `${(cents / 100).toFixed(2).replace('.', ',')} EUR`;

  const kpis: { label: string; value: string; icon: IconName }[] = [
    { label: 'GESAMTUMSATZ', value: overview ? formatEur(overview.total_revenue_cents) : '—', icon: 'wallet' },
    { label: 'DIESER MONAT', value: overview ? formatEur(overview.this_month_cents) : '—', icon: 'chart-line' },
    { label: 'AUSSTEHEND', value: overview ? formatEur(overview.pending_payout_cents) : '—', icon: 'clock' },
    { label: 'ENROLLMENTS', value: String(overview?.total_enrollments ?? 0), icon: 'users' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgSolid }]} contentContainerStyle={styles.content}>
      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Icon name={kpi.icon} size={16} color={colors.gold} />
            <Text style={[styles.kpiValue, { color: colors.textH }]}>{kpi.value}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Coupons */}
      <Text style={[styles.sectionTitle, { color: colors.goldDeep }]}>COUPONS</Text>
      {coupons.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
            Keine Coupons.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8, marginBottom: 24 }}>
          {coupons.map((c) => (
            <View key={c.id} style={[styles.couponCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', fontFamily: 'monospace', color: colors.goldText }}>
                  {c.code}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 11, color: colors.textSec }}>
                    {c.discount_percent ? `${c.discount_percent}%` : `${((c.discount_amount_cents ?? 0) / 100).toFixed(0)} EUR`}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>
                    {c.used_count}/{c.max_uses ?? '∞'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => handleToggleCoupon(c)} activeOpacity={0.7}>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: c.is_active ? '#22863a18' : '#A8545418' },
                ]}>
                  <Text style={{ fontSize: 8, letterSpacing: 1, color: c.is_active ? '#22863a' : '#A85454' }}>
                    {c.is_active ? 'AKTIV' : 'INAKTIV'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteCoupon(c)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="trash" size={14} color="#A85454" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Auszahlungen */}
      <Text style={[styles.sectionTitle, { color: colors.goldDeep }]}>AUSZAHLUNGEN</Text>
      {payouts.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
            Noch keine Auszahlungen.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {payouts.map((p) => (
            <View key={p.id} style={[styles.payoutCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textH }}>
                {(p.amount_cents / 100).toFixed(2)} {p.currency}
              </Text>
              <View style={[
                styles.statusPill,
                { backgroundColor: p.status === 'completed' ? '#22863a18' : '#C8A96E18' },
              ]}>
                <Text style={{
                  fontSize: 8, letterSpacing: 1,
                  color: p.status === 'completed' ? '#22863a' : '#C8A96E',
                }}>
                  {p.status.toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 'auto' }}>
                {new Date(p.period_start).toLocaleDateString('de-DE')} – {new Date(p.period_end).toLocaleDateString('de-DE')}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  kpiCard: {
    width: '47%' as unknown as number, flexGrow: 1,
    borderRadius: 14, borderWidth: 1, padding: 14,
    alignItems: 'center', gap: 4,
  },
  kpiValue: { fontSize: 18, fontStyle: 'italic' },
  kpiLabel: { fontSize: 7, letterSpacing: 2 },

  sectionTitle: { fontSize: 9, letterSpacing: 3, marginBottom: 10 },

  emptyCard: {
    borderRadius: 14, borderWidth: 1, padding: 24,
    alignItems: 'center', marginBottom: 24,
  },

  couponCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },

  payoutCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },

  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
