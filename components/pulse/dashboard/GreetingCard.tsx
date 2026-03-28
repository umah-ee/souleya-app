import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '../../../store/theme';

interface Props {
  displayName: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Guten Morgen';
  if (h >= 12 && h < 17) return 'Guten Tag';
  if (h >= 17 && h < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

function formatDateLong(): string {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function GreetingCard({ displayName }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const firstName = displayName?.split(' ')[0] ?? '';
  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <Text style={[styles.greeting, { color: colors.textH }]}>
        {greeting}
        {firstName ? (
          <Text style={[styles.name, { color: colors.gold }]}>, {firstName}</Text>
        ) : null}
      </Text>
      <Text style={[styles.date, { color: colors.textMuted }]}>
        {formatDateLong()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  name: {
    fontStyle: 'italic',
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
  },
});
