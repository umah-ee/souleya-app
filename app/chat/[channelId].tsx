import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, Modal, Pressable, ScrollView, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { useChatStore } from '../../store/chat';
import { useThemeStore } from '../../store/theme';
import type { ChannelDetail, Message, ReactionSummary } from '../../types/chat';
import {
  fetchChannel, fetchMessages, sendMessage, markChannelAsRead,
  deleteMessage as apiDeleteMessage, editMessage as apiEditMessage,
  addReaction, removeReaction, uploadChatImage, fetchReadStatus,
  pinMessage, unpinMessage, searchMessages, muteChannel, unmuteChannel,
  forwardMessage, fetchChannels,
} from '../../lib/chat';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/Icon';
import { useCall } from '../../components/call/CallProvider';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import PollBubble from '../../components/chat/PollBubble';
import VoicePlayer from '../../components/chat/VoicePlayer';
import MarkdownText from '../../components/chat/MarkdownText';
import CreatePollModal from '../../components/chat/CreatePollModal';
import SeedsTransferModal from '../../components/chat/SeedsTransferModal';
import GroupInfoSheet from '../../components/chat/GroupInfoSheet';
import ImageGrid from '../../components/shared/ImageGrid';
import ChallengeCard from '../../components/challenges/ChallengeCard';
import CreateChallengeModal from '../../components/challenges/CreateChallengeModal';
import LinkPreviewCard from '../../components/chat/LinkPreviewCard';
import LocationShareCard from '../../components/chat/LocationShareCard';
import { fetchChallenge } from '../../lib/challenges';
import { sendLocation } from '../../lib/chat';
import * as Location from 'expo-location';
import type { Challenge } from '../../types/challenges';

// Haeufig verwendete Emojis fuer den Reaktions-Picker
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🙏', '✨', '🔥', '🕊️', '🌿', '💛'];

type ReactionsMap = Record<string, ReactionSummary[]>;

