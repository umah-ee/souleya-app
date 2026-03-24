/**
 * StepBio – Bio-Text eingeben (min 10, max 300 Zeichen)
 * Speichert sofort via PATCH /users/me
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { updateProfile } from '../../../lib/profile';

const GOLD = '#C8A96E';
const MIN_BIO = 10;
const MAX_BIO = 300;

interface Props {
  currentBio?: string | null;
  onComplete: () => void;
  onBack: () => void;
  isFirst: boolean;
}

export default function StepBio({ currentBio, onComplete, onBack, isFirst }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [bio, setBio] = useState(currentBio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const charCount = bio.length;
  const isValid = charCount >= MIN_BIO && charCount <= MAX_BIO;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile({ bio: bio.trim() });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <TextInput
        value={bio}
        onChangeText={(t) => setBio(t.slice(0, MAX_BIO))}
        multiline
        numberOfLines={4}
        placeholder="Erzaehl ein bisschen ueber dich …"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.textBody,
          },
        ]}
        textAlignVertical="top"
      />

      {/* Char counter */}
      <View style={styles.counterRow}>
        <Text style={[styles.counter, { color: charCount < MIN_BIO ? '#E57373' : colors.textMuted }]}>
          {charCount} / {MAX_BIO}
        </Text>
        {charCount < MIN_BIO && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Noch {MIN_BIO - charCount} Zeichen
          </Text>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Buttons */}
      <View style={styles.buttons}>
        {!isFirst ? (
          <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
            <Text style={[styles.backText, { color: colors.textBody }]}>← Zurueck</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: isValid && !saving ? 1 : 0.4 }]}
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#1A1714" size="small" />
          ) : (
            <Text style={styles.nextBtnText}>Weiter →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 100,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  counter: {
    fontSize: 11,
  },
  hint: {
    fontSize: 11,
  },
  error: {
    fontSize: 12,
    color: '#E57373',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  backText: {
    fontSize: 12.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  nextBtnText: {
    color: '#1A1714',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
