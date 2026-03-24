import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Einfacher Klingelton via expo-av (oder stumm wenn nicht verfuegbar).
 * Zwei Muster: incoming (sanfte Dreiklang-Wiederholung) und outgoing (Doppelton).
 * In React Native nutzen wir Vibration als Fallback.
 */

let Vibration: any;
try {
  Vibration = require('react-native').Vibration;
} catch {}

export function useRingtone(type: 'incoming' | 'outgoing') {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Vibration-Pattern als Klingelton-Ersatz
    const pattern = type === 'incoming'
      ? [0, 400, 200, 400, 200, 400, 2000] // Ring-Ring-Ring ... Pause
      : [0, 300, 400, 300, 3000];            // Tut ... Tut ... Pause

    const startVibration = () => {
      try {
        Vibration?.vibrate(pattern, true);
      } catch {}
    };

    startVibration();

    return () => {
      try {
        Vibration?.cancel();
      } catch {}
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [type]);
}