export default function ChatRoomScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setTotalUnread = useChatStore((s) => s.setTotalUnread);
  const colors = useThemeStore((s) => s.colors);
  const userId = session?.user?.id;
  const { startCall } = useCall();
  const voiceRecorder = useVoiceRecorder(userId ?? '');
  const insets = useSafeAreaInsets();

  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Action Sheet, Edit, Reactions
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [emojiPickerMsg, setEmojiPickerMsg] = useState<Message | null>(null);
  const [reactions, setReactions] = useState<ReactionsMap>({});

  // Neue Features: Polls, Seeds, Images, GroupInfo, Location
  const [showPollForm, setShowPollForm] = useState(false);
  const [showSeedsModal, setShowSeedsModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [pollRefreshTrigger, setPollRefreshTrigger] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, string>>({}); // userId → last_read_at
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // ── Daten laden ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!channelId) return;
    try {
      const [ch, msgs] = await Promise.all([
        fetchChannel(channelId),
        fetchMessages(channelId, 1, 50),
      ]);
      setChannel(ch);
      setMessages(msgs.data);
      setHasMore(msgs.hasMore);
      setPage(1);
      await markChannelAsRead(channelId);
      setTotalUnread(0);
      loadReactionsForMessages(msgs.data.map((m) => m.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Reactions batch laden (via Supabase direkt) ──────────
  const loadReactionsForMessages = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    try {
      const { data } = await supabase
        .from('reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds);

      if (!data) return;

      const map: ReactionsMap = {};
      for (const row of data) {
        if (!map[row.message_id]) map[row.message_id] = [];
        const existing = map[row.message_id].find((r) => r.emoji === row.emoji);
        if (existing) {
          existing.count += 1;
          if (row.user_id === userId) existing.has_reacted = true;
        } else {
          map[row.message_id].push({
            emoji: row.emoji,
            count: 1,
            has_reacted: row.user_id === userId,
          });
        }
      }
      setReactions((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.error('Reactions laden fehlgeschlagen:', e);
    }
  }, [userId]);

  // ── Realtime Subscription ─────────────────────────────────
  useEffect(() => {
    if (!channelId) return;

    const sub = supabase
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          markChannelAsRead(channelId).catch(() => {});
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reactions' },
        (payload) => {
          const row = payload.new as { message_id: string; emoji: string; user_id: string };
          setReactions((prev) => {
            const msgReactions = [...(prev[row.message_id] ?? [])];
            const existing = msgReactions.find((r) => r.emoji === row.emoji);
            if (existing) {
              return {
                ...prev,
                [row.message_id]: msgReactions.map((r) =>
                  r.emoji === row.emoji
                    ? { ...r, count: r.count + 1, has_reacted: r.has_reacted || row.user_id === userId }
                    : r,
                ),
              };
            }
            return {
              ...prev,
              [row.message_id]: [...msgReactions, { emoji: row.emoji, count: 1, has_reacted: row.user_id === userId }],
            };
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reactions' },
        (payload) => {
          const row = payload.old as { message_id: string; emoji: string; user_id: string };
          setReactions((prev) => {
            const msgReactions = prev[row.message_id];
            if (!msgReactions) return prev;
            const updated = msgReactions
              .map((r) =>
                r.emoji === row.emoji
                  ? { ...r, count: r.count - 1, has_reacted: row.user_id === userId ? false : r.has_reacted }
                  : r,
              )
              .filter((r) => r.count > 0);
            return { ...prev, [row.message_id]: updated };
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poll_votes' },
        () => {
          // Trigger PollBubble re-fetch
          setPollRefreshTrigger((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [channelId, userId]);

  // ── Typing Indicator (Supabase Presence) ────────────────────
  useEffect(() => {
    if (!channelId || !userId) return;

    const presenceCh = supabase.channel(`presence:${channelId}`, {
      config: { presence: { key: userId } },
    });
    presenceChannelRef.current = presenceCh;

    presenceCh
      .on('presence', { event: 'sync' }, () => {
        const state = presenceCh.presenceState();
        const typing: string[] = [];
        for (const [uid, presences] of Object.entries(state)) {
          if (uid === userId) continue;
          const p = presences as any[];
          if (p.some((pr) => pr.typing)) typing.push(uid);
        }
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceCh.track({ typing: false });
        }
      });

    return () => {
      supabase.removeChannel(presenceCh);
      presenceChannelRef.current = null;
    };
  }, [channelId, userId]);

  // ── Read Status laden ──────────────────────────────────────
  useEffect(() => {
    if (!channelId) return;
    fetchReadStatus(channelId).then(setReadStatus).catch(() => {});
  }, [channelId, messages.length]);

  // ── Typing senden bei Texteingabe ──────────────────────────
  const sendTyping = useCallback(() => {
    const ch = presenceChannelRef.current;
    if (!ch) return;
    ch.track({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      ch.track({ typing: false });
    }, 3000);
  }, []);

  // ── Aeltere Nachrichten laden ─────────────────────────────
  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || !channelId) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchMessages(channelId, nextPage, 50);
      setMessages((prev) => [...result.data, ...prev]);
      setHasMore(result.hasMore);
      setPage(nextPage);
      loadReactionsForMessages(result.data.map((m) => m.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Nachricht senden ──────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending || !channelId) return;

    setSending(true);
    try {
      const msg = await sendMessage(channelId, {
        type: 'text',
        content,
        reply_to: replyTo?.id,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setText('');
      setReplyTo(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  // ── Nachricht bearbeiten ──────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingMsg || !text.trim() || sending) return;
    setSending(true);
    try {
      const updated = await apiEditMessage(editingMsg.id, text.trim());
      setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
      setText('');
      setEditingMsg(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const startEditing = (msg: Message) => {
    setActionMsg(null);
    setEditingMsg(msg);
    setText(msg.content ?? '');
  };

  const cancelEditing = () => {
    setEditingMsg(null);
    setText('');
  };

  // ── Nachricht loeschen ─────────────────────────────────────
  const handleDelete = async (msgId: string) => {
    setActionMsg(null);
    try {
      await apiDeleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Reactions ─────────────────────────────────────────────
  const handleReaction = (msg: Message) => {
    setActionMsg(null);
    setEmojiPickerMsg(msg);
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (!emojiPickerMsg) return;
    const msgId = emojiPickerMsg.id;
    setEmojiPickerMsg(null);

    const existing = reactions[msgId]?.find((r) => r.emoji === emoji);
    try {
      if (existing?.has_reacted) {
        await removeReaction(msgId, emoji);
      } else {
        await addReaction(msgId, emoji);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmojiSelectDirect = async (msgId: string, emoji: string, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        await removeReaction(msgId, emoji);
      } else {
        await addReaction(msgId, emoji);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ── Bilder auswaehlen ──────────────────────────────────────
  const handlePickImage = async () => {
    const remaining = 10 - pendingImages.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setPendingImages((prev) => [...prev, ...newUris].slice(0, 10));
    }
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendImages = async () => {
    if (pendingImages.length === 0 || !userId || !channelId || uploadingImage) return;
    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < pendingImages.length; i++) {
        setUploadProgress(`${i + 1}/${pendingImages.length}`);
        const publicUrl = await uploadChatImage(pendingImages[i], userId);
        uploadedUrls.push(publicUrl);
      }
      setUploadProgress('');

      if (uploadedUrls.length === 1) {
        // Einzelbild: bestehendes Format beibehalten
        const msg = await sendMessage(channelId, { type: 'image', content: uploadedUrls[0] });
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else {
        // Mehrere Bilder: als image_urls in metadata
        const msg = await sendMessage(channelId, {
          type: 'image',
          content: uploadedUrls[0],
          metadata: { image_urls: uploadedUrls },
        });
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      setPendingImages([]);
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingImage(false);
      setUploadProgress('');
    }
  };

  const handleCancelImages = () => {
    setPendingImages([]);
  };

  // ── Poll erstellt ─────────────────────────────────────────
  const handlePollCreated = (msg: Message) => {
    setShowPollForm(false);
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  // ── Standort senden ──────────────────────────────────────
  const handleSendLocation = async (isLive = false) => {
    if (!channelId || sendingLocation) return;
    setSendingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setSendingLocation(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }).catch(() => [null as any]);
      const title = place ? [place.street, place.city].filter(Boolean).join(', ') : 'Mein Standort';
      const subtitle = place ? [place.city, place.country].filter(Boolean).join(', ') : undefined;
      await sendLocation(channelId, {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        title,
        subtitle,
        is_live: isLive,
        expires_at: isLive ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined,
      });
    } catch (e) {
      console.error('Standort senden fehlgeschlagen:', e);
    } finally {
      setSendingLocation(false);
      setShowLocationModal(false);
    }
  };

  // ── Seeds gesendet ────────────────────────────────────────
  const handleSeedsSent = () => {
    setShowSeedsModal(false);
    // Die Nachricht kommt per Realtime
  };

  // ── Pin / Forward / Search / Mute ──────────────────────────
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Mute-Status pruefen
  useEffect(() => {
    if (!channel) return;
    const myMembership = channel.members.find((m) => m.user_id === userId);
    setIsMuted(!!myMembership?.muted_until);
  }, [channel, userId]);

  const handlePin = async (msg: Message) => {
    setActionMsg(null);
    try {
      if (msg.pinned_at) {
        await unpinMessage(msg.id);
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, pinned_at: null, pinned_by: null } : m));
      } else {
        await pinMessage(msg.id);
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, pinned_at: new Date().toISOString(), pinned_by: userId } : m));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleForward = (msg: Message) => {
    setActionMsg(null);
    setForwardingMsg(msg);
    setShowForwardModal(true);
  };

  const handleForwardToChannel = async (targetChannelId: string) => {
    if (!forwardingMsg) return;
    try {
      await forwardMessage(forwardingMsg.id, targetChannelId);
      setShowForwardModal(false);
      setForwardingMsg(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !channelId) return;
    setSearching(true);
    try {
      const result = await searchMessages(channelId, searchQuery.trim());
      setSearchResults(result.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleToggleMute = async () => {
    if (!channelId) return;
    try {
      if (isMuted) {
        await unmuteChannel(channelId);
        setIsMuted(false);
      } else {
        await muteChannel(channelId);
        setIsMuted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ── Channel-Name ──────────────────────────────────────────
  const getChannelName = () => {
    if (!channel) return '';
    if (channel.type === 'direct') {
      const partner = channel.members.find((m) => m.user_id !== userId);
      return partner?.profile.display_name ?? partner?.profile.username ?? 'Chat';
    }
    return channel.name ?? 'Gruppe';
  };

  const getPartnerAvatar = () => {
    if (!channel || channel.type !== 'direct') return null;
    const partner = channel.members.find((m) => m.user_id !== userId);
    return partner?.profile.avatar_url ?? null;
  };

  const isGroupChannel = channel && channel.type !== 'direct';

  // ── Message Bubble ────────────────────────────────────────
  const renderMessage = ({ item: msg, index }: { item: Message; index: number }) => {
    const isOwn = msg.user_id === userId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAuthor = !isOwn && (!prevMsg || prevMsg.user_id !== msg.user_id);
    const authorName = msg.author?.display_name ?? msg.author?.username ?? 'Anonym';
    const msgReactions = reactions[msg.id] ?? [];

    // System-Nachricht
    if (msg.type === 'system') {
      // NaN-Werte in Anruf-Nachrichten bereinigen
      let displayContent = msg.content ?? '';
      displayContent = displayContent.replace(/NaN:NaN/g, '0:00').replace(/NaN/g, '0');

      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{displayContent}</Text>
        </View>
      );
    }

    // Seeds-Nachricht
    if (msg.type === 'seeds') {
      const seedsAmount = (msg.metadata?.amount as number) ?? msg.content;
      return (
        <View style={styles.seedsRow}>
          <View style={[styles.seedsCard, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}>
            <Icon name="seedling" size={18} color={colors.gold} />
            <Text style={[styles.seedsAmount, { color: colors.gold }]}>{seedsAmount} Seeds</Text>
            <Text style={[styles.seedsSub, { color: colors.textMuted }]}>
              {isOwn ? 'gesendet' : `von ${authorName}`}
            </Text>
          </View>
        </View>
      );
    }

    // Poll-Nachricht
    if (msg.type === 'poll') {
      return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          <View style={{ maxWidth: '85%' }}>
            {showAuthor && <Text style={styles.bubbleAuthor}>{authorName}</Text>}
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
              <PollBubble
                message={msg}
                currentUserId={userId ?? ''}
                refreshTrigger={pollRefreshTrigger}
              />
            </View>
          </View>
        </View>
      );
    }

    // Challenge-Nachricht
    if (msg.type === 'challenge' && msg.metadata?.challenge_id) {
      return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          <View style={{ maxWidth: '85%' }}>
            {showAuthor && <Text style={styles.bubbleAuthor}>{authorName}</Text>}
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
              <InlineChallengeEmbed challengeId={String(msg.metadata.challenge_id)} />
            </View>
          </View>
        </View>
      );
    }

    // Location-Nachricht
    if (msg.type === 'location') {
      const loc = (msg.metadata?.location as any) ?? {};
      return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          <View style={{ maxWidth: '75%' }}>
            {showAuthor && <Text style={styles.bubbleAuthor}>{authorName}</Text>}
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, { padding: 4 }]}>
              <LocationShareCard location={loc} />
              <View style={[styles.bubbleMeta, isOwn && { alignSelf: 'flex-end' }, { marginTop: 4, paddingHorizontal: 6 }]}>
                <Text style={styles.bubbleTime}>
                  {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isOwn && <ReadReceipt msgCreatedAt={msg.created_at} readStatus={readStatus} userId={userId!} />}
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Voice-Nachricht
    if (msg.type === 'voice' && msg.content) {
      return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          <View style={{ maxWidth: '75%' }}>
            {showAuthor && <Text style={styles.bubbleAuthor}>{authorName}</Text>}
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
              <VoicePlayer uri={msg.content} durationMs={(msg.metadata?.duration_ms as number) ?? 0} />
              <View style={[styles.bubbleMeta, isOwn && { alignSelf: 'flex-end' }]}>
                <Text style={styles.bubbleTime}>
                  {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isOwn && <ReadReceipt msgCreatedAt={msg.created_at} readStatus={readStatus} userId={userId!} />}
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Image-Nachricht (Einzel- oder Multi-Bild)
    if (msg.type === 'image' && msg.content) {
      const imageUrls: string[] = (msg.metadata?.image_urls as string[]) ?? [msg.content];

      return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          <View style={{ maxWidth: '75%' }}>
            {showAuthor && <Text style={styles.bubbleAuthor}>{authorName}</Text>}
            <TouchableOpacity
              style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, { padding: 4 }]}
              activeOpacity={0.8}
              onLongPress={() => setActionMsg(msg)}
            >
              {imageUrls.length === 1 ? (
                <Image
                  source={{ uri: imageUrls[0] }}
                  style={styles.imageMsg}
                  resizeMode="cover"
                />
              ) : (
                <ImageGrid images={imageUrls} maxHeight={220} />
              )}
              <View style={[styles.bubbleMeta, isOwn && { alignSelf: 'flex-end' }, { marginTop: 4, paddingHorizontal: 6 }]}>
                {msg.edited_at && <Text style={styles.bubbleEdited}>bearbeitet</Text>}
                <Text style={styles.bubbleTime}>
                  {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Reactions */}
            {msgReactions.length > 0 && (
              <View style={[styles.reactionsRow, isOwn && { justifyContent: 'flex-end' }]}>
                {msgReactions.map((r) => (
                  <TouchableOpacity
                    key={r.emoji}
                    style={[styles.reactionChip, r.has_reacted && styles.reactionChipOwn]}
                    onPress={() => handleEmojiSelectDirect(msg.id, r.emoji, r.has_reacted)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      );
    }

    // Text-Nachricht (default)
    return (
      <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
        <View style={{ maxWidth: '75%' }}>
          {showAuthor && (
            <Text style={styles.bubbleAuthor}>{authorName}</Text>
          )}

          {/* Reply Preview */}
          {msg.reply_message && (
            <View style={[styles.replyPreview, isOwn && { borderLeftColor: 'rgba(200,169,110,0.5)' }]}>
              <Text style={styles.replyAuthor}>
                {msg.reply_message.author?.display_name ?? 'Nachricht'}
              </Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {msg.reply_message.content?.slice(0, 40) ?? '...'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
            activeOpacity={0.8}
            onLongPress={() => setActionMsg(msg)}
          >
            <MarkdownText text={msg.content ?? ''} />
            {/* Link Preview (OpenGraph) */}
            {!!(msg.metadata as any)?.link_preview && (
              <LinkPreviewCard preview={(msg.metadata as any).link_preview} />
            )}
            <View style={[styles.bubbleMeta, isOwn && { alignSelf: 'flex-end' }]}>
              {msg.edited_at && <Text style={styles.bubbleEdited}>bearbeitet</Text>}
              <Text style={styles.bubbleTime}>
                {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isOwn && <ReadReceipt msgCreatedAt={msg.created_at} readStatus={readStatus} userId={userId!} />}
            </View>
          </TouchableOpacity>

          {/* Reactions */}
          {msgReactions.length > 0 && (
            <View style={[styles.reactionsRow, isOwn && { justifyContent: 'flex-end' }]}>
              {msgReactions.map((r) => (
                <TouchableOpacity
                  key={r.emoji}
                  style={[styles.reactionChip, r.has_reacted && styles.reactionChipOwn]}
                  onPress={() => handleEmojiSelectDirect(msg.id, r.emoji, r.has_reacted)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.dividerL }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name="arrow-left" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={[styles.headerAvatar, { backgroundColor: colors.avatarBg, borderColor: colors.goldBorderS }]}>
          {getPartnerAvatar() ? (
            <Image source={{ uri: getPartnerAvatar()! }} style={styles.headerAvatarImg} />
          ) : channel?.type === 'direct' ? (
            <Text style={[styles.headerAvatarText, { color: colors.gold }]}>
              {(getChannelName()).slice(0, 1).toUpperCase()}
            </Text>
          ) : (
            <Icon name="users" size={16} color={colors.gold} />
          )}
        </View>

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={isGroupChannel ? () => setShowGroupInfo(true) : undefined}
          activeOpacity={isGroupChannel ? 0.7 : 1}
        >
          <Text style={[styles.headerName, { color: colors.textH }]} numberOfLines={1}>{getChannelName()}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {channel?.type === 'direct' ? 'Direkt' : `${channel?.members.length ?? 0} Mitglieder`}
          </Text>
        </TouchableOpacity>

        {/* Call Buttons (nur Direct Chats) */}
        {channel?.type === 'direct' && (() => {
          const partner = channel.members.find((m: any) => m.user_id !== userId);
          return partner ? (
            <>
              <TouchableOpacity
                onPress={() => startCall({
                  channelId: channelId!,
                  partnerId: partner.user_id,
                  partnerName: partner.display_name || partner.username || 'Unbekannt',
                  partnerAvatar: partner.avatar_url,
                  video: false,
                })}
                style={styles.headerBtn}
              >
                <Icon name="phone" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => startCall({
                  channelId: channelId!,
                  partnerId: partner.user_id,
                  partnerName: partner.display_name || partner.username || 'Unbekannt',
                  partnerAvatar: partner.avatar_url,
                  video: true,
                })}
                style={styles.headerBtn}
              >
                <Icon name="video" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          ) : null;
        })()}

        {/* Search Button */}
        <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.headerBtn}>
          <Icon name="search" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        {isGroupChannel && (
          <TouchableOpacity onPress={() => setShowGroupInfo(true)} style={styles.headerBtn}>
            <Icon name="info" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onScroll={(e) => {
            if (e.nativeEvent.contentOffset.y < 80 && hasMore && !loadingMore) {
              loadOlderMessages();
            }
          }}
          scrollEventThrottle={400}
          ListHeaderComponent={
            hasMore && loadingMore ? (
              <ActivityIndicator color="#C8A96E" style={{ marginBottom: 8 }} />
            ) : null
          }
        />

        {/* Reply Banner */}
        {replyTo && (
          <View style={styles.replyBanner}>
            <Icon name="corner-up-left" size={12} color="#C8A96E" />
            <Text style={styles.replyBannerText} numberOfLines={1}>
              Antwort auf: {replyTo.author?.display_name ?? 'Nachricht'}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Icon name="x" size={14} color="#5A5450" />
            </TouchableOpacity>
          </View>
        )}

        {/* Edit Banner */}
        {editingMsg && (
          <View style={styles.replyBanner}>
            <Icon name="edit" size={12} color="#C8A96E" />
            <Text style={styles.replyBannerText} numberOfLines={1}>
              Nachricht bearbeiten
            </Text>
            <TouchableOpacity onPress={cancelEditing}>
              <Icon name="x" size={14} color="#5A5450" />
            </TouchableOpacity>
          </View>
        )}

        {/* Image Preview Banner */}
        {pendingImages.length > 0 && (
          <View style={styles.imagePreviewBanner}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, alignItems: 'center' }}
              style={{ flex: 1 }}
            >
              {pendingImages.map((uri, i) => (
                <View key={i} style={styles.pendingThumbWrap}>
                  <Image source={{ uri }} style={styles.imagePreviewThumb} />
                  {!uploadingImage && (
                    <TouchableOpacity
                      style={styles.pendingThumbRemove}
                      onPress={() => handleRemovePendingImage(i)}
                    >
                      <Icon name="x" size={8} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            <Text style={styles.imagePreviewText} numberOfLines={1}>
              {uploadingImage
                ? `Hochladen ${uploadProgress}`
                : `${pendingImages.length} Bild${pendingImages.length > 1 ? 'er' : ''}`
              }
            </Text>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#C8A96E" />
            ) : (
              <>
                <TouchableOpacity onPress={handleCancelImages} style={{ padding: 4 }}>
                  <Icon name="x" size={14} color="#5A5450" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendImages} style={styles.imagePreviewSend}>
                  <Icon name="send" size={14} color="#1A1A1A" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Typing Indicator */}
        <TypingIndicator users={typingUsers} channel={channel} />

        {/* Aktions-Leiste (ausklappbar via + Button) */}
        {showLocationModal && (
          <View style={[styles.actionsBar, { borderTopColor: colors.dividerL, backgroundColor: colors.bgSolid }]}>
            <TouchableOpacity style={styles.actionBarItem} onPress={handlePickImage} activeOpacity={0.7}>
              <View style={[styles.actionBarIcon, { backgroundColor: `${colors.gold}15` }]}>
                <Icon name="photo" size={22} color={colors.gold} />
              </View>
              <Text style={[styles.actionBarLabel, { color: colors.textMuted }]}>Fotos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBarItem} onPress={() => { Keyboard.dismiss(); setTimeout(() => setShowPollForm(true), 100); }} activeOpacity={0.7}>
              <View style={[styles.actionBarIcon, { backgroundColor: `${colors.gold}15` }]}>
                <Icon name="chart-bar" size={22} color={colors.gold} />
              </View>
              <Text style={[styles.actionBarLabel, { color: colors.textMuted }]}>Umfrage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBarItem} onPress={() => { Keyboard.dismiss(); setTimeout(() => setShowSeedsModal(true), 100); }} activeOpacity={0.7}>
              <View style={[styles.actionBarIcon, { backgroundColor: `${colors.gold}15` }]}>
                <Icon name="seedling" size={22} color={colors.gold} />
              </View>
              <Text style={[styles.actionBarLabel, { color: colors.textMuted }]}>Seeds</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBarItem} onPress={() => { Keyboard.dismiss(); setTimeout(() => setShowChallengeModal(true), 100); }} activeOpacity={0.7}>
              <View style={[styles.actionBarIcon, { backgroundColor: `${colors.gold}15` }]}>
                <Icon name="target" size={22} color={colors.gold} />
              </View>
              <Text style={[styles.actionBarLabel, { color: colors.textMuted }]}>Challenge</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBarItem} onPress={() => handleSendLocation(false)} activeOpacity={0.7}>
              <View style={[styles.actionBarIcon, { backgroundColor: `${colors.gold}15` }]}>
                <Icon name="map-pin" size={22} color={colors.gold} />
              </View>
              <Text style={[styles.actionBarLabel, { color: colors.textMuted }]}>
                {sendingLocation ? '…' : 'Standort'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBarItem} onPress={() => handleSendLocation(true)} activeOpacity={0.7}>
              <View style={[styles.actionBarIcon, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                <Icon name="current-location" size={22} color="#22C55E" />
              </View>
              <Text style={[styles.actionBarLabel, { color: colors.textMuted }]}>Live</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputRow, { borderTopColor: colors.dividerL }]}>
          {/* Mehr-Aktionen Button (+) — oeffnet Aktions-Zeile */}
          <TouchableOpacity
            style={styles.inputActionBtn}
            onPress={() => setShowLocationModal((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={24} color={showLocationModal ? colors.gold : colors.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
            value={text}
            onChangeText={(t) => { setText(t); sendTyping(); }}
            placeholder={editingMsg ? 'Nachricht bearbeiten ...' : 'Nachricht schreiben ...'}
            placeholderTextColor={colors.textMuted}
            maxLength={5000}
            returnKeyType="send"
            onSubmitEditing={editingMsg ? handleSaveEdit : handleSend}
          />
          {/* Send / Voice Button */}
          {voiceRecorder.isRecording ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#E53E3E' }}>
                {Math.floor(voiceRecorder.duration / 60)}:{(voiceRecorder.duration % 60).toString().padStart(2, '0')}
              </Text>
              <TouchableOpacity onPress={voiceRecorder.cancelRecording} style={{ padding: 4 }}>
                <Icon name="x" size={18} color="#E53E3E" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.gold }]}
                onPress={async () => {
                  const url = await voiceRecorder.stopRecording();
                  if (url && channelId) {
                    await sendMessage(channelId, {
                      type: 'voice',
                      content: url,
                      metadata: { duration_ms: voiceRecorder.duration * 1000 },
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <Icon name="send" size={16} color={colors.textOnGold} />
              </TouchableOpacity>
            </View>
          ) : text.trim() || editingMsg ? (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.gold }, (!text.trim() || sending) && { backgroundColor: colors.goldBg }]}
              onPress={editingMsg ? handleSaveEdit : handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.7}
            >
              <Icon name="send" size={16} color={text.trim() && !sending ? colors.textOnGold : colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: `${colors.gold}20` }]}
              onPress={voiceRecorder.startRecording}
              activeOpacity={0.7}
            >
              <Icon name="microphone" size={16} color={colors.gold} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Action Sheet Modal */}
      <MessageActionSheet
        message={actionMsg}
        isOwn={actionMsg?.user_id === userId}
        onClose={() => setActionMsg(null)}
        onReply={(msg) => { setActionMsg(null); setReplyTo(msg); }}
        onEdit={startEditing}
        onDelete={(msgId) => handleDelete(msgId)}
        onReact={handleReaction}
        onPin={handlePin}
        onForward={handleForward}
      />

      {/* Emoji Picker Modal */}
      <EmojiPickerModal
        visible={!!emojiPickerMsg}
        onClose={() => setEmojiPickerMsg(null)}
        onSelect={handleEmojiSelect}
        existingReactions={emojiPickerMsg ? (reactions[emojiPickerMsg.id] ?? []) : []}
      />

      {/* Poll erstellen Modal */}
      {channelId && (
        <CreatePollModal
          visible={showPollForm}
          channelId={channelId}
          onCreated={handlePollCreated}
          onClose={() => setShowPollForm(false)}
        />
      )}

      {/* Seeds Transfer Modal */}
      {channel && userId && (
        <SeedsTransferModal
          visible={showSeedsModal}
          channelId={channel.id}
          channelType={channel.type}
          members={channel.members}
          currentUserId={userId}
          onClose={() => setShowSeedsModal(false)}
          onSent={handleSeedsSent}
        />
      )}

      {/* Challenge erstellen Modal */}
      <CreateChallengeModal
        visible={showChallengeModal}
        channelId={channelId}
        onClose={() => setShowChallengeModal(false)}
        onCreated={() => setShowChallengeModal(false)}
      />

      {/* Group Info Sheet */}
      {channel && userId && isGroupChannel && (
        <GroupInfoSheet
          visible={showGroupInfo}
          channel={channel}
          currentUserId={userId}
          onClose={() => setShowGroupInfo(false)}
          onChannelUpdated={(updated) => setChannel(updated)}
        />
      )}

      {/* Search Modal */}
      <Modal visible={showSearch} transparent animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          >
            {/* Ergebnisse oben */}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.dividerL }}
                  onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                >
                  <Text style={{ fontSize: 11, color: colors.gold, marginBottom: 2 }}>
                    {item.author?.display_name ?? 'Anonym'} · {new Date(item.created_at).toLocaleDateString('de-DE')}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={3}>{item.content}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.trim() && !searching ? (
                  <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>Keine Ergebnisse</Text>
                ) : null
              }
            />
            {/* Suchleiste unten (direkt ueber Tastatur) */}
            <View style={[styles.searchBar, { borderTopColor: colors.dividerL, backgroundColor: colors.bgSolid }]}>
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} style={{ padding: 8 }}>
                <Icon name="arrow-left" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Nachrichten durchsuchen …"
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color={colors.gold} />}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Forward Modal */}
      <ForwardModal
        visible={showForwardModal}
        onClose={() => { setShowForwardModal(false); setForwardingMsg(null); }}
        onSelect={handleForwardToChannel}
        currentChannelId={channelId}
      />
    </SafeAreaView>
  );
}

// ── InlineChallengeEmbed ──────────────────────────────────────────

function InlineChallengeEmbed({ challengeId }: { challengeId: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  useEffect(() => {
    fetchChallenge(challengeId).then(setChallenge).catch(console.error);
  }, [challengeId]);
  if (!challenge) return null;
  return <ChallengeCard challenge={challenge} />;
}

// ── MessageActionSheet ─────────────────────────────────────────

function MessageActionSheet({
  message, isOwn, onClose, onReply, onEdit, onDelete, onReact, onPin, onForward,
}: {
  message: Message | null;
  isOwn?: boolean;
  onClose: () => void;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msgId: string) => void;
  onReact: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onForward: (msg: Message) => void;
}) {
  if (!message) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContent}>
          {/* Reagieren */}
          <TouchableOpacity
            style={styles.sheetAction}
            onPress={() => onReact(message)}
            activeOpacity={0.7}
          >
            <Icon name="face-smile" size={18} color="#C8A96E" />
            <Text style={styles.sheetActionText}>Reagieren</Text>
          </TouchableOpacity>

          {/* Antworten */}
          <TouchableOpacity
            style={styles.sheetAction}
            onPress={() => onReply(message)}
            activeOpacity={0.7}
          >
            <Icon name="corner-up-left" size={18} color="#C8A96E" />
            <Text style={styles.sheetActionText}>Antworten</Text>
          </TouchableOpacity>

          {/* Bearbeiten – nur eigene Textnachrichten */}
          {isOwn && message.type === 'text' && (
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => onEdit(message)}
              activeOpacity={0.7}
            >
              <Icon name="edit" size={18} color="#C8A96E" />
              <Text style={styles.sheetActionText}>Bearbeiten</Text>
            </TouchableOpacity>
          )}

          {/* Anpinnen */}
          <TouchableOpacity
            style={styles.sheetAction}
            onPress={() => onPin(message)}
            activeOpacity={0.7}
          >
            <Icon name="bookmark" size={18} color="#C8A96E" />
            <Text style={styles.sheetActionText}>
              {message.pinned_at ? 'Lospinnen' : 'Anpinnen'}
            </Text>
          </TouchableOpacity>

          {/* Weiterleiten */}
          <TouchableOpacity
            style={styles.sheetAction}
            onPress={() => onForward(message)}
            activeOpacity={0.7}
          >
            <Icon name="share" size={18} color="#C8A96E" />
            <Text style={styles.sheetActionText}>Weiterleiten</Text>
          </TouchableOpacity>

          {/* Loeschen – nur eigene Nachrichten */}
          {isOwn && (
            <TouchableOpacity
              style={[styles.sheetAction, styles.sheetActionDanger]}
              onPress={() => onDelete(message.id)}
              activeOpacity={0.7}
            >
              <Icon name="trash" size={18} color="#E05A5A" />
              <Text style={[styles.sheetActionText, { color: '#E05A5A' }]}>Loeschen</Text>
            </TouchableOpacity>
          )}

          {/* Abbrechen */}
          <TouchableOpacity
            style={[styles.sheetAction, { marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.08)' }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Icon name="x" size={18} color="#5A5450" />
            <Text style={[styles.sheetActionText, { color: '#5A5450' }]}>Schliessen</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── ReadReceipt (Haekchen) ─────────────────────────────────────

function ReadReceipt({
  msgCreatedAt, readStatus, userId,
}: { msgCreatedAt: string; readStatus: Record<string, string>; userId: string }) {
  // Pruefe ob mindestens ein anderer User die Nachricht gelesen hat
  const msgTime = new Date(msgCreatedAt).getTime();
  const isRead = Object.entries(readStatus).some(
    ([uid, lastRead]) => uid !== userId && new Date(lastRead).getTime() >= msgTime,
  );

  return (
    <Text style={{ fontSize: 11, marginLeft: 3, color: isRead ? '#C8A96E' : 'rgba(255,255,255,0.3)' }}>
      {isRead ? '✓✓' : '✓'}
    </Text>
  );
}

// ── TypingIndicator ───────────────────────────────────────────

function TypingIndicator({ users, channel }: { users: string[]; channel: any }) {
  if (users.length === 0) return null;

  // Versuche Display-Name aus Channel-Members zu finden
  const names = users.map((uid) => {
    const member = channel?.members?.find((m: any) => m.user_id === uid);
    return member?.display_name || member?.username || 'Jemand';
  });

  const text = names.length === 1
    ? `${names[0]} tippt …`
    : `${names.slice(0, 2).join(' und ')} tippen …`;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(200,169,110,0.7)', fontStyle: 'italic' }}>
        {text}
      </Text>
    </View>
  );
}

// ── EmojiPickerModal ───────────────────────────────────────────

function EmojiPickerModal({
  visible, onClose, onSelect, existingReactions,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  existingReactions: ReactionSummary[];
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.emojiPickerContent}>
          <Text style={styles.emojiPickerTitle}>Reaktion waehlen</Text>
          <View style={styles.emojiGrid}>
            {QUICK_EMOJIS.map((emoji) => {
              const hasReacted = existingReactions.some((r) => r.emoji === emoji && r.has_reacted);
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, hasReacted && styles.emojiBtnActive]}
                  onPress={() => onSelect(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  headerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarText: { fontSize: 14, color: '#C8A96E', fontWeight: '400' },
  headerName: { fontSize: 14, color: '#F0EDE8', fontWeight: '500' },
  headerSub: { fontSize: 10, color: '#5A5450', letterSpacing: 1, textTransform: 'uppercase' },

  // Messages
  systemRow: { alignItems: 'center', paddingVertical: 8 },
  systemText: {
    fontSize: 10, color: '#5A5450', letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(200,169,110,0.04)', borderRadius: 10,
  },

  // Seeds
  seedsRow: { alignItems: 'center', paddingVertical: 8 },
  seedsCard: {
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(200,169,110,0.08)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)',
  },
  seedsAmount: { fontSize: 20, fontWeight: '500', color: '#C8A96E', marginTop: 4 },
  seedsSub: { fontSize: 10, color: '#5A5450', letterSpacing: 1, marginTop: 2 },

  // Bubbles
  bubbleRow: { marginVertical: 2 },
  bubbleRowOwn: { alignItems: 'flex-end' },
  bubbleRowOther: { alignItems: 'flex-start' },
  bubbleAuthor: { fontSize: 10, color: '#C8A96E', marginBottom: 2, marginLeft: 4 },

  bubble: { paddingHorizontal: 14, paddingVertical: 8, maxWidth: '100%' },
  bubbleOwn: {
    backgroundColor: 'rgba(200,169,110,0.12)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)',
    borderRadius: 14, borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, borderBottomLeftRadius: 4,
  },
  bubbleContent: { fontSize: 14, color: '#c8c0b8', lineHeight: 20, fontWeight: '400' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bubbleEdited: { fontSize: 9, color: '#5A5450' },
  bubbleTime: { fontSize: 9, color: '#5A5450' },

  // Image in bubble
  imageMsg: {
    width: 220, height: 180, borderRadius: 10,
  },

  replyPreview: {
    paddingLeft: 8, paddingVertical: 4, marginBottom: 2,
    borderLeftWidth: 2, borderLeftColor: 'rgba(200,169,110,0.3)',
  },
  replyAuthor: { fontSize: 10, color: '#C8A96E' },
  replyText: { fontSize: 10, color: '#5A5450' },

  // Reactions
  reactionsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    marginTop: 4, paddingHorizontal: 2,
  },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  reactionChipOwn: {
    backgroundColor: 'rgba(200,169,110,0.15)',
    borderColor: 'rgba(200,169,110,0.3)',
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 10, color: '#9A9080' },

  // Reply / Edit Banner
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(200,169,110,0.04)',
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.1)',
  },
  replyBannerText: { flex: 1, fontSize: 11, color: '#5A5450' },

  // Image Preview Banner
  imagePreviewBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(200,169,110,0.04)',
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.1)',
  },
  pendingThumbWrap: {
    width: 36, height: 36,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pendingThumbRemove: {
    position: 'absolute', top: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(230,57,70,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  imagePreviewThumb: {
    width: 36, height: 36, borderRadius: 6,
  },
  imagePreviewText: { fontSize: 11, color: '#5A5450', marginLeft: 4 },
  imagePreviewSend: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#C8A96E',
    alignItems: 'center', justifyContent: 'center',
  },

  // Actions Bar (ausklappbar)
  actionsBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 12, paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  actionBarItem: {
    alignItems: 'center', gap: 6, paddingHorizontal: 6,
    minWidth: 56,
  },
  actionBarIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBarLabel: {
    fontSize: 11, letterSpacing: 0.3, fontWeight: '500',
  },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.06)',
  },
  actionBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  inputActionBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8, color: '#F0EDE8', fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C8A96E',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(200,169,110,0.15)' },

  // Search Bar (unten im Search Modal)
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 10,
    borderTopWidth: 1,
  },

  // Action Sheet
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#1E1C26',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 8,
  },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  sheetActionDanger: {},
  sheetActionText: { fontSize: 15, color: '#F0EDE8', fontWeight: '400' },

  // Emoji Picker
  emojiPickerContent: {
    backgroundColor: '#1E1C26',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 16, paddingHorizontal: 16,
  },
  emojiPickerTitle: {
    fontSize: 12, color: '#5A5450', letterSpacing: 2,
    textTransform: 'uppercase', textAlign: 'center', marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
  },
  emojiBtn: {
    width: 52, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  emojiBtnActive: {
    backgroundColor: 'rgba(200,169,110,0.15)',
    borderColor: 'rgba(200,169,110,0.3)',
  },
  emojiText: { fontSize: 26 },
});

// ── ForwardModal (Kanal-Auswahl) ────────────────────────────────

function ForwardModal({
  visible, onClose, onSelect, currentChannelId,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (channelId: string) => void;
  currentChannelId?: string;
}) {
  const colors = useThemeStore((s) => s.colors);
  const [channels, setChannels] = useState<any[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const userId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    if (!visible) return;
    setLoadingChannels(true);
    fetchChannels()
      .then((chs) => setChannels(chs.filter((c: any) => c.id !== currentChannelId)))
      .catch(console.error)
      .finally(() => setLoadingChannels(false));
  }, [visible, currentChannelId]);

  const getDisplayName = (ch: any) => {
    if (ch.type === 'direct') {
      const partner = ch.members?.find((m: any) => m.user_id !== userId);
      return partner?.display_name || partner?.username || 'Chat';
    }
    return ch.name || 'Gruppe';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fwdStyles.overlay} onPress={onClose}>
        <Pressable style={[fwdStyles.content, { backgroundColor: colors.bgSolid }]}>
          <Text style={[fwdStyles.title, { color: colors.textH }]}>Weiterleiten an</Text>
          {loadingChannels ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={channels}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[fwdStyles.row, { borderBottomColor: colors.dividerL }]}
                  onPress={() => onSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[fwdStyles.avatar, { backgroundColor: `${colors.gold}15` }]}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={fwdStyles.avatarImg} />
                    ) : (
                      <Icon name={item.type === 'direct' ? 'user' : 'users'} size={16} color={colors.gold} />
                    )}
                  </View>
                  <Text style={[fwdStyles.name, { color: colors.text }]} numberOfLines={1}>{getDisplayName(item)}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>Keine Kanäle</Text>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fwdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, paddingTop: 16, paddingHorizontal: 16 },
  title: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  name: { flex: 1, fontSize: 14, fontWeight: '400' },
});
