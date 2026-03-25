/**
 * usePushNotifications – Registriert das Geraet fuer Push Notifications
 * und handhabt eingehende Benachrichtigungen.
 *
 * Nutzt expo-notifications (Expo Push Service).
 * Token wird an POST /notifications/register gesendet.
 */

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

// Dynamischer Import – expo-notifications ist nur im Dev-Build verfuegbar
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');
} catch {
  // Nicht verfuegbar (z.B. Web oder Expo Go ohne native Module)
}

// Foreground Notification Handler — muss VOR dem Hook aufgerufen werden (Module-Level)
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {}
}

export function usePushNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!Notifications || !Device || !userId) return;

    // Push Token registrieren
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        registerTokenOnServer(token).catch(console.error);
      }
    });

    // Eingehende Notification waehrend App offen
    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {
        // In-App-Benachrichtigungen laufen ueber NotificationBell (Supabase Realtime).
      },
    );

    // Tap auf Notification (App im Hintergrund oder geschlossen)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data;
        if (data?.link) {
          router.push(data.link as any);
        } else if (data?.type === 'chat_message' && data?.channel_id) {
          router.push(`/chat/${data.channel_id}` as any);
        } else if (data?.type === 'connection_request') {
          router.push('/(tabs)/circles' as any);
        } else if (data?.type === 'pulse_like' || data?.type === 'pulse_comment') {
          router.push('/(tabs)/index' as any);
        }
      },
    );

    return () => {
      if (notificationListener.current && Notifications) {
        try { Notifications.removeNotificationSubscription(notificationListener.current); } catch {}
      }
      if (responseListener.current && Notifications) {
        try { Notifications.removeNotificationSubscription(responseListener.current); } catch {}
      }
    };
  }, [userId]);

  return { expoPushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device || !Constants) return null;

  // Nur auf echtem Geraet (nicht Simulator)
  if (!Device.isDevice) {
    console.log('Push Notifications nur auf echtem Geraet verfuegbar');
    return null;
  }

  // Android: Notification Channel erstellen (ab Android 8)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Souleya',
      importance: 4, // MAX
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8A96E',
    });
  }

  // Berechtigung pruefen/anfragen
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push Notification Berechtigung nicht erteilt');
    return null;
  }

  // iOS: Badge-Zaehler zuruecksetzen
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0);
  }

  // Expo Push Token holen
  try {
    const projectId =
      Constants.default?.expoConfig?.extra?.eas?.projectId ??
      '19c7c3dc-862d-4e1d-8123-a23909ed3608';
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.error('Push Token Fehler:', e);
    return null;
  }
}

async function registerTokenOnServer(token: string) {
  const { apiFetch } = require('../lib/api');
  await apiFetch('/notifications/register', {
    method: 'POST',
    body: JSON.stringify({
      player_id: token,
      platform: Platform.OS,
    }),
  });
}
