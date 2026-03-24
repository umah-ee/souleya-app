import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

interface Props {
  uri: string;
  durationMs?: number;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

export default function VoicePlayer({ uri, durationMs }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationMs ?? 0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const togglePlay = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      // Erstmalig laden
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis);
          setTotalDuration(status.durationMillis ?? durationMs ?? 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            soundRef.current?.setPositionAsync(0);
          }
        },
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.warn('[VoicePlayer]', err);
    }
  };

  const progress = totalDuration > 0 ? (position / totalDuration) * 100 : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlay} style={[styles.playBtn, { backgroundColor: `${colors.gold}20` }]}>
        <Icon name={isPlaying ? 'x' : 'microphone'} size={16} color={colors.gold} />
      </TouchableOpacity>

      <View style={styles.waveform}>
        <View style={[styles.progressTrack, { backgroundColor: `${colors.gold}20` }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.gold }]} />
        </View>
      </View>

      <Text style={[styles.time, { color: colors.textMuted }]}>
        {formatTime(isPlaying ? position : totalDuration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 180,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    flex: 1,
    height: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 32,
  },
});
