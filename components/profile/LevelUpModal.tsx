import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, StyleSheet, Platform, Dimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useThemeStore } from '../../store/theme';

const SCREEN = Dimensions.get('window');

const LEVEL_NAMES: Record<number, string> = {
  1: 'Soul Spark',
  2: 'Awakened Soul',
  3: 'Harmony Keeper',
  4: 'Zen Master',
  5: 'Soul Mentor',
};

const LEVEL_UNLOCKS: Record<number, string[]> = {
  2: ['Profil fuer alle sichtbar', 'Pulse-Feed aktiv', 'Events beitreten'],
  3: ['Eigene Events erstellen', 'Goldener Rahmen im Feed'],
  4: ['Empfohlen-Badge', 'Community-Post', 'Prominentere Sichtbarkeit'],
  5: ['Mentor-Status', 'Kompassstern am Enso-Ring', 'Mentor-Sessions anbieten'],
};

interface Props {
  newLevel: number | null;
  onClose: () => void;
}

export default function LevelUpModal({ newLevel, onClose }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ensoRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (newLevel && newLevel >= 2) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 15, stiffness: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Enso-Ring Rotation
      Animated.loop(
        Animated.timing(ensoRotate, { toValue: 1, duration: 8000, useNativeDriver: true }),
      ).start();
    }
  }, [newLevel]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      onClose();
    });
  };

  if (!newLevel || !visible) return null;

  const levelName = LEVEL_NAMES[newLevel] ?? `Soul ${newLevel}`;
  const unlocks = LEVEL_UNLOCKS[newLevel] ?? [];
  const spin = ensoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View style={[
          styles.modal,
          {
            backgroundColor: colors.bgElevated,
            borderColor: `${colors.gold}44`,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          {/* Enso Ring */}
          <View style={styles.ensoWrap}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Svg viewBox="0 0 100 100" width={80} height={80}>
                <Defs>
                  <LinearGradient id="lvlup-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#A8894E" />
                    <Stop offset="100%" stopColor="#D4BC8B" />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={50} cy={50} r={36}
                  fill="none"
                  stroke="url(#lvlup-grad)"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray="196 30"
                  strokeDashoffset={15}
                />
              </Svg>
            </Animated.View>
          </View>

          {/* Text */}
          <Text style={[styles.label, { color: colors.gold }]}>AUFGESTIEGEN</Text>
          <Text style={[styles.title, { color: colors.textH }]}>{levelName}</Text>
          <Text style={[styles.levelNum, { color: colors.gold }]}>Soul {newLevel}</Text>

          {/* Unlocks */}
          {unlocks.length > 0 && (
            <View style={styles.unlocksSection}>
              <Text style={[styles.unlocksLabel, { color: colors.textMuted }]}>FREIGESCHALTET</Text>
              {unlocks.map((u) => (
                <View key={u} style={styles.unlockRow}>
                  <Text style={{ color: colors.gold, fontSize: 12 }}>✦</Text>
                  <Text style={[styles.unlockText, { color: colors.textSec }]}>{u}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.gold }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, { color: colors.bgSolid }]}>Weiter</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: SCREEN.width * 0.85,
    maxWidth: 360,
    borderRadius: 8,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  ensoWrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 4,
  },
  levelNum: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 24,
  },
  unlocksSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  unlocksLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 10,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  unlockText: {
    fontSize: 13,
    fontWeight: '500',
  },
  btn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
