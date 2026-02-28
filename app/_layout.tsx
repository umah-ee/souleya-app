import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';

function RootLayoutNav() {
  const { session, setSession, setLoading } = useAuthStore();
  const themeMode = useThemeStore((s) => s.mode);
  const loadSavedTheme = useThemeStore((s) => s.loadSavedTheme);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadSavedTheme();
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat/[channelId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="places/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="challenges/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const themeMode = useThemeStore((s) => s.mode);

  return (
    <>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <RootLayoutNav />
    </>
  );
}
