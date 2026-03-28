import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../../store/theme';
import { Icon, type IconName } from '../../Icon';

const STORAGE_KEY = 'souleya_checkin';
const getTodayKey = () => new Date().toISOString().slice(0, 10);

const MOODS: { key: string; icon: IconName; label: string }[] = [
  { key: 'exhausted', icon: 'moon', label: 'Erschoepft' },
  { key: 'okay', icon: 'clock', label: 'Okay' },
  { key: 'good', icon: 'face-smile', label: 'Gut' },
  { key: 'great', icon: 'sun', label: 'Super' },
  { key: 'radiant', icon: 'sparkles', label: 'Strahlend' },
];

interface Props { onRemove: () => void }

export default function CheckinModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.date === getTodayKey()) setSelected(data.mood);
      } catch {}
    });
  }, []);

  const handleSelect = async (mood: string) => {
    setSelected(mood);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), mood }));
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="face-smile" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Check-in</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.prompt, { color: colors.textSec }]}>
        Wie fuehlt sich dein Tag an?
      </Text>

      <View style={styles.moods}>
        {MOODS.map((m) => {
          const active = selected === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.moodBtn, active && { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}
              onPress={() => handleSelect(m.key)}
              activeOpacity={0.7}
            >
              <Icon name={m.icon} size={20} color={active ? colors.gold : colors.textMuted} />
              <Text style={[styles.moodLabel, { color: active ? colors.gold : colors.textMuted }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  prompt: { fontSize: 13, fontWeight: '500' },
  moods: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  moodBtn: { alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', flex: 1 },
  moodLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
});
