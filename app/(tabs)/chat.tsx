import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, RefreshControl, Modal,
  TextInput, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useChatStore } from '../../store/chat';
import type { ChannelOverview } from '../../types/chat';
import type { Connection } from '../../types/circles';
import { fetchChannels, createDirectChannel, createGroupChannel } from '../../lib/chat';
import { getConnections } from '../../lib/circles';
import { Icon } from '../../components/Icon';

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'jetzt';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} Min.`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} Std.`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} T.`;
  return new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function getMessagePreview(channel: ChannelOverview): string {
  if (!channel.last_message) return 'Noch keine Nachrichten';
  const { type, content, author_name } = channel.last_message;
  const prefix = channel.type !== 'direct' && author_name ? `${author_name}: ` : '';
  switch (type) {
    case 'image': return `${prefix}Bild`;
    case 'voice': return `${prefix}Sprachnachricht`;
    case 'location': return `${prefix}Standort`;
    case 'seeds': return `${prefix}Seeds gesendet`;
    case 'poll': return `${prefix}Abstimmung`;
    case 'system': return content ?? 'System';
    default: return `${prefix}${content?.slice(0, 50) ?? ''}`;
  }
}

export default function ChatTab() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const setTotalUnread = useChatStore((s) => s.setTotalUnread);
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const loadChannels = useCallback(async () => {
    try {
      const data = await fetchChannels();
      setChannels(data);
      const total = data.reduce((sum, ch) => sum + ch.unread_count, 0);
      setTotalUnread(total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setTotalUnread]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChannels();
    setRefreshing(false);
  };

  const handleChannelPress = (channelId: string) => {
    router.push(`/chat/${channelId}` as never);
  };

  const handleChatCreated = (channelId: string) => {
    setShowNewChat(false);
    router.push(`/chat/${channelId}` as never);
  };

  const renderChannel = ({ item }: { item: ChannelOverview }) => {
    const hasUnread = item.unread_count > 0;
    const initials = (item.name ?? '?').slice(0, 1).toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.channelRow, hasUnread && styles.channelRowUnread]}
        onPress={() => handleChannelPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : item.type === 'direct' ? (
            <Text style={styles.avatarText}>{initials}</Text>
          ) : (
            <Icon name="users" size={18} color="#C8A96E" />
          )}
        </View>

        {/* Content */}
        <View style={styles.channelContent}>
          <View style={styles.channelTopRow}>
            <Text
              style={[styles.channelName, hasUnread && styles.channelNameUnread]}
              numberOfLines={1}
            >
              {item.name ?? 'Chat'}
            </Text>
            {item.last_message && (
              <Text style={styles.channelTime}>{timeAgo(item.last_message.created_at)}</Text>
            )}
          </View>
          <View style={styles.channelBottomRow}>
            <Text style={styles.channelPreview} numberOfLines={1}>
              {getMessagePreview(item)}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={() => setShowNewChat(true)}
          activeOpacity={0.7}
        >
          <Icon name="plus" size={14} color="#1A1A1A" />
          <Text style={styles.newChatBtnText}>NEU</Text>
        </TouchableOpacity>
      </View>

      {/* Channel-Liste */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C8A96E" />
        </View>
      ) : channels.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Noch keine Chats</Text>
          <Text style={styles.emptyText}>
            Starte einen neuen Chat mit einer deiner Verbindungen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          renderItem={renderChannel}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#C8A96E"
              colors={['#C8A96E']}
            />
          }
        />
      )}

      {/* Neuer Chat Modal */}
      <NewChatModal
        visible={showNewChat}
        onClose={() => setShowNewChat(false)}
        onCreated={handleChatCreated}
      />
    </SafeAreaView>
  );
}

// ── NewChatModal ──────────────────────────────────────────────

function NewChatModal({
  visible, onClose, onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'direct' | 'group'>('direct');

  // Gruppen-Felder
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadConnections = useCallback(async () => {
    try {
      const result = await getConnections(1, 100);
      setConnections(result.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setSearch('');
      setMode('direct');
      setGroupName('');
      setSelectedIds(new Set());
      loadConnections();
    }
  }, [visible, loadConnections]);

  const handleStartDirect = async (partnerId: string) => {
    setCreating(true);
    try {
      const result = await createDirectChannel(partnerId);
      onCreated(result.id);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedIds.size < 2) return;
    setCreating(true);
    try {
      const result = await createGroupChannel({
        name: groupName.trim(),
        member_ids: Array.from(selectedIds),
      });
      onCreated(result.id);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = connections.filter((c) => {
    if (!search.trim()) return true;
    const name = (c.profile.display_name ?? c.profile.username ?? '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Neuer Chat</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={20} color="#5A5450" />
            </TouchableOpacity>
          </View>

          {/* Modus-Toggle */}
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeBtn, mode === 'direct' && styles.modeBtnActive]}
              onPress={() => setMode('direct')}
            >
              <Text style={[styles.modeBtnText, mode === 'direct' && styles.modeBtnTextActive]}>
                Direkt
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === 'group' && styles.modeBtnActive]}
              onPress={() => setMode('group')}
            >
              <Text style={[styles.modeBtnText, mode === 'group' && styles.modeBtnTextActive]}>
                Gruppe
              </Text>
            </Pressable>
          </View>

          {/* Gruppenname (nur im Gruppen-Modus) */}
          {mode === 'group' && (
            <TextInput
              style={[styles.searchInput, { marginBottom: 0 }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Gruppenname ..."
              placeholderTextColor="#5A5450"
            />
          )}

          {/* Suche */}
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Kontakt suchen ..."
            placeholderTextColor="#5A5450"
          />

          {/* Liste */}
          {loading ? (
            <ActivityIndicator color="#C8A96E" style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item: connection }) => {
                const profile = connection.profile;
                const name = profile.display_name ?? profile.username ?? 'Anonym';
                const initial = name.slice(0, 1).toUpperCase();
                const isSelected = selectedIds.has(profile.id);

                if (mode === 'direct') {
                  return (
                    <TouchableOpacity
                      style={[styles.contactRow, creating && { opacity: 0.5 }]}
                      onPress={() => handleStartDirect(profile.id)}
                      disabled={creating}
                      activeOpacity={0.7}
                    >
                      <View style={styles.contactAvatar}>
                        {profile.avatar_url ? (
                          <Image source={{ uri: profile.avatar_url }} style={styles.contactAvatarImg} />
                        ) : (
                          <Text style={styles.contactAvatarText}>{initial}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{name}</Text>
                        {profile.username && (
                          <Text style={styles.contactUsername}>@{profile.username}</Text>
                        )}
                      </View>
                      <Icon name="message-circle" size={16} color="#C8A96E" />
                    </TouchableOpacity>
                  );
                }

                // Gruppen-Modus: Multi-Select
                return (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => toggleSelect(profile.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.contactAvatar, isSelected && styles.contactAvatarSelected]}>
                      {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.contactAvatarImg} />
                      ) : (
                        <Text style={styles.contactAvatarText}>{initial}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{name}</Text>
                      {profile.username && (
                        <Text style={styles.contactUsername}>@{profile.username}</Text>
                      )}
                    </View>
                    {isSelected && <Icon name="check" size={16} color="#C8A96E" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {search ? 'Kein Kontakt gefunden' : 'Noch keine Verbindungen'}
                </Text>
              }
            />
          )}

          {/* Gruppe erstellen Button */}
          {mode === 'group' && (
            <TouchableOpacity
              style={[
                styles.createGroupBtn,
                (selectedIds.size < 2 || !groupName.trim() || creating) && styles.createGroupBtnDisabled,
              ]}
              onPress={handleCreateGroup}
              disabled={selectedIds.size < 2 || !groupName.trim() || creating}
              activeOpacity={0.7}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <Text style={styles.createGroupBtnText}>
                  Gruppe erstellen{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  headerTitle: { fontSize: 22, fontWeight: '300', color: '#C8A96E' },
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#C8A96E',
  },
  newChatBtnText: { fontSize: 9, letterSpacing: 2, color: '#1A1A1A', fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: '300', color: '#C8A96E', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#5A5450', textAlign: 'center' },

  // Channel Row
  channelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 14,
  },
  channelRowUnread: { backgroundColor: 'rgba(200,169,110,0.04)' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarUnread: { borderColor: 'rgba(200,169,110,0.4)' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 16, color: '#C8A96E', fontWeight: '300' },
  channelContent: { flex: 1, minWidth: 0 },
  channelTopRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  channelName: { fontSize: 14, color: '#c8c0b8', flex: 1, fontWeight: '400' },
  channelNameUnread: { color: '#F0EDE8', fontWeight: '500' },
  channelTime: { fontSize: 10, color: '#5A5450' },
  channelBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  channelPreview: { fontSize: 12, color: '#5A5450', flex: 1, fontWeight: '400' },
  badge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#C8A96E',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, color: '#1A1A1A', fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1C26',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  modalTitle: { fontSize: 18, fontWeight: '300', color: '#F0EDE8' },
  searchInput: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8, color: '#F0EDE8', fontSize: 13,
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  contactAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  contactAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  contactAvatarText: { fontSize: 14, color: '#C8A96E' },
  contactName: { fontSize: 14, color: '#F0EDE8', fontWeight: '400' },
  contactUsername: { fontSize: 11, color: '#5A5450' },
  contactAvatarSelected: {
    borderColor: '#C8A96E', borderWidth: 2,
  },

  // Modus-Toggle
  modeToggle: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)',
  },
  modeBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: 'rgba(200,169,110,0.12)' },
  modeBtnText: { fontSize: 12, color: '#5A5450', letterSpacing: 1, textTransform: 'uppercase' },
  modeBtnTextActive: { color: '#C8A96E' },

  // Gruppe erstellen Button
  createGroupBtn: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    paddingVertical: 12, borderRadius: 24,
    backgroundColor: '#C8A96E', alignItems: 'center',
  },
  createGroupBtnDisabled: { backgroundColor: 'rgba(200,169,110,0.3)' },
  createGroupBtnText: { fontSize: 13, color: '#1A1A1A', fontWeight: '600', letterSpacing: 1 },
});
