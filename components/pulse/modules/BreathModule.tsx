import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Alert } from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

const MODES = [
  { key: 'box', label: 'Box', duration: '3 Min.' },
  { key: '478', label: '4-7-8', duration: '4 Min.' },
  { key: 'wimhof', label: 'Wim Hof', duration: '5 Min.' },
] as const;

interface Props { onRemove: () => void }

export default function BreathModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [mode, setMode] = useState<string>('box');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 4000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const currentMode = MODES.find((m) => m.key === mode) ?? MODES[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="droplet" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Atemuebung</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Animated.View style={[styles.circle, { borderColor: colors.gold, transform: [{ scale: scaleAnim }] }]}>
          <Icon name="droplet" size={20} color={colors.gold} />
        </Animated.View>

        <View style={styles.modes}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.pill, mode === m.key && { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[styles.pillText, { color: mode === m.key ? colors.gold : colors.textMuted }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.gold }]}
          onPress={() => Alert.alert('Atemuebung', `${currentMode.label}-Atmung wird gestartet …`)}
          activeOpacity={0.8}
        >
          <Text style={[styles.ctaText, { color: colors.textOnGold }]}>
            Starten · {currentMode.duration}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  body: { alignItems: 'center', gap: 14 },
  circle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  modes: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  pillText: { fontSize: 12, fontWeight: '500' },
  cta: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  ctaText: { fontSize: 13, fontWeight: '600' },
});
