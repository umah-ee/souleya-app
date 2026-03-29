/**
 * useCallKit – VoIP Push Token Registration + CallKit Event-Handler
 *
 * Nutzt:
 * - react-native-voip-push-notification: PushKit Token empfangen
 * - react-native-callkeep: CallKit UI (Annehmen/Ablehnen)
 *
 * Setup passiert nativ im AppDelegate (via withVoipPush Plugin).
 * Dieser Hook handhabt nur die JS-Seite.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { apiFetch } from '../lib/api';

// Dynamische Imports — nur im nativen Build verfuegbar
let RNCallKeep: any = null;
let VoipPushNotification: any = null;

try {
  RNCallKeep = require('react-native-callkeep').default;
} catch {
  // Nicht verfuegbar
}

try {
  VoipPushNotification = require('react-native-voip-push-notification').default;
} catch {
  // Nicht verfuegbar
}

interface CallKitCallbacks {
  onAnswered: (callUUID: string, payload: Record<string, any>) => void;
  onEnded: (callUUID: string) => void;
}

// Speichert Payload pro callUUID (fuer spaetere Zuordnung)
const callPayloads = new Map<string, Record<string, any>>();

export function useCallKit(userId: string | undefined, callbacks: CallKitCallbacks) {
  const initialized = useRef(false);
  const voipTokenSent = useRef(false);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !userId || initialized.current) return;
    if (!RNCallKeep && !VoipPushNotification) return;
    initialized.current = true;

    // ── VoIP Push Token registrieren ──
    if (VoipPushNotification) {
      // Events die vor JS-Bridge ankamen verarbeiten
      VoipPushNotification.addEventListener('didLoadWithEvents', (events: any[]) => {
        if (!events || !Array.isArray(events) || events.length === 0) return;
        for (const event of events) {
          if (event.name === 'RNVoipPushRemoteNotificationsRegisteredEvent') {
            sendTokenToServer(event.data);
          }
          if (event.name === 'RNVoipPushRemoteNotificationReceivedEvent') {
            // VoIP Push kam an bevor JS bereit war — CallKit hat bereits
            // im nativen Code den Anruf gemeldet (AppDelegate)
            console.log('[VoIP] Push empfangen (vor JS-Ready):', event.data);
          }
        }
      });

      // VoIP Token empfangen
      VoipPushNotification.addEventListener('register', (token: string) => {
        console.log('[VoIP] Token erhalten:', token.substring(0, 16) + '...');
        sendTokenToServer(token);
      });

      // VoIP Push Notification empfangen (JS-Seite)
      VoipPushNotification.addEventListener('notification', (notification: any) => {
        console.log('[VoIP] Push empfangen:', notification);
        // Payload speichern fuer spaetere Zuordnung bei answerCall
        if (notification?.uuid) {
          callPayloads.set(notification.uuid, notification);
        }
        // Completion melden
        VoipPushNotification.onVoipNotificationCompleted(notification?.uuid);
      });

      // Token-Registrierung anstossen (nativer Code macht das auch,
      // aber sicherheitshalber nochmal von JS)
      VoipPushNotification.registerVoipToken();
    }

    // ── CallKit Events ──
    if (RNCallKeep) {
      // Anruf angenommen (User hat in CallKit-UI "Annehmen" getippt)
      RNCallKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => {
        console.log('[CallKit] Anruf angenommen:', callUUID);
        const payload = callPayloads.get(callUUID) || {};
        callbacksRef.current.onAnswered(callUUID, payload);
      });

      // Anruf beendet/abgelehnt (User hat in CallKit-UI "Ablehnen" oder "Auflegen" getippt)
      RNCallKeep.addEventListener('endCall', ({ callUUID }: { callUUID: string }) => {
        console.log('[CallKit] Anruf beendet:', callUUID);
        callPayloads.delete(callUUID);
        callbacksRef.current.onEnded(callUUID);
      });

      // didDisplayIncomingCall — Anruf wird auf dem Screen angezeigt
      RNCallKeep.addEventListener('didDisplayIncomingCall', ({ callUUID, payload }: any) => {
        console.log('[CallKit] Anruf angezeigt:', callUUID);
        if (payload) {
          callPayloads.set(callUUID, payload);
        }
      });

      // didReceiveStartCallAction — fuer ausgehende Anrufe (z.B. aus Telefon-App Recents)
      RNCallKeep.addEventListener('didReceiveStartCallAction', () => {
        // Nicht relevant fuer uns — wir starten Anrufe nur aus der App
      });
    }

    return () => {
      if (VoipPushNotification) {
        VoipPushNotification.removeEventListener('didLoadWithEvents');
        VoipPushNotification.removeEventListener('register');
        VoipPushNotification.removeEventListener('notification');
      }
      if (RNCallKeep) {
        RNCallKeep.removeEventListener('answerCall');
        RNCallKeep.removeEventListener('endCall');
        RNCallKeep.removeEventListener('didDisplayIncomingCall');
        RNCallKeep.removeEventListener('didReceiveStartCallAction');
      }
    };
  }, [userId]);

  // Ausgehenden Anruf in CallKit anzeigen
  const reportOutgoingCall = useCallback((callUUID: string, callerName: string, isVideo: boolean) => {
    if (!RNCallKeep || Platform.OS !== 'ios') return;
    RNCallKeep.startCall(callUUID, callerName, callerName, 'generic', isVideo);
  }, []);

  // Anruf in CallKit beenden
  const endCallKit = useCallback((callUUID: string) => {
    if (!RNCallKeep || Platform.OS !== 'ios') return;
    RNCallKeep.endCall(callUUID);
    callPayloads.delete(callUUID);
  }, []);

  return { reportOutgoingCall, endCallKit };
}

// ── Helper ───────────────────────────────────────────────────

function sendTokenToServer(token: string) {
  apiFetch('/notifications/register-voip', {
    method: 'POST',
    body: JSON.stringify({ voip_token: token }),
  })
    .then(() => console.log('[VoIP] Token an Server gesendet'))
    .catch((err) => console.error('[VoIP] Token-Registrierung fehlgeschlagen:', err));
}
