import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/auth';
import { useChatStore } from '../../store/chat';
import { useThemeStore } from '../../store/theme';
import type { ChannelDetail, Message, ReactionSummary } from '../../types/chat';
import {
  fetchChannel, fetchMessages, sendMessage, markChannelAsRead,
  deleteMessage as apiDeleteMessage, editMessage as apiEditMessage,
  addReaction, removeReaction, uploadChatImage,
} from '../../lib/chat';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/Icon';
import PollBubble from '../../components/chat/PollBubble';
import CreatePollModal from '../../components/chat/CreatePollModal';
import SeedsTransferModal from '../../components/chat/SeedsTransferModal';
import GroupInfoSheet from '../../components/chat/GroupInfoSheet';

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

  // Neue Features: Polls, Seeds, Images, GroupInfo
  const [showPollForm, setShowPollForm] = useState(false);
  const [showSeedsModal, setShowSeedsModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pollRefreshTrigger, setPollRefreshTrigger] = useState(0);

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
      setMessages((prev) => [...prev, msg]);
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

  // ── Bild auswaehlen ───────────────────────────────────────
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSendImage = async () => {
    if (!imageUri || !userId || !channelId || uploadingImage) return;
    setUploadingImage(true);
    try {
      const publicUrl = await uploadChatImage(imageUri, userId);
      const msg = await sendMessage(channelId, { type: 'image', content: publicUrl });
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setImageUri(null);
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancelImage = () => {
    setImageUri(null);
  };

  // ── Poll erstellt ─────────────────────────────────────────
  const handlePollCreated = (msg: Message) => {
    setShowPollForm(false);
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  // ── Seeds gesendet ────────────────────────────────────────
  const handleSeedsSent = () => {
    setShowSeedsModal(false);
    // Die Nachricht kommt per Realtime
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
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{msg.content}</Text>
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

    // Image-Nachricht
    if (msg.type === 'image' && msg.content) {
      return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          <View style={{ maxWidth: '75%' }}>
            {showAuthor && <Text style={styles.bubbleAuthor}>{authorName}</Text>}
            <TouchableOpacity
              style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, { padding: 4 }]}
              activeOpacity={0.8}
              onLongPress={() => setActionMsg(msg)}
            >
              <Image
                source={{ uri: msg.content }}
                style={styles.imageMsg}
                resizeMode="cover"
              />
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
            <Text style={styles.bubbleContent}>{msg.content}</Text>
            <View style={[styles.bubbleMeta, isOwn && { alignSelf: 'flex-end' }]}>
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
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={20} color={colors.textMuted} />
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

        {isGroupChannel && (
          <TouchableOpacity onPress={() => setShowGroupInfo(true)} style={{ padding: 4 }}>
            <Icon name="info" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
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
        {imageUri && (
          <View style={styles.imagePreviewBanner}>
            <Image source={{ uri: imageUri }} style={styles.imagePreviewThumb} />
            <Text style={styles.imagePreviewText} numberOfLines={1}>Bild senden</Text>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#C8A96E" />
            ) : (
              <>
                <TouchableOpacity onPress={handleCancelImage} style={{ padding: 4 }}>
                  <Icon name="x" size={14} color="#5A5450" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendImage} style={styles.imagePreviewSend}>
                  <Icon name="send" size={14} color="#1A1A1A" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputRow, { borderTopColor: colors.dividerL }]}>
          {/* Photo Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Icon name="photo" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Poll Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowPollForm(true)}
            activeOpacity={0.7}
          >
            <Icon name="chart-bar" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Seeds Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowSeedsModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="seedling" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
            value={text}
            onChangeText={setText}
            placeholder={editingMsg ? 'Nachricht bearbeiten ...' : 'Nachricht schreiben ...'}
            placeholderTextColor={colors.textMuted}
            maxLength={5000}
            returnKeyType="send"
            onSubmitEditing={editingMsg ? handleSaveEdit : handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.gold }, (!text.trim() || sending) && { backgroundColor: colors.goldBg }]}
            onPress={editingMsg ? handleSaveEdit : handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            <Icon name="send" size={16} color={text.trim() && !sending ? colors.textOnGold : colors.textMuted} />
          </TouchableOpacity>
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
    </SafeAreaView>
  );
}

// ── MessageActionSheet ─────────────────────────────────────────

function MessageActionSheet({
  message, isOwn, onClose, onReply, onEdit, onDelete, onReact,
}: {
  message: Message | null;
  isOwn?: boolean;
  onClose: () => void;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msgId: string) => void;
  onReact: (msg: Message) => void;
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
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.06)',
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
  imagePreviewThumb: {
    width: 36, height: 36, borderRadius: 6,
  },
  imagePreviewText: { flex: 1, fontSize: 12, color: '#5A5450' },
  imagePreviewSend: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#C8A96E',
    alignItems: 'center', justifyContent: 'center',
  },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.06)',
  },
  actionBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8, color: '#F0EDE8', fontSize: 14,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#C8A96E',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(200,169,110,0.15)' },

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
