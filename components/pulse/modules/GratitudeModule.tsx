import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

const STORAGE_KEY = 'souleya_gratitude';
const getTodayKey = () => new Date().toISOString().slice(0, 10);

interface Props { onRemove: () => void }

export default function GratitudeModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [entries, setEntries] = useState(['', '', '']);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.date === getTodayKey() && Array.isArray(data.entries)) {
          setEntries(data.entries);
          setSaved(true);
        }
      } catch {}
    });
  }, []);

  const hasContent = entries.some((e) => e.trim().length > 0);

  const handleSave = async () => {
    if (!hasContent) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), entries }));
    setSaved(true);
  };

  const updateEntry = (idx: number, val: string) => {
    const next = [...entries];
    next[idx] = val;
    setEntries(next);
    setSaved(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="heart" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Dankbarkeit</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.prompt, { color: colors.textSec }]}>
        Wofuer bist du heute dankbar?
      </Text>

      {entries.map((e, i) => (
        <TextInput
          key={i}
          style={[styles.input, { color: colors.textH, borderColor: colors.divider, backgroundColor: colors.bgSolid + '60' }]}
          value={e}
          onChangeText={(v) => updateEntry(i, v)}
          placeholder={`${i + 1}. …`}
          placeholderTextColor={colors.textMuted}
        />
      ))}

      <TouchableOpacity
        style={[styles.btn, saved ? { backgroundColor: colors.gold + '20', borderColor: colors.gold } : { borderColor: colors.divider }]}
        onPress={handleSave}
        disabled={!hasContent || saved}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, { color: saved ? colors.gold : colors.textMuted }]}>
          {saved ? 'Gespeichert' : 'Speichern'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  prompt: { fontSize: 13, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  btn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  btnText: { fontSize: 12, fontWeight: '600' },
});
