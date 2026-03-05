import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../../components/Icon';
import { fetchF2FSlots } from '../../lib/studio';
import type { F2FSlot } from '../../types/studio';

export default function CalendarScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [slots, setSlots] = useState<F2FSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchF2FSlots()
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  // Gruppiere Slots nach Datum
  const grouped: Record<string, F2FSlot[]> = {};
  for (const slot of slots) {
    const date = new Date(slot.starts_at).toLocaleDateString('de-DE', {
      weekday: 'long', day: '2-digit', month: 'long',
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(slot);
  }

  const statusColor = (s: string) => {
    if (s === 'available') return colors.success ?? '#22863a';
    if (s === 'booked') return colors.gold;
    return colors.textMuted;
  };

  const statusLabel = (s: string) => {
    if (s === 'available') return 'VERFUEGBAR';
    if (s === 'booked') return 'GEBUCHT';
    return s.toUpperCase();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgSolid }]} contentContainerStyle={styles.content}>
      {Object.keys(grouped).length === 0 ? (
        <View style={styles.empty}>
          <Icon name="calendar-event" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keine Termine vorhanden</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([date, dateSlots]) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={[styles.dateTitle, { color: colors.goldDeep }]}>{date.toUpperCase()}</Text>
            {dateSlots.map((slot) => {
              const time = new Date(slot.starts_at).toLocaleTimeString('de-DE', {
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <View key={slot.id} style={[styles.slotCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                  <View style={styles.slotTime}>
                    <Text style={[styles.timeText, { color: colors.textH }]}>{time}</Text>
                    <Text style={[styles.durationText, { color: colors.textMuted }]}>{slot.duration_minutes} Min</Text>
                  </View>
                  <View style={[styles.slotStatus, { backgroundColor: `${statusColor(slot.status)}18` }]}>
                    <Text style={[styles.slotStatusText, { color: statusColor(slot.status) }]}>
                      {statusLabel(slot.status)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  dateGroup: { marginBottom: 20 },
  dateTitle: { fontSize: 9, letterSpacing: 3, marginBottom: 8 },

  slotCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  slotTime: { gap: 2 },
  timeText: { fontSize: 16, fontWeight: '500' },
  durationText: { fontSize: 11 },
  slotStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  slotStatusText: { fontSize: 8, letterSpacing: 2, fontWeight: '600' },

  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyText: { fontSize: 13 },
});
