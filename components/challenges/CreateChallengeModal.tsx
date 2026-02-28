import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';
import { createChallenge } from '../../lib/challenges';
import type { Challenge, CreateChallengeData } from '../../types/challenges';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (challenge: Challenge) => void;
  channelId?: string;
}

const EMOJI_PRESETS = [
  '\uD83E\uDDD8', '\uD83C\uDFC3', '\uD83D\uDCAA', '\uD83C\uDF3F', '\uD83D\uDCD6',
  '\u270D\uFE0F', '\uD83E\uDDE0', '\uD83D\uDCA4', '\uD83E\uDD57', '\uD83C\uDFAF',
  '\uD83D\uDD25', '\uD83D\uDD4A\uFE0F', '\uD83D\uDC9B', '\u2728', '\uD83C\uDF0A',
  '\uD83E\uDEC1',
];

const DURATION_PRESETS = [7, 14, 21, 30, 90];

export default function CreateChallengeModal({ visible, onClose, onCreated, channelId }: Props) {
  const colors = useThemeStore((s) => s.colors);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_PRESETS[0]);
  const [durationDays, setDurationDays] = useState(21);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset bei Schliessen
  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setSelectedEmoji(EMOJI_PRESETS[0]);
      setDurationDays(21);
      setError('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) {
      setError('Bitte gib einen Titel ein.');
      return;
    }
    if (title.trim().length > 200) {
      setError('Der Titel darf maximal 200 Zeichen lang sein.');
      return;
    }

    const data: CreateChallengeData = {
      title: title.trim(),
      description: description.trim() || undefined,
      emoji: selectedEmoji,
      duration_days: durationDays,
      channel_id: channelId,
    };

    setSaving(true);
    try {
      const challenge = await createChallenge(data);
      onCreated(challenge);
      onClose();
    } catch (e) {
      console.error(e);
      setError('Challenge konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = title.trim().length > 0 && !saving;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.bgGradientStart, borderColor: colors.goldBorderS }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.goldBorderS }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.goldDeep }]}>NEUE CHALLENGE</Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.glass }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Icon name="x" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollbarer Inhalt */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Titel */}
            <Text style={[styles.label, { color: colors.textMuted }]}>TITEL *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.goldBorderS, color: colors.textH }]}
              value={title}
              onChangeText={setTitle}
              placeholder="z.B. 21 Tage Meditation"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
              autoFocus
            />

            {/* Beschreibung */}
            <Text style={[styles.label, { color: colors.textMuted }]}>BESCHREIBUNG</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.glass, borderColor: colors.goldBorderS, color: colors.textH }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Was ist das Ziel dieser Challenge?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={3000}
              textAlignVertical="top"
            />

            {/* Emoji-Auswahl */}
            <Text style={[styles.label, { color: colors.textMuted }]}>EMOJI</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_PRESETS.map((emoji) => {
                const isSelected = selectedEmoji === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiBtn,
                      { borderColor: 'transparent' },
                      isSelected && { backgroundColor: colors.goldBg, borderColor: colors.gold },
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiBtnText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dauer */}
            <Text style={[styles.label, { color: colors.textMuted }]}>DAUER</Text>
            <View style={styles.durationRow}>
              {DURATION_PRESETS.map((d) => {
                const isSelected = durationDays === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durationBtn,
                      { borderColor: colors.glassBorder, backgroundColor: colors.glass },
                      isSelected && { backgroundColor: colors.gold, borderColor: colors.gold },
                    ]}
                    onPress={() => setDurationDays(d)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.durationBtnText,
                        { color: colors.textMuted },
                        isSelected && { color: colors.textOnGold },
                      ]}
                    >
                      {d} Tage
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Fehler */}
            {error !== '' && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.gold },
                !canSubmit && { opacity: 0.35 },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textOnGold} />
              ) : (
                <Text style={[styles.submitBtnText, { color: colors.textOnGold }]}>CHALLENGE STARTEN</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '600',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 4,
  },
  label: {
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '400',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },

  // ── Emoji Grid ──────────────────────────────────────────
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnText: {
    fontSize: 22,
  },

  // ── Duration Row ────────────────────────────────────────
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Error + Submit ──────────────────────────────────────
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
  },
});
