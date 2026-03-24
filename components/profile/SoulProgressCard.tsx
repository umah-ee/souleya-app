import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { fetchProgression, type ProgressionStatus } from '../../lib/progression';
import { Icon } from '../Icon';

interface Props {
  soulLevel: number;
}

export default function SoulProgressCard({ soulLevel }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [status, setStatus] = useState<ProgressionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchProgression();
      setStatus(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [soulLevel]);

  useEffect(() => {
    setIsLoading(true);
    loadStatus();
  }, [loadStatus]);

  // Soul 1 = Wizard, Soul 5 = Maximum
  if (soulLevel < 2 || soulLevel >= 5 || isLoading || !status || !status.nextLevel) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.divider }]}>
      {/* Header */}
      <Text style={[styles.heading, { color: colors.textH }]}>
        Dein Weg zu {status.nextLevelName}
      </Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Soul {status.currentLevel} · {status.currentLevelName}
      </Text>

      {/* Fortschrittsbalken */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>FORTSCHRITT</Text>
          <Text style={[styles.progressPercent, { color: colors.gold }]}>
            {status.overallProgress}%
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${status.overallProgress}%`, backgroundColor: colors.gold },
            ]}
          />
        </View>
      </View>

      {/* Requirements */}
      <View style={styles.requirements}>
        {status.requirements.map((req) => (
          <View key={req.key} style={styles.reqRow}>
            <View style={[
              styles.checkbox,
              req.completed
                ? { backgroundColor: colors.gold }
                : { borderWidth: 1.5, borderColor: colors.textMuted },
            ]}>
              {req.completed && (
                <Icon name="check" size={12} color="#FFF" />
              )}
            </View>
            <Text
              style={[
                styles.reqLabel,
                { color: req.completed ? colors.gold : colors.textH },
              ]}
              numberOfLines={1}
            >
              {req.label}
            </Text>
            <Text style={[styles.reqCount, { color: req.completed ? colors.gold : colors.textMuted }]}>
              {typeof req.current === 'number' && typeof req.target === 'number'
                ? `${req.current} / ${req.target}`
                : req.completed ? '✓' : '–'}
            </Text>
          </View>
        ))}
      </View>

      {/* Unlocks Preview */}
      {status.unlocksAtNextLevel.length > 0 && (
        <View style={[styles.unlocksBox, { backgroundColor: `${colors.gold}10` }]}>
          <View style={styles.unlocksHeader}>
            <Icon name="sparkles" size={14} color={colors.gold} />
            <Text style={[styles.unlocksTitle, { color: colors.gold }]}>SCHALTET FREI</Text>
          </View>
          {status.unlocksAtNextLevel.map((unlock, i) => (
            <Text key={i} style={[styles.unlockItem, { color: colors.textMuted }]}>
              · {unlock}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heading: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  requirements: {
    gap: 10,
    marginBottom: 16,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  reqCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  unlocksBox: {
    borderRadius: 8,
    padding: 12,
  },
  unlocksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  unlocksTitle: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  unlockItem: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 3,
  },
});
