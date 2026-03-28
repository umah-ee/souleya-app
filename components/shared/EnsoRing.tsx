/**
 * Souleya Enso Ring – Soul Level System v3 (React Native)
 * Level 1–5 mit progressiv schliessendem Kreis
 * First Light (Halo + Kern) + Mentor-Kompassstern
 * Quelle: Mockups/Souleya_EnsoRing_Levels.html
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path, Filter, FeGaussianBlur } from 'react-native-svg';

// ── Soul Level Ring Konfiguration (aus Mockup) ─────────────
const LEVEL_CONFIG: Record<number, { dasharray: string }> = {
  1: { dasharray: '45 181' },    // Soul Spark
  2: { dasharray: '83 143' },    // Awakened Soul
  3: { dasharray: '120 106' },   // Harmony Keeper
  4: { dasharray: '158 68' },    // Zen Master
  5: { dasharray: '196 30' },    // Soul Mentor
};

// ── Groessen-Varianten ──────────────────────────────────────
const SIZE_CONFIG = {
  'profile': { svgSize: 88, avatarSize: 56, avatarOffset: 16 },
  'profile-large': { svgSize: 112, avatarSize: 72, avatarOffset: 20 },
  'header': { svgSize: 43, avatarSize: 29, avatarOffset: 7 },
  'feed': { svgSize: 44, avatarSize: 28, avatarOffset: 8 },
  'standalone': { svgSize: 48, avatarSize: 0, avatarOffset: 0 },
} as const;

interface EnsoRingProps {
  /** Soul Level 1–5 */
  soulLevel: number;
  /** First Light – Pulsierender Halo + Leuchtpunkt bei ~2 Uhr */
  isFirstLight?: boolean;
  /** Mentor – Kompassstern bei ~12:30 Uhr (nur Level 5) */
  isMentor?: boolean;
  /** Groesse */
  size?: keyof typeof SIZE_CONFIG;
  /** Avatar oder anderer Inhalt, zentriert im Ring */
  children?: React.ReactNode;
}

export default function EnsoRing({
  soulLevel,
  isFirstLight = false,
  isMentor = false,
  size = 'standalone',
  children,
}: EnsoRingProps) {
  const level = Math.max(1, Math.min(5, soulLevel));
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];
  const { svgSize, avatarSize, avatarOffset } = SIZE_CONFIG[size];

  return (
    <View style={[styles.container, { width: svgSize, height: svgSize }]}>
      {/* SVG Enso Ring */}
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 100 100"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="enso-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#A8894E" />
            <Stop offset="100%" stopColor="#D4BC8B" />
          </LinearGradient>
        </Defs>

        {/* Level 5: Blur-Glow-Ring (Doppelring-Effekt) */}
        {level === 5 && (
          <Circle
            cx="50" cy="50" r="36" fill="none"
            stroke="#D4BC8B"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="196 30"
            strokeDashoffset="15"
            opacity={0.15}
          />
        )}

        {/* Haupt-Ring */}
        <Circle
          cx="50" cy="50" r="36" fill="none"
          stroke="url(#enso-grad)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={config.dasharray}
          strokeDashoffset="15"
        />

        {/* First Light: Halo + Leucht-Kern bei ~2 Uhr */}
        {isFirstLight && (
          <>
            <Circle cx="82.8" cy="35.2" r="10" fill="#D4BC8B" opacity={0.3} />
            <Circle cx="82.8" cy="35.2" r="5" fill="#D4BC8B" />
          </>
        )}

        {/* Mentor-Kompassstern bei ~12:30 Uhr (nur Level 5) */}
        {isMentor && (
          <G transform="translate(61.2, 15.8)">
            <Path
              d="M 0,-8 L 1.8,-1.8 L 8,0 L 1.8,1.8 L 0,8 L -1.8,1.8 L -8,0 L -1.8,-1.8 Z"
              fill="#D4BC8B"
            />
            <Circle r="2.5" fill="#D4BC8B" />
          </G>
        )}
      </Svg>

      {/* Avatar (zentriert im Ring) */}
      {children && size !== 'standalone' && (
        <View
          style={[
            styles.avatarContainer,
            {
              top: avatarOffset,
              left: avatarOffset,
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
});
