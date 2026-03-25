import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { supabase } from '../lib/supabase';

// InCallManager fuer Lautsprecher-Steuerung (optional, nur in Dev-Build)
let InCallManager: any = null;
try {
  InCallManager = require('react-native-incall-manager').default;
} catch {
  // Nicht verfuegbar (z.B. Expo Go)
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const TIMEOUT_MS = 30_000;

export type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended';

interface UseWebRTCOptions {
  roomId: string;
  isCaller: boolean;
  video?: boolean;
  onEnded?: () => void;
}

export function useWebRTC({ roomId, isCaller, video = false, onEnded }: UseWebRTCOptions) {
  const [state, setState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(video); // Video-Calls starten mit Lautsprecher
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);
  const endedRef = useRef(false);

  // ── Cleanup ──
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // InCallManager stoppen
    if (InCallManager) {
      try { InCallManager.stop(); } catch {}
    }
  }, [localStream]);

  // ── End call ──
  const endCall = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setState('ended');

    channelRef.current?.send({
      type: 'broadcast',
      event: 'call_end',
      payload: {},
    });

    cleanup();
    onEnded?.();
  }, [cleanup, onEnded]);

  // ── Toggle Mute ──
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted((m) => !m);
    }
  }, [localStream]);

  // ── Toggle Video ──
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoOff((v) => !v);
    }
  }, [localStream]);

  // ── Toggle Speaker ──
  const toggleSpeaker = useCallback(() => {
    if (InCallManager) {
      const newState = !isSpeakerOn;
      try {
        InCallManager.setForceSpeakerphoneOn(newState);
      } catch {}
      setIsSpeakerOn(newState);
    }
  }, [isSpeakerOn]);

  // ── Start ──
  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    const start = async () => {
      try {
        setState('connecting');

        // InCallManager starten (Lautsprecher fuer Video, Hoerer fuer Audio)
        if (InCallManager) {
          try {
            InCallManager.start({ media: video ? 'video' : 'audio' });
            InCallManager.setForceSpeakerphoneOn(video);
          } catch {}
        }

        // Media
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: video ? { facingMode: 'user', width: 640, height: 480 } : false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);

        // Peer Connection
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Remote stream
        const remote = new MediaStream(undefined);
        setRemoteStream(remote);

        (pc as any).ontrack = (event: any) => {
          if (event.streams?.[0]) {
            event.streams[0].getTracks().forEach((t: any) => remote.addTrack(t));
            setRemoteStream(new MediaStream(event.streams[0]));
          } else if (event.track) {
            remote.addTrack(event.track);
            setRemoteStream(new MediaStream(remote));
          }
        };

        // Supabase signaling channel
        const channel = supabase.channel(`call:${roomId}`);
        channelRef.current = channel;

        // ICE candidates
        (pc as any).onicecandidate = (event: any) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice',
              payload: { candidate: event.candidate.toJSON() },
            });
          }
        };

        // Connection state
        (pc as any).onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            if (!mounted) return;
            setState('connected');
            // Start duration timer
            const start = Date.now();
            timerRef.current = setInterval(() => {
              setDuration(Math.floor((Date.now() - start) / 1000));
            }, 1000);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCall();
          }
        };

        // Signaling messages
        channel
          .on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
            if (!pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            // Flush pending ICE
            for (const c of pendingCandidates.current) {
              await pcRef.current.addIceCandidate(c);
            }
            pendingCandidates.current = [];
            // Answer
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: { sdp: answer },
            });
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
            if (!pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            for (const c of pendingCandidates.current) {
              await pcRef.current.addIceCandidate(c);
            }
            pendingCandidates.current = [];
          })
          .on('broadcast', { event: 'ice' }, async ({ payload }: any) => {
            const candidate = new RTCIceCandidate(payload.candidate);
            if (pcRef.current?.remoteDescription) {
              await pcRef.current.addIceCandidate(candidate);
            } else {
              pendingCandidates.current.push(candidate);
            }
          })
          .on('broadcast', { event: 'call_end' }, () => {
            if (!endedRef.current) {
              endedRef.current = true;
              setState('ended');
              cleanup();
              onEnded?.();
            }
          })
          .on('broadcast', { event: 'peer_ready' }, async () => {
            // Re-send offer if we're caller and peer just subscribed
            if (isCaller && pcRef.current?.localDescription) {
              channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { sdp: pcRef.current.localDescription },
              });
            }
          })
          .subscribe(async (status) => {
            if (status !== 'SUBSCRIBED') return;

            if (isCaller) {
              // Create and send offer
              setState('ringing');
              const offer = await pc.createOffer({});
              await pc.setLocalDescription(offer);
              channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { sdp: offer },
              });

              // Timeout
              timeoutRef.current = setTimeout(() => {
                if (mounted && !endedRef.current) endCall();
              }, TIMEOUT_MS);
            } else {
              // Signal readiness
              channel.send({
                type: 'broadcast',
                event: 'peer_ready',
                payload: {},
              });
            }
          });
      } catch (err) {
        console.warn('[useWebRTC] Fehler:', err);
        if (mounted) endCall();
      }
    };

    start();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [roomId]);

  return {
    state,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    duration,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    endCall,
  };
}
