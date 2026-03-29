/**
 * usePushNotifications – Registriert das Geraet fuer Push Notifications
 * und handhabt eingehende Benachrichtigungen.
 *
 * Nutzt expo-notifications (Expo Push Service).
 * Token wird an POST /notifications/register gesendet.
 *
 * Anruf-Notifications nutzen die Kategorie "INCOMING_CALL" mit
 * Accept/Reject Buttons direkt in der Notification (iOS).
 */

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../lib/api';
import { useCall } from '../components/call/CallProvider';

const PENDING_CALL_KEY = 'souleya_pending_call';

// Dynamischer Import – expo-notifications ist nur im Dev-Build verfuegbar
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;
let AsyncStorage: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
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

  // Kategorie sofort beim App-Start registrieren (nicht erst wenn Hook mounted)
  // iOS cached Kategorien persistent – einmal registriert bleiben sie bis zum nächsten Update
  if (Platform.OS === 'ios') {
    try {
      Notifications.setNotificationCategoryAsync('INCOMING_CALL', [
        {
          identifier: 'ACCEPT',
          buttonTitle: 'Annehmen',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'REJECT',
          buttonTitle: 'Ablehnen',
          options: { opensAppToForeground: false, isDestructive: true },
        },
      ]).catch((e: unknown) => {
        console.warn('[Push] Kategorie-Registrierung fehlgeschlagen:', e);
      });
    } catch (e) {
      console.warn('[Push] Kategorie-Registrierung fehlgeschlagen:', e);
    }
  }
}

export function usePushNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const registrationAttempted = useRef(false);
  const router = useRouter();
  const { triggerIncomingCall } = useCall();

  // Ref damit der Listener immer die aktuellste Version von triggerIncomingCall hat
  const triggerIncomingCallRef = useRef(triggerIncomingCall);
  useEffect(() => {
    triggerIncomingCallRef.current = triggerIncomingCall;
  }, [triggerIncomingCall]);

  useEffect(() => {
    if (!Notifications || !Device || !userId) return;
    // Verhindere doppelte Registrierung
    if (registrationAttempted.current) return;
    registrationAttempted.current = true;

    // Letzte Notification pruefen (App war vollstaendig beendet)
    Notifications.getLastNotificationResponseAsync()
      .then((response: any) => {
        if (!response) return;
        const data = response.notification?.request?.content?.data;
        const actionId = response.actionIdentifier;

        if (data?.type === 'incoming_call' && data?.room_id) {
          // Ablehnen via Notification-Button → kein Overlay zeigen
          if (actionId === 'REJECT') {
            sendRejectSignal(data.channel_id, data.room_id);
            return;
          }

          // Annehmen oder Tap → Overlay anzeigen
          const callData = {
            roomId: data.room_id,
            channelId: data.channel_id,
            callerId: data.caller_id,
            callerName: data.caller_name ?? 'Jemand',
            callerAvatar: data.caller_avatar || null,
            isVideo: data.is_video === 'true',
          };
          setTimeout(() => {
            triggerIncomingCallRef.current(callData);
          }, 800);
        }
      })
      .catch(() => {});

    const registerTimer = setTimeout(() => {
      registerForPushNotifications().then((token) => {
        if (token) {
          setExpoPushToken(token);
          registerTokenWithRetry(token, 3);
        } else {
          console.warn('[Push] Kein Push-Token erhalten');
        }
      }).catch((err) => {
        console.error('[Push] Token-Registrierung fehlgeschlagen:', err);
      });
    }, 2000);

    // Eingehende Notification waehrend App offen
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        const data = notification?.request?.content?.data;
        console.log('[Push] Notification empfangen (foreground):', data?.type);
      },
    );

    // Tap oder Action auf Notification (App im Hintergrund oder geschlossen)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data;
        const actionId = response.actionIdentifier;

        if (data?.type === 'incoming_call' && data?.room_id) {
          // Ablehnen via Notification-Button
          if (actionId === 'REJECT') {
            sendRejectSignal(data.channel_id, data.room_id);
            return;
          }

          // Annehmen oder Tap → Overlay
          const callData = {
            roomId: data.room_id,
            channelId: data.channel_id,
            callerId: data.caller_id,
            callerName: data.caller_name ?? 'Jemand',
            callerAvatar: data.caller_avatar || null,
            isVideo: data.is_video === 'true',
          };
          triggerIncomingCallRef.current(callData);
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

/** Anruf ablehnen via Supabase Broadcast */
function sendRejectSignal(channelId: string, roomId: string) {
  // Direkt via Supabase senden (kein Auth-Token nötig für Broadcast)
  try {
    const { supabase } = require('../lib/supabase');
    const ch = supabase.channel(`call:${roomId}`);
    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'call_end', payload: {} });
        setTimeout(() => supabase.removeChannel(ch), 1000);
      }
    });
  } catch (e) {
    console.warn('[Push] Reject-Signal konnte nicht gesendet werden:', e);
  }
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device || !Constants) return null;

  if (!Device.isDevice) {
    console.log('[Push] ABBRUCH: Nur auf echtem Geraet verfuegbar');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Souleya',
      importance: 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8A96E',
    });

    // Android Anruf-Channel mit hoher Priorität
    await Notifications.setNotificationChannelAsync('incoming_call', {
      name: 'Eingehende Anrufe',
      importance: 5, // IMPORTANCE_HIGH
      vibrationPattern: [0, 500, 500, 500, 500, 500],
      lightColor: '#C8A96E',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] ABBRUCH: Berechtigung nicht erteilt');
    return null;
  }

  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0);
  }

  try {
    const projectId =
      Constants.default?.expoConfig?.extra?.eas?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId ??
      '19c7c3dc-862d-4e1d-8123-a23909ed3608';
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.error('[Push] Token-Fehler:', e);
    return null;
  }
}

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
      return;
    } catch (err: any) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
  }
}
