import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useThemeStore } from '../../store/theme';

interface Props {
  tags: string[];
  activeTags: string[];
  userInterests?: string[];
  onToggle: (tag: string) => void;
}

const MAX_VISIBLE = 8;

export default function FloatingTagBar({ tags, activeTags, userInterests = [], onToggle }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [expanded, setExpanded] = useState(false);

  // Zeige aktive Tags + user interests zuerst, dann den Rest
  const sortedTags = [...new Set([
    ...activeTags,
    ...userInterests.filter((i) => tags.includes(i)),
    ...tags,
  ])].filter((t) => tags.includes(t));

  const visibleTags = expanded ? sortedTags : sortedTags.slice(0, MAX_VISIBLE);
  const hiddenCount = sortedTags.length - MAX_VISIBLE;

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
      {visibleTags.map((tag) => {
        const isActive = activeTags.includes(tag);
        const isUserInterest = userInterests.includes(tag);
        const isHighlighted = isActive || isUserInterest;
        return (
          <TouchableOpacity
            key={tag}
            onPress={() => onToggle(tag)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: isHighlighted ? `${colors.gold}25` : 'transparent',
                borderColor: isHighlighted ? colors.gold : `${colors.textMuted}40`,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isHighlighted ? colors.gold : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {tag}
            </Text>
          </TouchableOpacity>
        );
      })}

      {!expanded && hiddenCount > 0 && (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          activeOpacity={0.7}
          style={[styles.chip, { borderColor: `${colors.gold}60`, borderStyle: 'dashed' }]}
        >
          <Text style={[styles.label, { color: colors.gold }]}>+{hiddenCount}</Text>
        </TouchableOpacity>
      )}

      {expanded && (
        <TouchableOpacity
          onPress={() => setExpanded(false)}
          activeOpacity={0.7}
          style={[styles.chip, { borderColor: `${colors.textMuted}40`, borderStyle: 'dashed' }]}
        >
          <Text style={[styles.label, { color: colors.textMuted }]}>weniger</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
});
