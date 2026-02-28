import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, Pressable, ScrollView, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import type { ChannelMember } from '../../types/chat';
import { transferSeeds } from '../../lib/chat';
import { Icon } from '../Icon';

const QUICK_AMOUNTS = [10, 25, 50, 100];

interface Props {
  visible: boolean;
  channelId: string;
  channelType: string;
  members: ChannelMember[];
  currentUserId: string;
  onClose: () => void;
  onSent: () => void;
}

export default function SeedsTransferModal({
  visible, channelId, channelType, members, currentUserId,
  onClose, onSent,
}: Props) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const isDirect = channelType === 'direct';
  const otherMembers = members.filter((m) => m.user_id !== currentUserId);
  const recipientId = isDirect ? otherMembers[0]?.user_id : toUserId;

  const numAmount = parseInt(amount, 10) || 0;
  const canSend = numAmount >= 1 && !sending && (isDirect || recipientId);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      await transferSeeds(channelId, {
        amount: numAmount,
        message: message.trim() || undefined,
        to_user_id: isDirect ? undefined : recipientId,
      });
      // Reset
      setAmount('');
      setMessage('');
      setToUserId('');
      onSent();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transfer fehlgeschlagen';
      setError(msg.includes('Nicht genug') ? 'Nicht genug Seeds' : msg);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setMessage('');
    setToUserId('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Seeds senden</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="x" size={20} color="#5A5450" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Betrag */}
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => { setAmount(v.replace(/[^0-9]/g, '')); setError(''); }}
                placeholder="0"
                placeholderTextColor="rgba(200,169,110,0.3)"
                keyboardType="number-pad"
                maxLength={5}
                autoFocus
              />
              <Text style={styles.amountLabel}>Seeds</Text>
            </View>

            {/* Quick-Buttons */}
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickBtn, numAmount === q && styles.quickBtnActive]}
                  onPress={() => { setAmount(String(q)); setError(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickBtnText, numAmount === q && styles.quickBtnTextActive]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Empfaenger (nur bei Gruppen) */}
            {!isDirect && (
              <View style={styles.recipientSection}>
                <Text style={styles.sectionLabel}>Empfaenger</Text>
                <ScrollView style={styles.recipientList} nestedScrollEnabled>
                  {otherMembers.map((m) => {
                    const name = m.profile.display_name ?? m.profile.username ?? 'Anonym';
                    const initial = name.slice(0, 1).toUpperCase();
                    const isSelected = toUserId === m.user_id;

                    return (
                      <TouchableOpacity
                        key={m.user_id}
                        style={[styles.recipientRow, isSelected && styles.recipientRowActive]}
                        onPress={() => setToUserId(m.user_id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.recipientAvatar}>
                          {m.profile.avatar_url ? (
                            <Image source={{ uri: m.profile.avatar_url }} style={styles.recipientAvatarImg} />
                          ) : (
                            <Text style={styles.recipientAvatarText}>{initial}</Text>
                          )}
                        </View>
                        <Text style={styles.recipientName} numberOfLines={1}>{name}</Text>
                        {isSelected && <Icon name="check" size={14} color="#C8A96E" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Nachricht (optional) */}
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Nachricht (optional)"
              placeholderTextColor="#5A5450"
              maxLength={200}
            />

            {/* Fehler */}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !canSend && styles.submitBtnDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <Text style={[styles.submitBtnText, !canSend && { color: '#5A5450' }]}>
                  {numAmount > 0 ? `${numAmount} Seeds senden` : 'Seeds senden'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    maxHeight: '85%',
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
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#C8A96E',
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '400',
    color: '#C8A96E',
    textAlign: 'center',
    minWidth: 100,
  },
  amountLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#5A5450',
    marginTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  quickBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickBtnActive: {
    backgroundColor: 'rgba(200,169,110,0.15)',
    borderColor: 'rgba(200,169,110,0.3)',
  },
  quickBtnText: {
    fontSize: 13,
    color: '#5A5450',
  },
  quickBtnTextActive: {
    color: '#C8A96E',
  },
  recipientSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#5A5450',
    marginBottom: 8,
  },
  recipientList: {
    maxHeight: 120,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  recipientRowActive: {
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderColor: 'rgba(200,169,110,0.2)',
  },
  recipientAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recipientAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  recipientAvatarText: { fontSize: 11, color: '#C8A96E' },
  recipientName: {
    flex: 1,
    fontSize: 13,
    color: '#F0EDE8',
  },
  messageInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8,
    color: '#F0EDE8',
    fontSize: 14,
    marginBottom: 12,
  },
  error: {
    fontSize: 12,
    color: '#E05A5A',
    textAlign: 'center',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.15)',
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#5A5450',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#C8A96E',
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(200,169,110,0.2)',
  },
  submitBtnText: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
