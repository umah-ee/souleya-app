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
import { useCall } from '../components/call/CallProvider';

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
  const registrationAttempted = useRef(false);
  const router = useRouter();
  const { triggerIncomingCall } = useCall();

  useEffect(() => {
    if (!Notifications || !Device || !userId) return;
    // Verhindere doppelte Registrierung
    if (registrationAttempted.current) return;
    registrationAttempted.current = true;

    // Push Token registrieren (mit Verzoegerung fuer Auth-Stabilisierung)
    console.log('[Push] === PUSH NOTIFICATION SETUP START ===');
    console.log('[Push] userId:', userId);
    console.log('[Push] Platform:', Platform.OS);
    console.log('[Push] Notifications module:', !!Notifications);
    console.log('[Push] Device module:', !!Device);
    console.log('[Push] Constants module:', !!Constants);

    const registerTimer = setTimeout(() => {
      console.log('[Push] Starte Token-Registrierung nach 2s Delay...');
      registerForPushNotifications().then((token) => {
        if (token) {
          console.log('[Push] Token erhalten:', token);
          setExpoPushToken(token);

          // Token auf Server registrieren mit Retry-Logik
          registerTokenWithRetry(token, 3);
        } else {
          console.warn('[Push] KEIN TOKEN ERHALTEN - Push wird nicht funktionieren');
        }
      }).catch((err) => {
        console.error('[Push] FATALER FEHLER bei Token-Registrierung:', err);
      });
    }, 2000); // 2s warten bis Auth-Session stabil

    // Eingehende Notification waehrend App offen
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        const data = notification?.request?.content?.data;
        console.log('[Push] Notification empfangen (foreground):', data?.type);
      },
    );

    // Tap auf Notification (App im Hintergrund oder geschlossen)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data;
        console.log('[Push] Notification Tap:', data?.type, data?.link);

        if (data?.type === 'incoming_call' && data?.room_id) {
          // Anruf-Overlay direkt anzeigen — kein Supabase-Broadcast noetig
          triggerIncomingCall({
            roomId: data.room_id,
            channelId: data.channel_id,
            callerId: data.caller_id,
            callerName: data.caller_name ?? 'Jemand',
            callerAvatar: data.caller_avatar || null,
            isVideo: data.is_video === 'true',
          });
        } else if (data?.type === 'chat_message' && data?.channel_id) {
          router.push(`/chat/${data.channel_id}` as any);
        } else if (data?.type === 'missed_call' && data?.link) {
          router.push(data.link as any);
        } else if (data?.type === 'connection_request') {
          router.push('/(tabs)/circles' as any);
        } else if (data?.type === 'pulse_like' || data?.type === 'pulse_comment') {
          router.push('/(tabs)/index' as any);
        } else if (data?.link) {
          router.push(data.link as any);
        }
      },
    );

    return () => {
      clearTimeout(registerTimer);
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

  console.log('[Push] isDevice:', Device.isDevice);
  console.log('[Push] brand:', Device.brand);
  console.log('[Push] modelName:', Device.modelName);

  // Nur auf echtem Geraet (nicht Simulator)
  if (!Device.isDevice) {
    console.log('[Push] ABBRUCH: Nur auf echtem Geraet verfuegbar');
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

  console.log('[Push] Permission Status: existing=', existingStatus, 'final=', finalStatus);
  if (finalStatus !== 'granted') {
    console.log('[Push] ABBRUCH: Berechtigung nicht erteilt (status:', finalStatus, ')');
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

/** Token auf Server registrieren mit automatischem Retry */
async function registerTokenWithRetry(token: string, maxRetries: number) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await apiFetch('/notifications/register', {
        method: 'POST',
        body: JSON.stringify({
          player_id: token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        }),
      });
      console.log(`[Push] Token auf Server registriert (Versuch ${attempt})`);
      return; // Erfolg
    } catch (err: any) {
      console.warn(`[Push] Token-Registrierung fehlgeschlagen (Versuch ${attempt}/${maxRetries}):`, err?.message ?? err);
      if (attempt < maxRetries) {
        // Exponentielles Backoff: 3s, 6s, 12s
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
  }
  console.error('[Push] Token-Registrierung endgueltig fehlgeschlagen nach', maxRetries, 'Versuchen');
}
