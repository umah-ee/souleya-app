import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { registerPushToken } from '../lib/notifications';

function RootLayoutNav() {
  const { session, setSession, setLoading } = useAuthStore();
  const themeMode = useThemeStore((s) => s.mode);
  const loadSavedTheme = useThemeStore((s) => s.loadSavedTheme);
  const router = useRouter();
  const segments = useSegments();
  const pushRegistered = useRef(false);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  // OneSignal Push Notifications initialisieren
  useEffect(() => {
    async function initPush() {
      try {
        const OneSignal = (await import('react-native-onesignal')).default;
        const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId) return;

        OneSignal.initialize(appId);
        OneSignal.Notifications.requestPermission(true);

        // Deep-Link Handler fuer Push Notifications
        OneSignal.Notifications.addEventListener('click', (event: any) => {
          const data = event.notification.additionalData as Record<string, string> | undefined;
          if (data?.route) {
            router.push(data.route as never);
          }
        });
      } catch {
        // OneSignal nicht installiert (Expo Go) – uebersprungen
      }
    }
    initPush();
  }, []);

  // Player-ID an API senden nach Auth
  useEffect(() => {
    if (!session || pushRegistered.current) return;
    async function registerPush() {
      try {
        const OneSignal = (await import('react-native-onesignal')).default;
        const id = await OneSignal.User.pushSubscription.getIdAsync();
        if (id) {
          await registerPushToken(id);
          pushRegistered.current = true;
        }
      } catch {
        // OneSignal nicht verfuegbar
      }
    }
    registerPush();
  }, [session]);

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
      <Stack.Screen name="studio" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
