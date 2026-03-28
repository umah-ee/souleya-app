import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Pressable,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../Icon';
import { createChallenge } from '../../lib/challenges';
import type { Challenge, CreateChallengeData } from '../../types/challenges';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (challenge: Challenge) => void;
  channelId?: string;
}

const PRESET_ICONS: IconName[] = [
  'target', 'flame', 'heart', 'star', 'sparkles',
  'moon', 'sun', 'seedling', 'pencil', 'trophy',
  'circle-check', 'compass', 'users', 'book', 'run', 'droplet',
];

const DURATION_PRESETS = [7, 14, 21, 30, 90];

export default function CreateChallengeModal({ visible, onClose, onCreated, channelId }: Props) {
  const colors = useThemeStore((s) => s.colors);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<IconName>('target');
  const [durationDays, setDurationDays] = useState(21);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setSelectedIcon('target');
      setDurationDays(21);
      setError('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }
    if (title.trim().length > 200) { setError('Der Titel darf maximal 200 Zeichen lang sein.'); return; }

    const data: CreateChallengeData = {
      title: title.trim(),
      description: description.trim() || undefined,
      emoji: selectedIcon,
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

  // Exaktes Layout-Pattern wie CreatePollModal (funktioniert)
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Pressable style={[styles.content, { backgroundColor: colors.bgGradientStart || colors.bgSolid }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.goldBorderS || 'rgba(200,169,110,0.3)' }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.goldDeep || colors.gold }]}>NEUE CHALLENGE</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Titel */}
            <Text style={[styles.label, { color: colors.textMuted }]}>TITEL *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.goldBorderS, color: colors.textH }]}
              value={title}
              onChangeText={setTitle}
              placeholder="z.B. 21 Tage Meditation"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
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

            {/* Icon-Auswahl */}
            <Text style={[styles.label, { color: colors.textMuted }]}>ICON</Text>
            <View style={styles.emojiGrid}>
              {PRESET_ICONS.map((icon) => {
                const isSelected = selectedIcon === icon;
                return (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.emojiBtn,
                      { borderColor: 'transparent', backgroundColor: colors.glass },
                      isSelected && { backgroundColor: colors.goldBg, borderColor: colors.gold },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                    activeOpacity={0.7}
                  >
                    <Icon name={icon} size={22} color={isSelected ? colors.gold : colors.textMuted} />
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

            {error !== '' && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.gold }, !canSubmit && { opacity: 0.35 }]}
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

            <View style={{ height: 20 }} />
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Exakt wie CreatePollModal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  label: {
    fontSize: 9, letterSpacing: 2,
    marginTop: 12, marginBottom: 4, fontWeight: '500',
  },
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '400',
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 99,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  durationBtnText: { fontSize: 12, fontWeight: '500' },
  errorText: { fontSize: 12, marginTop: 8 },
  submitBtn: {
    marginTop: 20, paddingVertical: 14, borderRadius: 99,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { fontSize: 10, letterSpacing: 3, fontWeight: '600' },
});
