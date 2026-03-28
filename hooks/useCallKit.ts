/**
 * useCallKit – iOS CallKit + PushKit Integration
 *
 * Zeigt den nativen iOS Anruf-Screen (wie bei einem normalen Telefonanruf),
 * auch wenn die App im Hintergrund oder gesperrt ist.
 *
 * Ablauf:
 * 1. PushKit registriert VoIP-Token → API speichert ihn
 * 2. Bei eingehendem Anruf: API sendet VoIP-Push → iOS weckt App
 * 3. App ruft CallKit auf → nativer Anruf-Screen erscheint
 * 4. User nimmt an → CallKit-Callback → WebRTC startet
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { apiFetch } from '../lib/api';

// Dynamischer Import – nur im nativen Build verfügbar
let RNCallKeep: any = null;
try {
  RNCallKeep = require('react-native-callkeep').default;
} catch {
  // Nicht verfügbar in Expo Go
}

const CALLKEEP_OPTIONS = {
  ios: {
    appName: 'Souleya',
    supportsVideo: true,
    maximumCallGroups: '1',
    maximumCallsPerCallGroup: '1',
    includesCallsInRecents: false,
  },
};

export interface CallKeepIncomingCall {
  uuid: string;
  roomId: string;
  channelId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  isVideo: boolean;
}

interface UseCallKitParams {
  userId: string | undefined;
  onIncomingCall: (call: CallKeepIncomingCall) => void;
  onCallAnswered: (uuid: string) => void;
  onCallEnded: (uuid: string) => void;
}

export function useCallKit({
  userId,
  onIncomingCall,
  onCallAnswered,
  onCallEnded,
}: UseCallKitParams) {
  const setupDone = useRef(false);
  const activeUuid = useRef<string | null>(null);

  useEffect(() => {
    if (!RNCallKeep || Platform.OS !== 'ios' || !userId) return;
    if (setupDone.current) return;
    setupDone.current = true;

    // ── CallKit initialisieren ──────────────────────────────
    try {
      RNCallKeep.setup(CALLKEEP_OPTIONS);
      RNCallKeep.setAvailable(true);
    } catch (err) {
      console.warn('[CallKit] Setup fehlgeschlagen:', err);
      return;
    }

    // ── VoIP Token (PushKit) registrieren ───────────────────
    RNCallKeep.addEventListener('didLoadWithEvents', (events: any[]) => {
      // Gespeicherte Events wenn App aus getötetem Zustand gestartet wurde
      if (!events?.length) return;
      for (const event of events) {
        if (event.name === 'RNCallKeepPerformAnswerCallAction') {
          onCallAnswered(event.data?.callUUID);
        }
        if (event.name === 'RNCallKeepPerformEndCallAction') {
          onCallEnded(event.data?.callUUID);
        }
      }
    });

    // VoIP Push Token empfangen und an API senden
    RNCallKeep.addEventListener('voipTokenReceived', ({ token }: { token: string }) => {
      if (!token) return;
      console.log('[CallKit] VoIP Token erhalten:', token.substring(0, 20) + '...');
      apiFetch('/notifications/register-voip', {
        method: 'POST',
        body: JSON.stringify({ voip_token: token }),
      }).catch((err) => {
        console.warn('[CallKit] VoIP Token Registrierung fehlgeschlagen:', err);
      });
    });

    // ── CallKit Events ──────────────────────────────────────

    // User nimmt Anruf an (aus nativem Screen)
    RNCallKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => {
      console.log('[CallKit] Anruf angenommen:', callUUID);
      activeUuid.current = callUUID;
      onCallAnswered(callUUID);
      RNCallKeep.setMutedCall(callUUID, false);
    });

    // User legt auf / lehnt ab (aus nativem Screen)
    RNCallKeep.addEventListener('endCall', ({ callUUID }: { callUUID: string }) => {
      console.log('[CallKit] Anruf beendet:', callUUID);
      onCallEnded(callUUID);
      activeUuid.current = null;
    });

    // Nativem Screen wurde angezeigt
    RNCallKeep.addEventListener('didDisplayIncomingCall', ({ callUUID, error }: any) => {
      if (error) {
        console.warn('[CallKit] Anzeige fehlgeschlagen:', error);
      } else {
        console.log('[CallKit] Anruf-Screen angezeigt:', callUUID);
      }
    });

    // VoIP Push empfangen (App war im Hintergrund – natives Event)
    RNCallKeep.addEventListener('showIncomingCallUi', (data: any) => {
      console.log('[CallKit] VoIP Push erhalten (showIncomingCallUi):', data);
      // Hier kommen die Daten aus dem VoIP-Push-Payload
      if (data?.payload) {
        const payload = typeof data.payload === 'string'
          ? JSON.parse(data.payload)
          : data.payload;
        if (payload?.room_id) {
          onIncomingCall({
            uuid: data.callUUID ?? data.uuid,
            roomId: payload.room_id,
            channelId: payload.channel_id,
            callerId: payload.caller_id,
            callerName: payload.caller_name ?? 'Jemand',
            callerAvatar: payload.caller_avatar || null,
            isVideo: payload.is_video === 'true',
          });
        }
      }
    });

    // Registrierung für VoIP Token auslösen
    RNCallKeep.registerVoipToken?.();

    return () => {
      RNCallKeep.removeEventListener('didLoadWithEvents');
      RNCallKeep.removeEventListener('voipTokenReceived');
      RNCallKeep.removeEventListener('answerCall');
      RNCallKeep.removeEventListener('endCall');
      RNCallKeep.removeEventListener('didDisplayIncomingCall');
      RNCallKeep.removeEventListener('showIncomingCallUi');
    };
  }, [userId]);

  // ── Öffentliche Methoden ────────────────────────────────────

  const displayIncomingCall = (
    uuid: string,
    callerName: string,
    isVideo: boolean,
  ) => {
    if (!RNCallKeep || Platform.OS !== 'ios') return;
    activeUuid.current = uuid;
    RNCallKeep.displayIncomingCall(
      uuid,
      callerName,
      callerName,
      'generic',
      isVideo,
    );
  };

  const answerCall = (uuid: string) => {
    if (!RNCallKeep || Platform.OS !== 'ios') return;
    RNCallKeep.answerIncomingCall(uuid);
  };

  const endCall = (uuid: string) => {
    if (!RNCallKeep || Platform.OS !== 'ios') return;
    RNCallKeep.endCall(uuid);
    activeUuid.current = null;
  };

  const endAllCalls = () => {
    if (!RNCallKeep || Platform.OS !== 'ios') return;
    RNCallKeep.endAllCalls();
    activeUuid.current = null;
  };

  return { displayIncomingCall, answerCall, endCall, endAllCalls, activeUuid };
}
