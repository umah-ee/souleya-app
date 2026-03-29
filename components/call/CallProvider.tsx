import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { fetchProfile } from '../../lib/profile';
import { useCallKit } from '../../hooks/useCallKit';
import VideoCallOverlay from './VideoCallOverlay';
import IncomingCallOverlay from './IncomingCallOverlay';

const PENDING_CALL_KEY = 'souleya_pending_call';

// ── Types ──

interface CallInfo {
  roomId: string;
  channelId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  isVideo: boolean;
}

interface CallContextValue {
  startCall: (params: {
    channelId: string;
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string | null;
    video?: boolean;
  }) => void;
  triggerIncomingCall: (params: {
    roomId: string;
    channelId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    isVideo: boolean;
  }) => void;
  isInCall: boolean;
}

const CallContext = createContext<CallContextValue>({
  startCall: () => {},
  triggerIncomingCall: () => {},
  isInCall: false,
});

export const useCall = () => useContext(CallContext);

// ── Provider ──

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const [outgoing, setOutgoing] = useState<CallInfo | null>(null);
  const [incoming, setIncoming] = useState<(CallInfo & { callerId: string }) | null>(null);
  const [activeCall, setActiveCall] = useState<(CallInfo & { isCaller: boolean }) | null>(null);
  const [myDisplayName, setMyDisplayName] = useState('Jemand');
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const endingRef = useRef(false);
  const triggerIncomingCallRef = useRef<typeof triggerIncomingCall | null>(null);

  // Eigenen Display-Name + Avatar laden
  useEffect(() => {
    if (!userId) return;
    fetchProfile()
      .then((p) => {
        setMyDisplayName(p.display_name || p.username || 'Jemand');
        setMyAvatarUrl(p.avatar_url || null);
      })
      .catch(() => {});
  }, [userId]);

  // ── CallKit (iOS) — VoIP Push → nativer Anrufscreen ──
  const callKitUUID = useRef<string | null>(null);

  const onCallKitAnswered = useCallback((callUUID: string, payload: Record<string, any>) => {
    callKitUUID.current = callUUID;
    // Payload enthält die Anrufdaten aus dem VoIP Push
    const callData = {
      roomId: payload.room_id ?? '',
      channelId: payload.channel_id ?? '',
      callerId: payload.caller_id ?? '',
      callerName: payload.caller_name ?? 'Jemand',
      callerAvatar: payload.caller_avatar || null,
      isVideo: payload.is_video === 'true',
    };
    if (callData.roomId) {
      setIncoming(null); // Falls IncomingCallOverlay offen war
      setActiveCall({
        roomId: callData.roomId,
        channelId: callData.channelId,
        partnerId: callData.callerId,
        partnerName: callData.callerName,
        partnerAvatar: callData.callerAvatar,
        isVideo: callData.isVideo,
        isCaller: false,
      });
    }
  }, []);

  const onCallKitEnded = useCallback((callUUID: string) => {
    callKitUUID.current = null;
    // Reject oder Auflegen über CallKit
    if (incoming) {
      const ch = supabase.channel(`call:${incoming.roomId}`);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.send({ type: 'broadcast', event: 'call_end', payload: {} });
          setTimeout(() => supabase.removeChannel(ch), 1000);
        }
      });
      setIncoming(null);
    } else if (activeCall) {
      apiFetch(`/chat/channels/${activeCall.channelId}/call-end`, {
        method: 'POST',
        body: JSON.stringify({ room_id: activeCall.roomId }),
      }).catch(() => {});
      setActiveCall(null);
      setOutgoing(null);
    }
  }, [incoming, activeCall]);

  const { endCallKit } = useCallKit(userId, {
    onAnswered: onCallKitAnswered,
    onEnded: onCallKitEnded,
  });

  // ── Pending Call aus Push Notification (App war beendet) ──
  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(PENDING_CALL_KEY)
      .then((stored) => {
        if (!stored) return;
        AsyncStorage.removeItem(PENDING_CALL_KEY).catch(() => {});
        const callData = JSON.parse(stored);
        setTimeout(() => {
          triggerIncomingCallRef.current?.({
            roomId: callData.roomId,
            channelId: callData.channelId,
            callerId: callData.callerId,
            callerName: callData.callerName,
            callerAvatar: callData.callerAvatar ?? null,
            isVideo: callData.isVideo ?? false,
          });
        }, 800);
      })
      .catch(() => {});
  }, [userId]);

  // ── Inbox Channel (listen for incoming calls) ──
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`call-inbox:${userId}`)
      .on('broadcast', { event: 'incoming_call' }, ({ payload }: any) => {
        if (activeCall || outgoing) return;
        setIncoming({
          roomId: payload.roomId,
          channelId: payload.channelId,
          partnerId: payload.callerId,
          partnerName: payload.callerName,
          partnerAvatar: payload.callerAvatar,
          isVideo: payload.isVideo ?? false,
          callerId: payload.callerId,
        });
      })
      .on('broadcast', { event: 'call_cancelled' }, () => {
        setIncoming(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeCall, outgoing]);

  // ── Start outgoing call ──
  const startCall = useCallback(({
    channelId, partnerId, partnerName, partnerAvatar, video = false,
  }: {
    channelId: string;
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string | null;
    video?: boolean;
  }) => {
    if (activeCall || outgoing) return;

    const roomId = `${channelId}-${Date.now()}`;
    const info: CallInfo = { roomId, channelId, partnerId, partnerName, partnerAvatar, isVideo: video };

    setOutgoing(info);
    setActiveCall({ ...info, isCaller: true });

    // Notify callee
    const callerInbox = supabase.channel(`call-inbox:${partnerId}`);
    callerInbox.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        callerInbox.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: {
            roomId,
            channelId,
            callerId: userId,
            callerName: myDisplayName,
            callerAvatar: myAvatarUrl,
            isVideo: video,
          },
        });
        setTimeout(() => supabase.removeChannel(callerInbox), 1000);
      }
    });

    // API: call started
    apiFetch(`/chat/channels/${channelId}/call`, {
      method: 'POST',
      body: JSON.stringify({ type: video ? 'video' : 'audio' }),
    }).catch(() => {});
  }, [userId, activeCall, outgoing, myDisplayName, myAvatarUrl]);

  // ── Incoming Call via Push Notification ──
  const triggerIncomingCall = useCallback(({
    roomId, channelId, callerId, callerName, callerAvatar, isVideo,
  }: {
    roomId: string;
    channelId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    isVideo: boolean;
  }) => {
    if (activeCall || outgoing) return;
    setIncoming({
      roomId,
      channelId,
      partnerId: callerId,
      partnerName: callerName,
      partnerAvatar: callerAvatar,
      isVideo,
      callerId,
    });
  }, [activeCall, outgoing]);

  // triggerIncomingCallRef aktuell halten
  useEffect(() => {
    triggerIncomingCallRef.current = triggerIncomingCall;
  }, [triggerIncomingCall]);

  // ── Accept incoming ──
  const handleAccept = useCallback(() => {
    if (!incoming) return;
    setActiveCall({
      roomId: incoming.roomId,
      channelId: incoming.channelId,
      partnerId: incoming.callerId,
      partnerName: incoming.partnerName,
      partnerAvatar: incoming.partnerAvatar,
      isVideo: incoming.isVideo,
      isCaller: false,
    });
    setIncoming(null);
  }, [incoming]);

  // ── Reject incoming ──
  const handleReject = useCallback(() => {
    if (incoming) {
      const ch = supabase.channel(`call:${incoming.roomId}`);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.send({ type: 'broadcast', event: 'call_end', payload: {} });
          setTimeout(() => supabase.removeChannel(ch), 1000);
        }
      });
    }
    // CallKit Anruf beenden (falls aktiv)
    if (Platform.OS === 'ios' && callKitUUID.current) {
      endCallKit(callKitUUID.current);
      callKitUUID.current = null;
    }
    setIncoming(null);
  }, [incoming, endCallKit]);

  // ── End active call ──
  const handleEnd = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;

    if (activeCall) {
      apiFetch(`/chat/channels/${activeCall.channelId}/call-end`, {
        method: 'POST',
        body: JSON.stringify({ room_id: activeCall.roomId }),
      }).catch(() => {});
    }

    // CallKit Anruf beenden (falls aktiv)
    if (Platform.OS === 'ios' && callKitUUID.current) {
      endCallKit(callKitUUID.current);
      callKitUUID.current = null;
    }

    setActiveCall(null);
    setOutgoing(null);
    endingRef.current = false;
  }, [activeCall, endCallKit]);

  return (
    <CallContext.Provider value={{ startCall, triggerIncomingCall, isInCall: !!activeCall }}>
      {children}

      {/* Incoming Call Overlay */}
      {incoming && !activeCall && (
        <IncomingCallOverlay
          roomId={incoming.roomId}
          callerName={incoming.partnerName}
          isVideo={incoming.isVideo}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* Active Call Overlay */}
      {activeCall && (
        <VideoCallOverlay
          roomId={activeCall.roomId}
          isCaller={activeCall.isCaller}
          video={activeCall.isVideo}
          partnerName={activeCall.partnerName}
          partnerAvatar={activeCall.partnerAvatar}
          onEnd={handleEnd}
        />
      )}
    </CallContext.Provider>
  );
}
