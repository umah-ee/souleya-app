import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { useNotificationStore } from '../store/notifications';
import { ErrorBoundary } from '../components/ErrorBoundary';
import CallProvider from '../components/call/CallProvider';

function RootLayoutNav() {
  const { session, loading, setSession, setLoading } = useAuthStore();
  const themeMode = useThemeStore((s) => s.mode);
  const loadSavedTheme = useThemeStore((s) => s.loadSavedTheme);
  const initNotifications = useNotificationStore((s) => s.init);
  const cleanupNotifications = useNotificationStore((s) => s.cleanup);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    try {
      loadSavedTheme();
    } catch (err) {
      console.warn('Theme laden fehlgeschlagen:', err);
    }
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch((err) => {
        console.warn('Session-Check fehlgeschlagen:', err);
      })
      .finally(() => {
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

  // Notifications Init/Cleanup bei Session-Wechsel
  useEffect(() => {
    if (session?.user?.id) {
      console.log('[App] Notifications init fuer User:', session.user.id.substring(0, 8) + '...');
      initNotifications(session.user.id);
    } else {
      console.log('[App] Notifications cleanup (kein User)');
      cleanupNotifications();
    }
    return () => cleanupNotifications();
  }, [session?.user?.id]);

  useEffect(() => {
    // Warte bis Session-Check abgeschlossen ist
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat/[channelId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="places/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="challenges/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="studio" options={{ headerShown: false, animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const themeMode = useThemeStore((s) => s.mode);

  return (
    <ErrorBoundary>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <CallProvider>
        <RootLayoutNav />
      </CallProvider>
    </ErrorBoundary>
  );
}
