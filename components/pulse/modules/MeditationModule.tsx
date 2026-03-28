import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

const DURATIONS = [5, 10, 15, 20];

interface Props { onRemove: () => void }

export default function MeditationModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [duration, setDuration] = useState(10);

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="clock" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Meditation</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.durations}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.pill, duration === d && { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}
            onPress={() => setDuration(d)}
          >
            <Text style={[styles.pillText, { color: duration === d ? colors.gold : colors.textMuted }]}>
              {d} Min.
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.cta, { backgroundColor: colors.gold }]}
        onPress={() => Alert.alert('Meditation', `${duration}-Minuten-Meditation wird gestartet …`)}
        activeOpacity={0.8}
      >
        <Text style={[styles.ctaText, { color: colors.textOnGold }]}>Starten</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  durations: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  pillText: { fontSize: 13, fontWeight: '500' },
  cta: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, alignSelf: 'center' },
  ctaText: { fontSize: 13, fontWeight: '600' },
});
