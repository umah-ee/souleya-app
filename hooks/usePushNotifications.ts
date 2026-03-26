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
import { apiFetch } from '../lib/api';

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
        console.log('[Push] Token erhalten:', token.substring(0, 30) + '...');
        setExpoPushToken(token);
        registerTokenOnServer(token)
          .then(() => console.log('[Push] Token auf Server registriert'))
          .catch((err) => {
            console.error('[Push] Token-Registrierung fehlgeschlagen:', err);
            // Retry nach 5s
            setTimeout(() => {
              registerTokenOnServer(token)
                .then(() => console.log('[Push] Token auf Server registriert (retry)'))
                .catch((err2) => console.error('[Push] Token-Registrierung fehlgeschlagen (retry):', err2));
            }, 5000);
          });
      } else {
        console.warn('[Push] Kein Token erhalten');
      }
    });

    // Eingehende Notification waehrend App offen
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        const data = notification?.request?.content?.data;
        console.log('[Push] Notification empfangen (foreground):', data?.type);
        // In-App-Benachrichtigungen laufen ueber NotificationBell (Supabase Realtime).
        // Fuer incoming_call: Store-Refresh ausloesen damit Badge aktualisiert wird
      },
    );

    // Tap auf Notification (App im Hintergrund oder geschlossen)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data;
        console.log('[Push] Notification Tap:', data?.type, data?.link);
        if (data?.link) {
          router.push(data.link as any);
        } else if (data?.type === 'chat_message' && data?.channel_id) {
          router.push(`/chat/${data.channel_id}` as any);
        } else if (data?.type === 'incoming_call' && data?.link) {
          router.push(data.link as any);
        } else if (data?.type === 'missed_call' && data?.link) {
          router.push(data.link as any);
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
    console.log('[Push] Nur auf echtem Geraet verfuegbar');
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
    console.log('[Push] Berechtigung nicht erteilt');
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
      Constants.expoConfig?.extra?.eas?.projectId ??
      '19c7c3dc-862d-4e1d-8123-a23909ed3608';
    console.log('[Push] ProjectId:', projectId);
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Token generiert:', tokenData.data?.substring(0, 30) + '...');
    return tokenData.data;
  } catch (e) {
    console.error('[Push] Token-Fehler:', e);
    return null;
  }
}

async function registerTokenOnServer(token: string) {
  await apiFetch('/notifications/register', {
    method: 'POST',
    body: JSON.stringify({
      player_id: token,
      platform: Platform.OS,
    }),
  });
}
