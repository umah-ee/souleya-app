import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../Icon';

export type DiscoverSegment = 'alle' | 'mitglieder' | 'events' | 'orte';

interface Props {
  active: DiscoverSegment;
  onChange: (segment: DiscoverSegment) => void;
  counts?: { mitglieder: number; events: number; orte: number };
}

const SEGMENTS: { key: DiscoverSegment; label: string; icon: IconName }[] = [
  { key: 'alle', label: 'Alle', icon: 'compass' },
  { key: 'mitglieder', label: 'Mitglieder', icon: 'users' },
  { key: 'events', label: 'Events', icon: 'calendar-event' },
  { key: 'orte', label: 'Orte', icon: 'building' },
];

export default function FloatingSegmentTabs({ active, onChange, counts }: Props) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass,
          borderColor: colors.divider,
        },
      ]}
    >
      {SEGMENTS.map((seg) => {
        const isActive = seg.key === active;
        const count = counts && seg.key !== 'alle' ? counts[seg.key as keyof typeof counts] : 0;
        return (
          <TouchableOpacity
            key={seg.key}
            onPress={() => onChange(seg.key)}
            activeOpacity={0.7}
            style={[
              styles.tab,
              isActive && {
                borderBottomColor: colors.gold,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Icon
              name={seg.icon}
              size={14}
              color={isActive ? colors.gold : colors.textMuted}
            />
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.gold : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {seg.label}
              {count > 0 ? ` (${count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    letterSpacing: 0.3,
  },
});
