import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { lightTheme, darkTheme, type ThemeColors } from '../lib/theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  loadSavedTheme: () => Promise<void>;
}

const STORAGE_KEY = 'souleya_theme';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  colors: darkTheme,

  toggleTheme: () =>
    set((state) => {
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      SecureStore.setItemAsync(STORAGE_KEY, newMode).catch(() => {});
      return {
        mode: newMode,
        colors: newMode === 'dark' ? darkTheme : lightTheme,
      };
    }),

  setTheme: (mode: ThemeMode) => {
    SecureStore.setItemAsync(STORAGE_KEY, mode).catch(() => {});
    set({
      mode,
      colors: mode === 'dark' ? darkTheme : lightTheme,
    });
  },

  loadSavedTheme: async () => {
    try {
      const saved = await SecureStore.getItemAsync(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        set({
          mode: saved,
          colors: saved === 'dark' ? darkTheme : lightTheme,
        });
      }
    } catch {
      // Fallback: dark
    }
  },
}));
