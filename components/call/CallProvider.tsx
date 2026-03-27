import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { fetchProfile } from '../../lib/profile';
import VideoCallOverlay from './VideoCallOverlay';
import IncomingCallOverlay from './IncomingCallOverlay';

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
  const [incoming, setIncoming] = useState<(CallInfo & { callerId: string })| null>(null);
  const [activeCall, setActiveCall] = useState<(CallInfo & { isCaller: boolean }) | null>(null);
  const [myDisplayName, setMyDisplayName] = useState('Jemand');
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const endingRef = useRef(false);

  // Eigenen Display-Name + Avatar laden fuer Anruf-Anzeige beim Gegenueber
  useEffect(() => {
    if (!userId) return;
    fetchProfile()
      .then((p) => {
        setMyDisplayName(p.display_name || p.username || 'Jemand');
        setMyAvatarUrl(p.avatar_url || null);
      })
      .catch(() => {});
  }, [userId]);

  // ── Inbox Channel (listen for incoming calls) ──
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`call-inbox:${userId}`)
      .on('broadcast', { event: 'incoming_call' }, ({ payload }: any) => {
        // Ignoriere wenn bereits in einem Call
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
        // Cleanup after sending
        setTimeout(() => supabase.removeChannel(callerInbox), 1000);
      }
    });

    // API: call started
    apiFetch(`/chat/channels/${channelId}/call`, {
      method: 'POST',
      body: JSON.stringify({ type: video ? 'video' : 'audio' }),
    }).catch(() => {});
  }, [userId, activeCall, outgoing]);

  // ── Incoming Call via Push Notification (App war im Hintergrund) ──
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
    // Ignoriere wenn bereits in einem Call
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
      // Notify caller
      const ch = supabase.channel(`call:${incoming.roomId}`);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.send({ type: 'broadcast', event: 'call_end', payload: {} });
          setTimeout(() => supabase.removeChannel(ch), 1000);
        }
      });
    }
    setIncoming(null);
  }, [incoming]);

  // ── End active call ──
  const handleEnd = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;

    if (activeCall) {
      // API: call ended
      apiFetch(`/chat/channels/${activeCall.channelId}/call-end`, {
        method: 'POST',
        body: JSON.stringify({ room_id: activeCall.roomId }),
      }).catch(() => {});
    }

    setActiveCall(null);
    setOutgoing(null);
    endingRef.current = false;
  }, [activeCall]);

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
