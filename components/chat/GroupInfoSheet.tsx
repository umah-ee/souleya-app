import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  Modal, Pressable, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { ChannelDetail, ChannelMember } from '../../types/chat';
import type { Connection } from '../../types/circles';
import { updateChannel, addChannelMember, removeChannelMember, fetchChannel } from '../../lib/chat';
import { getConnections } from '../../lib/circles';
import { Icon } from '../Icon';

interface Props {
  visible: boolean;
  channel: ChannelDetail;
  currentUserId: string;
  onClose: () => void;
  onChannelUpdated: (updated: ChannelDetail) => void;
}

export default function GroupInfoSheet({ visible, channel, currentUserId, onClose, onChannelUpdated }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(channel.name ?? '');
  const [description, setDescription] = useState(channel.description ?? '');
  const [saving, setSaving] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const isAdmin = channel.members.find((m) => m.user_id === currentUserId)?.role === 'admin';
  const memberIds = new Set(channel.members.map((m) => m.user_id));

  // Reset wenn Channel wechselt
  useEffect(() => {
    setName(channel.name ?? '');
    setDescription(channel.description ?? '');
    setEditing(false);
    setShowAddMember(false);
  }, [channel.id]);

  const loadConnections = useCallback(async () => {
    setLoadingConnections(true);
    try {
      const result = await getConnections(1, 100);
      setConnections(result.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  useEffect(() => {
    if (showAddMember) loadConnections();
  }, [showAddMember, loadConnections]);

  const refreshChannel = async () => {
    try {
      const updated = await fetchChannel(channel.id);
      onChannelUpdated(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateChannel(channel.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      await refreshChannel();
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addChannelMember(channel.id, userId);
      await refreshChannel();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      await removeChannelMember(channel.id, userId);
      await refreshChannel();
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleLeaveGroup = async () => {
    setLeaving(true);
    try {
      await removeChannelMember(channel.id, currentUserId);
      onClose();
      router.back();
    } catch (e) {
      console.error(e);
      setLeaving(false);
    }
  };

  const filteredConnections = connections.filter((c) => {
    if (memberIds.has(c.profile.id)) return false;
    if (!searchQuery.trim()) return true;
    const n = (c.profile.display_name ?? c.profile.username ?? '').toLowerCase();
    return n.includes(searchQuery.toLowerCase());
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Gruppeninfo</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={20} color="#5A5450" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Gruppen-Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.groupAvatar}>
                {channel.avatar_url ? (
                  <Image source={{ uri: channel.avatar_url }} style={styles.groupAvatarImg} />
                ) : (
                  <Icon name="users" size={28} color="#C8A96E" />
                )}
              </View>

              {/* Name */}
              {editing ? (
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Gruppenname"
                  placeholderTextColor="#5A5450"
                />
              ) : (
                <Text style={styles.groupName}>{channel.name ?? 'Gruppe'}</Text>
              )}

              {/* Beschreibung */}
              {editing ? (
                <TextInput
                  style={[styles.nameInput, { marginTop: 6, height: 60, textAlignVertical: 'top' }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Beschreibung (optional)"
                  placeholderTextColor="#5A5450"
                  multiline
                />
              ) : channel.description ? (
                <Text style={styles.groupDesc}>{channel.description}</Text>
              ) : null}

              {/* Edit/Save Buttons */}
              {isAdmin && (
                <View style={styles.editBtnRow}>
                  {editing ? (
                    <>
                      <TouchableOpacity
                        style={styles.outlineBtn}
                        onPress={() => {
                          setEditing(false);
                          setName(channel.name ?? '');
                          setDescription(channel.description ?? '');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.outlineBtnText}>Abbrechen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.goldBtn, (saving || !name.trim()) && { opacity: 0.5 }]}
                        onPress={handleSave}
                        disabled={saving || !name.trim()}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.goldBtnText}>{saving ? 'Speichern ...' : 'Speichern'}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.outlineBtn}
                      onPress={() => setEditing(true)}
                      activeOpacity={0.7}
                    >
                      <Icon name="pencil" size={12} color="#C8A96E" />
                      <Text style={[styles.outlineBtnText, { color: '#C8A96E' }]}>Bearbeiten</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Mitglieder */}
            <Text style={styles.sectionLabel}>Mitglieder ({channel.members.length})</Text>

            {channel.members.map((member) => {
              const profile = member.profile;
              const memberName = profile.display_name ?? profile.username ?? 'Anonym';
              const initial = memberName.slice(0, 1).toUpperCase();
              const isSelf = member.user_id === currentUserId;

              return (
                <View key={member.user_id} style={styles.memberRow}>
                  {/* Avatar */}
                  <View style={styles.memberAvatar}>
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.memberAvatarImg} />
                    ) : (
                      <Text style={styles.memberAvatarText}>{initial}</Text>
                    )}
                  </View>

                  {/* Name + Rolle */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {memberName}
                        {isSelf && <Text style={{ color: '#5A5450' }}> (Du)</Text>}
                      </Text>
                      {member.role === 'admin' && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    {profile.username && (
                      <Text style={styles.memberUsername}>@{profile.username}</Text>
                    )}
                  </View>

                  {/* Entfernen-Button */}
                  {isAdmin && !isSelf && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member.user_id)}
                      disabled={removingUserId === member.user_id}
                      style={{ padding: 4, opacity: removingUserId === member.user_id ? 0.3 : 1 }}
                    >
                      <Icon name="x" size={14} color="#5A5450" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Mitglied hinzufuegen */}
            {isAdmin && (
              <View style={{ marginTop: 8 }}>
                {!showAddMember ? (
                  <TouchableOpacity
                    style={styles.addMemberBtn}
                    onPress={() => setShowAddMember(true)}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={14} color="#C8A96E" />
                    <Text style={styles.addMemberBtnText}>Mitglied hinzufuegen</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.addMemberPanel}>
                    <View style={styles.addMemberHeader}>
                      <Text style={styles.addMemberTitle}>Kontakt hinzufuegen</Text>
                      <TouchableOpacity onPress={() => { setShowAddMember(false); setSearchQuery(''); }}>
                        <Icon name="x" size={14} color="#5A5450" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Suchen ..."
                      placeholderTextColor="#5A5450"
                    />

                    {loadingConnections ? (
                      <ActivityIndicator color="#C8A96E" style={{ marginVertical: 16 }} />
                    ) : filteredConnections.length === 0 ? (
                      <Text style={styles.emptyText}>
                        {searchQuery ? 'Kein Kontakt gefunden' : 'Alle Kontakte sind bereits Mitglied'}
                      </Text>
                    ) : (
                      filteredConnections.map((conn) => {
                        const p = conn.profile;
                        const n = p.display_name ?? p.username ?? 'Anonym';
                        return (
                          <TouchableOpacity
                            key={conn.id}
                            style={styles.addContactRow}
                            onPress={() => handleAddMember(p.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.addContactAvatar}>
                              {p.avatar_url ? (
                                <Image source={{ uri: p.avatar_url }} style={styles.addContactAvatarImg} />
                              ) : (
                                <Text style={styles.addContactAvatarText}>{n.slice(0, 1).toUpperCase()}</Text>
                              )}
                            </View>
                            <Text style={styles.addContactName} numberOfLines={1}>{n}</Text>
                            <Icon name="plus" size={14} color="#C8A96E" />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Divider */}
            <View style={[styles.divider, { marginTop: 16 }]} />

            {/* Gruppe verlassen */}
            <TouchableOpacity
              style={[styles.leaveBtn, leaving && { opacity: 0.5 }]}
              onPress={handleLeaveGroup}
              disabled={leaving}
              activeOpacity={0.7}
            >
              <Icon name="logout" size={14} color="#5A5450" />
              <Text style={styles.leaveBtnText}>
                {leaving ? 'Verlassen ...' : 'Gruppe verlassen'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#1E1C26',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#F0EDE8',
  },
  body: {
    paddingHorizontal: 20,
  },

  // Gruppen-Avatar + Name
  avatarContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  groupAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(200,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupAvatarImg: { width: 64, height: 64, borderRadius: 32 },
  groupName: {
    fontSize: 20,
    fontWeight: '500',
    color: '#F0EDE8',
    textAlign: 'center',
  },
  groupDesc: {
    fontSize: 13,
    color: '#5A5450',
    textAlign: 'center',
    marginTop: 4,
  },
  nameInput: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8,
    color: '#F0EDE8',
    fontSize: 14,
    textAlign: 'center',
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
  },
  outlineBtnText: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5A5450',
  },
  goldBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#C8A96E',
  },
  goldBtnText: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#1A1A1A',
    fontWeight: '600',
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,169,110,0.06)',
    marginVertical: 12,
  },

  // Mitglieder
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#5A5450',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(200,169,110,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  memberAvatarText: { fontSize: 13, color: '#C8A96E' },
  memberName: {
    fontSize: 14,
    color: '#F0EDE8',
    flex: 1,
  },
  memberUsername: {
    fontSize: 10,
    color: '#5A5450',
    marginTop: 1,
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(200,169,110,0.12)',
  },
  adminBadgeText: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#C8A96E',
  },

  // Mitglied hinzufuegen
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
  },
  addMemberBtnText: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#C8A96E',
  },
  addMemberPanel: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.06)',
    borderRadius: 14,
    padding: 12,
  },
  addMemberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addMemberTitle: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5A5450',
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8,
    color: '#F0EDE8',
    fontSize: 13,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 11,
    color: '#5A5450',
    textAlign: 'center',
    paddingVertical: 12,
  },
  addContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  addContactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addContactAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  addContactAvatarText: { fontSize: 11, color: '#C8A96E' },
  addContactName: {
    flex: 1,
    fontSize: 13,
    color: '#F0EDE8',
  },

  // Gruppe verlassen
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    marginBottom: 16,
  },
  leaveBtnText: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5A5450',
  },
});
