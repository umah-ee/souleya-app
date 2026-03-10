import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  lightTheme,
  darkTheme,
  duskLightTheme,
  duskDarkTheme,
  type ThemeColors,
} from '../lib/theme';

export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'gold' | 'dusk';

interface ThemeState {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  loadSavedTheme: () => Promise<void>;
}

const THEME_KEY = 'souleya_theme';
const COLOR_KEY = 'souleya_color';

/** 2×2 Matrix: colorScheme × mode → ThemeColors */
function resolveColors(mode: ThemeMode, colorScheme: ColorScheme): ThemeColors {
  if (colorScheme === 'dusk') {
    return mode === 'dark' ? duskDarkTheme : duskLightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  colorScheme: 'gold',
  colors: darkTheme,

  toggleTheme: () =>
    set((state) => {
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      SecureStore.setItemAsync(THEME_KEY, newMode).catch(() => {});
      return {
        mode: newMode,
        colors: resolveColors(newMode, state.colorScheme),
      };
    }),

  setTheme: (mode: ThemeMode) => {
    const { colorScheme } = get();
    SecureStore.setItemAsync(THEME_KEY, mode).catch(() => {});
    set({
      mode,
      colors: resolveColors(mode, colorScheme),
    });
  },

  setColorScheme: (scheme: ColorScheme) => {
    const { mode } = get();
    SecureStore.setItemAsync(COLOR_KEY, scheme).catch(() => {});
    set({
      colorScheme: scheme,
      colors: resolveColors(mode, scheme),
    });
  },

  loadSavedTheme: async () => {
    try {
      const [savedMode, savedColor] = await Promise.all([
        SecureStore.getItemAsync(THEME_KEY),
        SecureStore.getItemAsync(COLOR_KEY),
      ]);
      const mode: ThemeMode = savedMode === 'light' ? 'light' : 'dark';
      const colorScheme: ColorScheme = savedColor === 'dusk' ? 'dusk' : 'gold';
      set({
        mode,
        colorScheme,
        colors: resolveColors(mode, colorScheme),
      });
    } catch {
      // Fallback: dark + gold
    }
  },
}));
