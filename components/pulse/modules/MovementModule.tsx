import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

const EXERCISES = [
  { key: 'stretch', label: 'Dehnen', duration: '5 Min.' },
  { key: 'yoga', label: 'Yoga Flow', duration: '10 Min.' },
  { key: 'walk', label: 'Spaziergang', duration: '15 Min.' },
];

interface Props { onRemove: () => void }

export default function MovementModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [selected, setSelected] = useState('stretch');

  const current = EXERCISES.find((e) => e.key === selected) ?? EXERCISES[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="heart" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Bewegung</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.exercises}>
        {EXERCISES.map((ex) => (
          <TouchableOpacity
            key={ex.key}
            style={[styles.pill, selected === ex.key && { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}
            onPress={() => setSelected(ex.key)}
          >
            <Text style={[styles.pillText, { color: selected === ex.key ? colors.gold : colors.textMuted }]}>
              {ex.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.cta, { backgroundColor: colors.gold }]}
        onPress={() => Alert.alert('Bewegung', `${current.label} wird gestartet …`)}
        activeOpacity={0.8}
      >
        <Text style={[styles.ctaText, { color: colors.textOnGold }]}>
          Los geht's · {current.duration}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  exercises: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  pillText: { fontSize: 13, fontWeight: '500' },
  cta: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, alignSelf: 'center' },
  ctaText: { fontSize: 13, fontWeight: '600' },
});
