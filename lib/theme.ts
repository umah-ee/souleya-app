/**
 * Souleya App Theme Tokens
 * Spiegel der CSS Custom Properties aus souleya-web/src/app/globals.css
 * Beide Themes: Light (Sand-Gradient) + Dark (Anthrazit)
 */

export interface ThemeColors {
  // Background
  bgSolid: string;
  bgGradientStart: string;
  bgGradientEnd: string;

  // Gold Palette
  gold: string;
  goldText: string;
  goldDeep: string;
  goldBg: string;
  goldBgHover: string;
  goldBorder: string;
  goldBorderS: string;
  goldGlow: string;

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
}

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
};
