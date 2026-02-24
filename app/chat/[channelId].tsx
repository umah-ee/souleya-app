import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import type { ChannelDetail, Message } from '../../types/chat';
import { fetchChannel, fetchMessages, sendMessage, markChannelAsRead, deleteMessage as apiDeleteMessage } from '../../lib/chat';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/Icon';

export default function ChatRoomScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [channelId]);

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

  const handleDelete = async (msgId: string) => {
    try {
      await apiDeleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
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

  // ── Message Bubble ────────────────────────────────────────
  const renderMessage = ({ item: msg, index }: { item: Message; index: number }) => {
    const isOwn = msg.user_id === userId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAuthor = !isOwn && (!prevMsg || prevMsg.user_id !== msg.user_id);
    const authorName = msg.author?.display_name ?? msg.author?.username ?? 'Anonym';

    // System-Nachricht
    if (msg.type === 'system') {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{msg.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
        <View style={{ maxWidth: '75%' }}>
          {showAuthor && (
            <Text style={styles.bubbleAuthor}>{authorName}</Text>
          )}

          {/* Reply Preview */}
          {msg.reply_message && (
            <View style={styles.replyPreview}>
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
            onLongPress={() => {
              if (isOwn && msg.type === 'text') {
                // Einfaches Loeschen bei Long Press
                handleDelete(msg.id);
              } else if (!isOwn) {
                setReplyTo(msg);
              }
            }}
          >
            <Text style={styles.bubbleContent}>{msg.content}</Text>
            <View style={[styles.bubbleMeta, isOwn && { alignSelf: 'flex-end' }]}>
              {msg.edited_at && <Text style={styles.bubbleEdited}>bearbeitet</Text>}
              <Text style={styles.bubbleTime}>
                {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color="#C8A96E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={20} color="#5A5450" />
        </TouchableOpacity>

        <View style={[styles.headerAvatar]}>
          {getPartnerAvatar() ? (
            <Image source={{ uri: getPartnerAvatar()! }} style={styles.headerAvatarImg} />
          ) : channel?.type === 'direct' ? (
            <Text style={styles.headerAvatarText}>
              {(getChannelName()).slice(0, 1).toUpperCase()}
            </Text>
          ) : (
            <Icon name="users" size={16} color="#C8A96E" />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>{getChannelName()}</Text>
          <Text style={styles.headerSub}>
            {channel?.type === 'direct' ? 'Direkt' : `${channel?.members.length ?? 0} Mitglieder`}
          </Text>
        </View>
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
          ListHeaderComponent={
            hasMore ? (
              <TouchableOpacity
                onPress={loadOlderMessages}
                disabled={loadingMore}
                style={styles.loadMoreBtn}
              >
                <Text style={styles.loadMoreText}>
                  {loadingMore ? '...' : 'Aeltere laden'}
                </Text>
              </TouchableOpacity>
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

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Nachricht schreiben ..."
            placeholderTextColor="#5A5450"
            maxLength={5000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            <Icon name="send" size={16} color={text.trim() && !sending ? '#1A1A1A' : '#5A5450'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
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
  loadMoreBtn: {
    alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)',
    marginBottom: 8,
  },
  loadMoreText: { fontSize: 10, color: '#5A5450', letterSpacing: 1, textTransform: 'uppercase' },

  systemRow: { alignItems: 'center', paddingVertical: 8 },
  systemText: {
    fontSize: 10, color: '#5A5450', letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(200,169,110,0.04)', borderRadius: 10,
  },

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

  replyPreview: {
    paddingLeft: 8, paddingVertical: 4, marginBottom: 2,
    borderLeftWidth: 2, borderLeftColor: 'rgba(200,169,110,0.3)',
  },
  replyAuthor: { fontSize: 10, color: '#C8A96E' },
  replyText: { fontSize: 10, color: '#5A5450' },

  // Reply Banner
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(200,169,110,0.04)',
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.1)',
  },
  replyBannerText: { flex: 1, fontSize: 11, color: '#5A5450' },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.06)',
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
});
