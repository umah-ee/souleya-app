import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  lightTheme,
  darkTheme,
  type ThemeColors,
} from '../lib/theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  loadSavedTheme: () => Promise<void>;
}

const THEME_KEY = 'souleya_theme';

function resolveColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  colors: darkTheme,

  toggleTheme: () =>
    set((state) => {
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      SecureStore.setItemAsync(THEME_KEY, newMode).catch(() => {});
      return {
        mode: newMode,
        colors: resolveColors(newMode),
      };
    }),

  setTheme: (mode: ThemeMode) => {
    SecureStore.setItemAsync(THEME_KEY, mode).catch(() => {});
    set({
      mode,
      colors: resolveColors(mode),
    });
  },

  loadSavedTheme: async () => {
    try {
      const savedMode = await SecureStore.getItemAsync(THEME_KEY);
      const mode: ThemeMode = savedMode === 'light' ? 'light' : 'dark';
      set({
        mode,
        colors: resolveColors(mode),
      });
    } catch {
      // Fallback: dark
    }
  },
}));
