import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';

interface VoiceRecorderResult {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // Returns public URL or null
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecorder(userId: string): VoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);

      const start = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 500);
    } catch (err) {
      console.warn('[VoiceRecorder] Start fehlgeschlagen:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) return null;

      // Upload to Supabase Storage
      const ext = 'm4a';
      const path = `${userId}/${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('chat-voice')
        .upload(path, blob, { contentType: 'audio/m4a', upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-voice')
        .getPublicUrl(path);

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      return publicUrl;
    } catch (err) {
      console.warn('[VoiceRecorder] Stop fehlgeschlagen:', err);
      return null;
    }
  }, [userId]);

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  }, []);

  return { isRecording, duration, startRecording, stopRecording, cancelRecording };
}
