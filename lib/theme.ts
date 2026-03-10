/**
 * Souleya App Theme Tokens
 * Spiegel der CSS Custom Properties aus souleya-web/src/app/globals.css
 * Farbschemata: Gold (Standard) + Dusk (Lavender/Rose)
 * Beide Themes: Light + Dark → 4 Kombinationen
 */

export interface ThemeColors {
  // Background
  bgSolid: string;
  bgGradientStart: string;
  bgGradientEnd: string;

  // Gold Palette (in Dusk: Lavender statt Gold)
  gold: string;
  goldText: string;
  goldDeep: string;
  goldBg: string;
  goldBgHover: string;
  goldBorder: string;
  goldBorderS: string;
  goldGlow: string;

  // Dusk Accent-Farben (nur in Dusk aktiv, in Gold = gold)
  accent2: string;
  accent2Soft: string;
  accent2Glow: string;
  accent3: string;

  // Text
  textH: string;
  textBody: string;
  textSec: string;
  textMuted: string;
  textOnGold: string;

  // Glass
  glass: string;
  glassBorder: string;

  // Navigation
  glassNav: string;
  glassNavB: string;

  // Dividers
  divider: string;
  dividerL: string;

  // Avatar
  avatarBg: string;

  // Input
  inputBg: string;
  inputBorder: string;

  // Status
  success: string;
  error: string;
  warning: string;

  // Tab Bar
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Enso Ring
  ensoGradientStart: string;
  ensoGradientEnd: string;
  ensoDotColor: string;
}

// ═══════════════════════════════════════════
// GOLD FARBSCHEMA (Standard)
// ═══════════════════════════════════════════

export const lightTheme: ThemeColors = {
  // Background
  bgSolid: '#EDE4D3',
  bgGradientStart: '#F5EFE6',
  bgGradientEnd: '#C9C2B2',

  // Gold
  gold: '#C8A96E',
  goldText: '#9A7218',
  goldDeep: '#7A6014',
  goldBg: 'rgba(200,169,110,0.12)',
  goldBgHover: 'rgba(200,169,110,0.20)',
  goldBorder: 'rgba(200,169,110,0.45)',
  goldBorderS: 'rgba(200,169,110,0.25)',
  goldGlow: 'rgba(200,169,110,0.40)',

  // Accents (in Gold = Gold)
  accent2: '#C8A96E',
  accent2Soft: 'rgba(200,169,110,0.12)',
  accent2Glow: 'rgba(200,169,110,0.40)',
  accent3: '#C07830',

  // Text
  textH: '#1E180C',
  textBody: '#3E3020',
  textSec: '#7A6040',
  textMuted: '#9A8870',
  textOnGold: '#FFFFFF',

  // Glass
  glass: 'rgba(255,255,255,0.45)',
  glassBorder: 'rgba(255,255,255,0.75)',

  // Navigation
  glassNav: 'rgba(255,255,255,0.38)',
  glassNavB: 'rgba(255,255,255,0.55)',

  // Dividers
  divider: 'rgba(160,140,100,0.18)',
  dividerL: 'rgba(160,140,100,0.10)',

  // Avatar
  avatarBg: 'rgba(200,169,110,0.12)',

  // Input
  inputBg: 'rgba(255,255,255,0.50)',
  inputBorder: 'rgba(200,169,110,0.25)',

  // Status
  success: '#2D8A56',
  error: '#B43C32',
  warning: '#C07830',

  // Tab Bar
  tabBarBg: 'rgba(255,255,255,0.85)',
  tabBarBorder: 'rgba(200,169,110,0.15)',
  tabBarActive: '#9A7218',
  tabBarInactive: '#9A8870',

  // Enso Ring
  ensoGradientStart: '#A8894E',
  ensoGradientEnd: '#D4BC8B',
  ensoDotColor: '#D4BC8B',
};

export const darkTheme: ThemeColors = {
  // Background
  bgSolid: '#1A1A1A',
  bgGradientStart: '#282828',
  bgGradientEnd: '#161616',

  // Gold
  gold: '#C8A96E',
  goldText: '#C8A96E',
  goldDeep: '#A8894E',
  goldBg: 'rgba(200,169,110,0.10)',
  goldBgHover: 'rgba(200,169,110,0.18)',
  goldBorder: 'rgba(200,169,110,0.30)',
  goldBorderS: 'rgba(200,169,110,0.15)',
  goldGlow: 'rgba(200,169,110,0.25)',

  // Accents (in Gold = Gold)
  accent2: '#C8A96E',
  accent2Soft: 'rgba(200,169,110,0.10)',
  accent2Glow: 'rgba(200,169,110,0.25)',
  accent3: '#E0A030',

  // Text
  textH: '#F0E8D8',
  textBody: '#c8c0b8',
  textSec: '#888888',
  textMuted: '#5A5450',
  textOnGold: '#1A1A1A',

  // Glass
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.08)',

  // Navigation
  glassNav: 'rgba(30,28,38,0.90)',
  glassNavB: 'rgba(200,169,110,0.10)',

  // Dividers
  divider: 'rgba(200,169,110,0.08)',
  dividerL: 'rgba(200,169,110,0.06)',

  // Avatar
  avatarBg: 'rgba(200,169,110,0.10)',

  // Input
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(200,169,110,0.10)',

  // Status
  success: '#52B788',
  error: '#E63946',
  warning: '#E0A030',

  // Tab Bar
  tabBarBg: '#1E1C26',
  tabBarBorder: 'rgba(200,169,110,0.10)',
  tabBarActive: '#C8A96E',
  tabBarInactive: '#5A5450',

  // Enso Ring
  ensoGradientStart: '#A8894E',
  ensoGradientEnd: '#D4BC8B',
  ensoDotColor: '#D4BC8B',
};

