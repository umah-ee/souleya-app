import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Profile } from '../../types/profile';
import type { ThemeColors } from '../../lib/theme';

const VISIBLE_COUNT = 6;

interface ProfileInterestsProps {
  profile: Profile;
  colors: ThemeColors;
}

export default function ProfileInterests({ profile, colors }: ProfileInterestsProps) {
  const [expanded, setExpanded] = useState(false);
  const interests = profile.interests ?? [];

  if (interests.length === 0) return null;

  const visible = expanded ? interests : interests.slice(0, VISIBLE_COUNT);
  const hiddenCount = interests.length - VISIBLE_COUNT;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>INTERESSEN</Text>

      <View style={styles.tagsRow}>
        {visible.map((tag) => (
          <View
            key={tag}
            style={[styles.tag, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}
          >
            <Text style={[styles.tagText, { color: colors.goldDeep }]}>{tag}</Text>
          </View>
        ))}

        {!expanded && hiddenCount > 0 && (
          <TouchableOpacity
            style={[styles.moreTag, { borderColor: colors.goldBorderS }]}
            onPress={() => setExpanded(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.moreText, { color: colors.goldDeep }]}>
              +{hiddenCount} weitere
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
    textAlign: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
