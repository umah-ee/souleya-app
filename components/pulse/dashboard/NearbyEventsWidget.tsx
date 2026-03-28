import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

interface SoEvent {
  id: string;
  title: string;
  starts_at: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
}

interface Props {
  events: SoEvent[];
  userLat?: number;
  userLng?: number;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function getRelativeDay(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Heute';
    if (d.toDateString() === tomorrow.toDateString()) return 'Morgen';
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function NearbyEventsWidget({ events, userLat, userLng }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();

  if (!events.length) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="calendar-event" size={16} color={colors.gold} />
        <Text style={[styles.headerLabel, { color: colors.textH }]}>Events in der Naehe</Text>
        <TouchableOpacity onPress={() => router.push('/discover' as never)} hitSlop={8}>
          <Text style={[styles.allLink, { color: colors.gold }]}>Alle</Text>
        </TouchableOpacity>
      </View>

      {events.slice(0, 3).map((ev) => (
        <View key={ev.id} style={[styles.eventRow, { borderTopColor: colors.divider }]}>
          <View style={styles.timeBlock}>
            <Text style={[styles.time, { color: colors.textH }]}>{formatTime(ev.starts_at)}</Text>
            <Text style={[styles.day, { color: colors.textMuted }]}>{getRelativeDay(ev.starts_at)}</Text>
          </View>
          <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: colors.textH }]} numberOfLines={1}>
              {ev.title}
            </Text>
            <View style={styles.locationRow}>
              <Icon name="map-pin" size={12} color={colors.textMuted} />
              <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>
                {ev.location_name}
              </Text>
            </View>
          </View>
          {userLat != null && userLng != null && (
            <View style={[styles.distanceBadge, { backgroundColor: colors.gold + '18' }]}>
              <Text style={[styles.distanceText, { color: colors.gold }]}>
                {distanceKm(userLat, userLng, ev.location_lat, ev.location_lng)}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headerLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  allLink: { fontSize: 12, fontWeight: '600' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  timeBlock: { width: 50, alignItems: 'center' },
  time: { fontSize: 14, fontWeight: '600', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }) },
  day: { fontSize: 10, fontWeight: '500' },
  dividerLine: { width: 1, height: 28, borderRadius: 1 },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 13, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 11, fontWeight: '500' },
  distanceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  distanceText: { fontSize: 10, fontWeight: '600' },
});