// ═══════════════════════════════════════════
// DUSK FARBSCHEMA (Lavender / Rose)
// ═══════════════════════════════════════════

export const duskLightTheme: ThemeColors = {
  // Background
  bgSolid: '#FAF5FF',
  bgGradientStart: '#FAF5FF',
  bgGradientEnd: '#E5E0FA',

  // Lavender (ersetzt Gold)
  gold: '#7C3AED',
  goldText: '#6D28D9',
  goldDeep: '#5B21B6',
  goldBg: 'rgba(124,58,237,0.10)',
  goldBgHover: 'rgba(124,58,237,0.18)',
  goldBorder: 'rgba(124,58,237,0.35)',
  goldBorderS: 'rgba(124,58,237,0.20)',
  goldGlow: 'rgba(124,58,237,0.30)',

  // Accents
  accent2: '#DB2777',
  accent2Soft: 'rgba(219,39,119,0.10)',
  accent2Glow: 'rgba(219,39,119,0.30)',
  accent3: '#D97706',

  // Text
  textH: '#120828',
  textBody: '#382850',
  textSec: '#6B5B8A',
  textMuted: '#9489A8',
  textOnGold: '#FFFFFF',

  // Glass
  glass: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.80)',

  // Navigation
  glassNav: 'rgba(255,255,255,0.45)',
  glassNavB: 'rgba(255,255,255,0.60)',

  // Dividers
  divider: 'rgba(124,58,237,0.12)',
  dividerL: 'rgba(124,58,237,0.06)',

  // Avatar
  avatarBg: 'rgba(124,58,237,0.12)',

  // Input
  inputBg: 'rgba(255,255,255,0.55)',
  inputBorder: 'rgba(124,58,237,0.20)',

  // Status
  success: '#2D8A56',
  error: '#B43C32',
  warning: '#D97706',

  // Tab Bar
  tabBarBg: 'rgba(255,255,255,0.85)',
  tabBarBorder: 'rgba(124,58,237,0.12)',
  tabBarActive: '#6D28D9',
  tabBarInactive: '#9489A8',

  // Enso Ring
  ensoGradientStart: '#8B5CF6',
  ensoGradientEnd: '#F472B6',
  ensoDotColor: '#A78BFA',
};

export const duskDarkTheme: ThemeColors = {
  // Background (neutral-grau, NICHT lila)
  bgSolid: '#19191F',
  bgGradientStart: '#19191F',
  bgGradientEnd: '#19191F',

  // Lavender (ersetzt Gold)
  gold: '#A78BFA',
  goldText: '#A78BFA',
  goldDeep: '#8B5CF6',
  goldBg: 'rgba(167,139,250,0.10)',
  goldBgHover: 'rgba(167,139,250,0.18)',
  goldBorder: 'rgba(167,139,250,0.30)',
  goldBorderS: 'rgba(167,139,250,0.14)',
  goldGlow: 'rgba(167,139,250,0.25)',

  // Accents
  accent2: '#F472B6',
  accent2Soft: 'rgba(244,114,182,0.10)',
  accent2Glow: 'rgba(244,114,182,0.25)',
  accent3: '#FBBF78',

  // Text
  textH: '#F0EDF5',
  textBody: '#C5C0CE',
  textSec: '#9E98AA',
  textMuted: '#807A8A',
  textOnGold: '#19191F',

  // Glass
  glass: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.06)',

  // Navigation
  glassNav: 'rgba(25,25,31,0.88)',
  glassNavB: 'rgba(255,255,255,0.06)',

  // Dividers
  divider: 'rgba(255,255,255,0.06)',
  dividerL: 'rgba(255,255,255,0.04)',

  // Avatar
  avatarBg: 'rgba(167,139,250,0.12)',

  // Input
  inputBg: 'rgba(255,255,255,0.03)',
  inputBorder: 'rgba(167,139,250,0.14)',

  // Status
  success: '#52B788',
  error: '#E63946',
  warning: '#FBBF78',

  // Tab Bar
  tabBarBg: 'rgba(25,25,31,0.92)',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  tabBarActive: '#A78BFA',
  tabBarInactive: '#807A8A',

  // Enso Ring
  ensoGradientStart: '#8B5CF6',
  ensoGradientEnd: '#F472B6',
  ensoDotColor: '#A78BFA',
};
