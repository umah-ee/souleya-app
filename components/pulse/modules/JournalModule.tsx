import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

const STORAGE_KEY = 'souleya_journal';
const getTodayKey = () => new Date().toISOString().slice(0, 10);

const PROMPTS = [
  'Was beschaeftigt dich gerade am meisten?',
  'Wann hast du dich zuletzt richtig lebendig gefuehlt?',
  'Was wuerdest du tun, wenn du keine Angst haettest?',
  'Welche Gewohnheit moechtest du loslassen?',
  'Was hat dir heute ein Laecheln geschenkt?',
  'Welchem Menschen moechtest du Danke sagen?',
  'Was bedeutet Freiheit fuer dich?',
];

function getDailyPrompt(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return PROMPTS[dayOfYear % PROMPTS.length];
}

interface Props { onRemove: () => void }

export default function JournalModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const prompt = getDailyPrompt();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.date === getTodayKey()) {
          setText(data.text);
          setSaved(true);
        }
      } catch {}
    });
  }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), text }));
    setSaved(true);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="pencil" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Micro-Journal</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.prompt, { color: colors.textSec }]}>{prompt}</Text>

      <TextInput
        style={[styles.input, { color: colors.textH, borderColor: colors.divider, backgroundColor: colors.bgSolid + '60' }]}
        value={text}
        onChangeText={(v) => { setText(v); setSaved(false); }}
        placeholder="Schreib drauf los …"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.btn, saved ? { backgroundColor: colors.gold + '20', borderColor: colors.gold } : { borderColor: colors.divider }]}
        onPress={handleSave}
        disabled={!text.trim() || saved}
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
  prompt: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, minHeight: 72 },
  btn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  btnText: { fontSize: 12, fontWeight: '600' },
});
