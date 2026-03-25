import { useEffect, useRef } from 'react';

/**
 * Klingelton via Vibration.
 * Incoming: Ring-Ring-Ring ... Pause (Wiederholung)
 * Outgoing: Tut ... Tut ... Pause (Wiederholung)
 *
 * active=false → stoppt die Vibration sofort.
 */

let Vibration: any;
try {
  Vibration = require('react-native').Vibration;
} catch {}

export function useRingtone(type: 'incoming' | 'outgoing', active = true) {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active) {
      try { Vibration?.cancel(); } catch {}
      return;
    }

    const pattern = type === 'incoming'
      ? [0, 400, 200, 400, 200, 400, 2000] // Ring-Ring-Ring ... Pause
      : [0, 300, 400, 300, 3000];            // Tut ... Tut ... Pause

    try {
      Vibration?.vibrate(pattern, true);
    } catch {}

    return () => {
      try { Vibration?.cancel(); } catch {}
    };
  }, [type, active]);
}
