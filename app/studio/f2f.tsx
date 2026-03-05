import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../../components/Icon';
import { fetchF2FPricings, fetchF2FBookings } from '../../lib/studio';
import type { F2FPricing, F2FBooking } from '../../types/studio';

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: 'AUSSTEHEND',
  confirmed: 'BESTAETIGT',
  completed: 'ABGESCHLOSSEN',
  cancelled: 'STORNIERT',
};

export default function F2FScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [pricing, setPricing] = useState<F2FPricing[]>([]);
  const [bookings, setBookings] = useState<F2FBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchF2FPricings().catch(() => []),
      fetchF2FBookings().catch(() => ({ data: [] })),
    ]).then(([p, b]) => {
      if (Array.isArray(p)) setPricing(p);
      if (b && Array.isArray(b.data)) setBookings(b.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const bookingStatusColor = (s: string) => {
    if (s === 'confirmed') return colors.success ?? '#22863a';
    if (s === 'pending') return colors.gold;
    if (s === 'cancelled') return '#A85454';
    return colors.textMuted;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgSolid }]} contentContainerStyle={styles.content}>

      {/* Pricing Cards */}
      <Text style={[styles.sectionTitle, { color: colors.goldDeep }]}>PREISE</Text>
      {pricing.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keine Preise konfiguriert</Text>
        </View>
      ) : (
        <View style={styles.pricingGrid}>
          {pricing.map((p) => (
            <View key={p.id} style={[styles.pricingCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[styles.pricingDuration, { color: colors.textH }]}>{p.duration_minutes} Min</Text>
              <Text style={[styles.pricingPrice, { color: colors.gold }]}>{(p.price_cents / 100).toFixed(0)} €</Text>
              {p.label && (
                <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>{p.label}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Bookings */}
      <Text style={[styles.sectionTitle, { color: colors.goldDeep, marginTop: 24 }]}>BUCHUNGEN</Text>
      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="users" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keine Buchungen</Text>
        </View>
      ) : (
        bookings.map((booking) => {
          const sc = bookingStatusColor(booking.status);
          return (
            <View key={booking.id} style={[styles.bookingCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <View style={styles.bookingHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.bookingClient, { color: colors.textH }]}>
                    {(booking as { client_name?: string }).client_name ?? 'Teilnehmer'}
                  </Text>
                  <Text style={[styles.bookingDate, { color: colors.textMuted }]}>
                    {new Date(booking.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={[styles.bookingStatus, { backgroundColor: `${sc}18` }]}>
                  <Text style={[styles.bookingStatusText, { color: sc }]}>
                    {BOOKING_STATUS_LABEL[booking.status] ?? booking.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.bookingMeta}>
                <Text style={[styles.bookingAmount, { color: colors.gold }]}>
                  {(booking.amount_cents / 100).toFixed(0)} €
                </Text>
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 9, letterSpacing: 3, marginBottom: 10 },

  pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pricingCard: {
    borderRadius: 16, borderWidth: 1, padding: 20,
    alignItems: 'center', gap: 4, minWidth: 100, flexGrow: 1,
  },
  pricingDuration: { fontSize: 14, fontWeight: '500' },
  pricingPrice: { fontSize: 24, fontWeight: '600' },
  pricingLabel: { fontSize: 11 },

  bookingCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, gap: 10 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingClient: { fontSize: 15, fontWeight: '500' },
  bookingDate: { fontSize: 12 },
  bookingStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bookingStatusText: { fontSize: 8, letterSpacing: 2, fontWeight: '600' },
  bookingMeta: { flexDirection: 'row' },
  bookingAmount: { fontSize: 16, fontWeight: '500' },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { fontSize: 13 },
});
