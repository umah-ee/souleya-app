import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

const STORAGE_KEY = 'souleya_intention';
const getTodayKey = () => new Date().toISOString().slice(0, 10);

interface Props { onRemove: () => void }

export default function IntentionModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [intention, setIntention] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.date === getTodayKey()) {
          setIntention(data.text);
          setSaved(true);
        }
      } catch {}
    });
  }, []);

  const handleSave = async () => {
    if (!intention.trim()) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), text: intention }));
    setSaved(true);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="navigation" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Tagesintention</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, { color: colors.textH, borderColor: colors.divider, backgroundColor: colors.bgSolid + '60' }]}
        value={intention}
        onChangeText={(v) => { setIntention(v); setSaved(false); }}
        placeholder="Heute bin ich …"
        placeholderTextColor={colors.textMuted}
      />

      <TouchableOpacity
        style={[styles.btn, saved ? { backgroundColor: colors.gold + '20', borderColor: colors.gold } : { borderColor: colors.divider }]}
        onPress={handleSave}
        disabled={!intention.trim() || saved}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, { color: saved ? colors.gold : colors.textMuted }]}>
          {saved ? 'Gesetzt' : 'Setzen'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  btn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  btnText: { fontSize: 12, fontWeight: '600' },
});
