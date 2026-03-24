import { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useRingtone } from '../../hooks/useRingtone';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

const SCREEN = Dimensions.get('window');

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

interface Props {
  roomId: string;
  isCaller: boolean;
  video: boolean;
  partnerName: string;
  partnerAvatar?: string | null;
  onEnd: () => void;
}

export default function VideoCallOverlay({
  roomId, isCaller, video, partnerName, onEnd,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  const {
    state, localStream, remoteStream, isMuted, isVideoOff, duration,
    toggleMute, toggleVideo, endCall,
  } = useWebRTC({
    roomId,
    isCaller,
    video,
    onEnded: onEnd,
  });

  // Outgoing ringtone during ringing
  const isRinging = state === 'ringing' || state === 'connecting';
  useRingtone(isRinging ? 'outgoing' : 'outgoing'); // Hook always called

  const handleEnd = () => {
    endCall();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Remote Video (fullscreen) */}
      {remoteStream && video && state === 'connected' ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={[styles.remoteVideo, { backgroundColor: '#1a1a1a' }]}>
          {/* Placeholder: EnsoRing + Name */}
          <View style={styles.placeholderCenter}>
            <View style={[
              styles.avatarCircle,
              { borderColor: colors.gold },
              isRinging && styles.pulsing,
            ]}>
              <Text style={styles.avatarInitial}>
                {partnerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.partnerName}>{partnerName}</Text>
            <Text style={styles.stateText}>
              {state === 'connecting' ? 'Verbinde …' :
               state === 'ringing' ? 'Klingelt …' :
               state === 'connected' ? formatDuration(duration) :
               'Beendet'}
            </Text>
          </View>
        </View>
      )}

      {/* Local Video (PiP) */}
      {localStream && video && !isVideoOff && (
        <View style={[styles.localPip, { top: insets.top + 12 }]}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror
          />
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <Text style={styles.headerName} numberOfLines={1}>{partnerName}</Text>
        {state === 'connected' && (
          <Text style={styles.headerDuration}>{formatDuration(duration)}</Text>
        )}
      </View>

      {/* Controls */}
      <View style={[styles.controls, { bottom: insets.bottom + 32 }]}>
        {/* Mute */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
          onPress={toggleMute}
          activeOpacity={0.7}
        >
          <Icon name={isMuted ? 'microphone' : 'microphone'} size={22} color="#FFF" />
          {isMuted && <View style={styles.strikethrough} />}
        </TouchableOpacity>

        {/* Video Toggle */}
        {video && (
          <TouchableOpacity
            style={[styles.controlBtn, isVideoOff && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
            onPress={toggleVideo}
            activeOpacity={0.7}
          >
            <Icon name="video" size={22} color="#FFF" />
            {isVideoOff && <View style={styles.strikethrough} />}
          </TouchableOpacity>
        )}

        {/* End Call */}
        <TouchableOpacity
          style={[styles.controlBtn, styles.endBtn]}
          onPress={handleEnd}
          activeOpacity={0.7}
        >
          <Icon name="x" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  placeholderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,169,110,0.15)',
  },
  pulsing: {
    shadowColor: '#C8A96E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '600',
    color: '#F0E8D8',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  partnerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F0E8D8',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
  },
  stateText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(240,232,216,0.6)',
  },
  localPip: {
    position: 'absolute',
    right: 12,
    width: 100,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  localVideo: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 120,
    alignItems: 'flex-start',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  headerDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  endBtn: {
    backgroundColor: '#E53E3E',
  },
  strikethrough: {
    position: 'absolute',
    width: 28,
    height: 2,
    backgroundColor: '#FFF',
    transform: [{ rotate: '45deg' }],
  },
});
