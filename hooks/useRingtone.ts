import { useEffect, useRef } from 'react';

/**
 * Klingelton via expo-av Audio + Vibration.
 * Incoming: Sanfter Dreiklang (Klangschale), wiederholt
 * Outgoing: Kurzer Doppelton, wiederholt
 *
 * active=false → stoppt alles sofort.
 *
 * Web-Version nutzt Web Audio API (Oszillatoren).
 * App-Version nutzt expo-av mit generierten Sinus-Toenen.
 */

let Vibration: any;
try {
  Vibration = require('react-native').Vibration;
} catch {}

let Audio: any;
try {
  Audio = require('expo-av').Audio;
} catch {}

export function useRingtone(type: 'incoming' | 'outgoing', active = true) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<any>(null);

  useEffect(() => {
    if (!active) {
      cleanup();
      return;
    }

    // Audio-Modus setzen: Ton auch bei Stumm-Schalter abspielen
    if (Audio) {
      try {
        Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        }).catch(() => {});
      } catch {}
    }

    // Vibration starten (zusaetzlich zum Audio)
    const vibrationPattern = type === 'incoming'
      ? [0, 400, 200, 400, 200, 400, 2000]
      : [0, 300, 400, 300, 3000];
    try {
      Vibration?.vibrate(vibrationPattern, true);
    } catch {}

    // Audio-Klingelton generieren und abspielen
    playRingtone(type);

    // Wiederholen
    const interval = type === 'incoming' ? 3000 : 4000;
    intervalRef.current = setInterval(() => {
      if (activeRef.current) {
        playRingtone(type);
      }
    }, interval);

    return cleanup;
  }, [type, active]);

  function cleanup() {
    try { Vibration?.cancel(); } catch {}
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (soundRef.current) {
      try { soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
  }
}

/**
 * Generiert einen kurzen Sinus-Ton als WAV und spielt ihn ab.
 * Incoming: C5-E5-G5 Dreiklang (Klangschale)
 * Outgoing: A4 Doppelton
 */
async function playRingtone(type: 'incoming' | 'outgoing') {
  if (!Audio) return;

  try {
    const sampleRate = 22050;
    const duration = type === 'incoming' ? 1.2 : 0.6;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    if (type === 'incoming') {
      // Dreiklang: C5 (523), E5 (659), G5 (784) — gestaffelt
      const freqs = [523.25, 659.25, 783.99];
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let val = 0;
        for (let f = 0; f < freqs.length; f++) {
          const onset = f * 0.15;
          if (t >= onset) {
            const localT = t - onset;
            const envelope = Math.exp(-localT * 3) * 0.15; // sanftes Ausklingen
            val += Math.sin(2 * Math.PI * freqs[f] * t) * envelope;
          }
        }
        samples[i] = Math.max(-1, Math.min(1, val));
      }
    } else {
      // Doppelton: A4 (440Hz), 2x kurz
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let val = 0;
        // Erster Ton: 0-0.15s
        if (t < 0.15) {
          const env = Math.exp(-t * 8) * 0.12;
          val = Math.sin(2 * Math.PI * 440 * t) * env;
        }
        // Zweiter Ton: 0.2-0.35s
        if (t >= 0.2 && t < 0.35) {
          const localT = t - 0.2;
          const env = Math.exp(-localT * 8) * 0.12;
          val = Math.sin(2 * Math.PI * 440 * t) * env;
        }
        samples[i] = Math.max(-1, Math.min(1, val));
      }
    }

    // WAV erzeugen (16-bit PCM)
    const wavBuffer = encodeWav(samples, sampleRate);
    const base64 = arrayBufferToBase64(wavBuffer);

    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${base64}` },
      { shouldPlay: true, volume: 0.7 },
    );

    // Sound nach Abspielen freigeben
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) {
        try { sound.unloadAsync(); } catch {}
      }
    });
  } catch (err) {
    // Audio fehlgeschlagen — Vibration laeuft als Fallback weiter
    console.warn('[Ringtone] Audio-Fehler:', err);
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF Header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // React Native hat btoa nicht immer — nutze manuelles Encoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < binary.length) {
    const a = binary.charCodeAt(i++);
    const b = i < binary.length ? binary.charCodeAt(i++) : 0;
    const c = i < binary.length ? binary.charCodeAt(i++) : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i - 2 < binary.length ? chars[(triplet >> 6) & 63] : '=';
    result += i - 1 < binary.length ? chars[triplet & 63] : '=';
  }
  return result;
}
