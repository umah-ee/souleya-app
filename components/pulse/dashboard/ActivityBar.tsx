import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

interface Props {
  unreadMessages: number;
  newPosts: number;
}

export default function ActivityBar({ unreadMessages, newPosts }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();

  if (unreadMessages <= 0 && newPosts <= 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      {unreadMessages > 0 && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/chat' as never)}
          activeOpacity={0.7}
        >
          <View style={[styles.dot, { backgroundColor: colors.gold }]} />
          <Text style={[styles.text, { color: colors.textSec }]}>
            {unreadMessages} ungelesene {unreadMessages === 1 ? 'Nachricht' : 'Nachrichten'}
          </Text>
          <Icon name="chevron-right" size={12} color={colors.textMuted} />
        </TouchableOpacity>
      )}
      {newPosts > 0 && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/circles' as never)}
          activeOpacity={0.7}
        >
          <View style={[styles.dot, { backgroundColor: '#48BB78' }]} />
          <Text style={[styles.text, { color: colors.textSec }]}>
            {newPosts} neue {newPosts === 1 ? 'Beitrag' : 'Beitraege'}
          </Text>
          <Icon name="chevron-right" size={12} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});
