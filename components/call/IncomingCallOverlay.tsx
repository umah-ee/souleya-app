import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRingtone } from '../../hooks/useRingtone';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

const SCREEN = Dimensions.get('window');
const TIMEOUT_MS = 30_000;

interface Props {
  roomId: string;
  callerName: string;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallOverlay({
  roomId, callerName, isVideo, onAccept, onReject,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ringtone + Vibration
  useRingtone('incoming');

  // Pulse animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Auto-reject nach 30s
  useEffect(() => {
    const timer = setTimeout(onReject, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Caller hung up — lausche auf dem gleichen Call-Channel
  useEffect(() => {
    const channel = supabase
      .channel(`call:${roomId}:cancel`)
      .on('broadcast', { event: 'call_end' }, () => {
        onReject();
      })
      .on('broadcast', { event: 'call_cancelled' }, () => {
        onReject();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
      {/* Caller Info */}
      <View style={styles.callerSection}>
        <Animated.View style={[
          styles.avatarCircle,
          { borderColor: colors.gold, transform: [{ scale: pulseAnim }] },
        ]}>
          <Text style={styles.avatarInitial}>
            {callerName.charAt(0).toUpperCase()}
          </Text>
        </Animated.View>

        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callType}>
          {isVideo ? 'Videoanruf' : 'Audioanruf'}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        {/* Reject */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={onReject}
          activeOpacity={0.8}
        >
          <Icon name="x" size={28} color="#FFF" />
          <Text style={styles.btnLabel}>Ablehnen</Text>
        </TouchableOpacity>

        {/* Accept */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={onAccept}
          activeOpacity={0.8}
        >
          <Icon name={isVideo ? 'video' : 'microphone'} size={28} color="#FFF" />
          <Text style={styles.btnLabel}>Annehmen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 310,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callerSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,169,110,0.15)',
    marginBottom: 8,
  },
  avatarInitial: {
    fontSize: 44,
    fontWeight: '600',
    color: '#F0E8D8',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  callerName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F0E8D8',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
  },
  callType: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(240,232,216,0.5)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 48,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#E53E3E',
  },
  acceptBtn: {
    backgroundColor: '#38A169',
  },
  btnLabel: {
    position: 'absolute',
    bottom: -22,
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
});
