import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { createEventReview, updateEventReview } from '../../lib/progression';
import type { EventReview } from '../../lib/progression';

interface Props {
  eventId: string;
  existingReview?: EventReview | null;
  onSaved: (review: EventReview) => void;
  onCancel: () => void;
}

export default function EventReviewForm({ eventId, existingReview, onSaved, onCancel }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Bitte wähle eine Bewertung');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const review = existingReview
        ? await updateEventReview(eventId, rating, comment.trim() || undefined)
        : await createEventReview(eventId, rating, comment.trim() || undefined);
      onSaved(review);
    } catch (e: any) {
      setError(e.message || 'Das hat leider nicht geklappt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.dividerL }]}>
      <Text style={[styles.title, { color: colors.textH }]}>
        {existingReview ? 'Bewertung bearbeiten' : 'Wie war das Event?'}
      </Text>

      {/* Star Rating */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
            <Text style={{ fontSize: 32, color: star <= rating ? colors.gold : `${colors.textMuted}40` }}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Comment */}
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
        value={comment}
        onChangeText={setComment}
        placeholder="Dein Kommentar (optional) …"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={2000}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: colors.gold }]}
          disabled={saving || rating === 0}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#1A1A1A" />
          ) : (
            <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '600' }}>
              {existingReview ? 'Aktualisieren' : 'Bewerten'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#E05A5A',
    fontSize: 12,
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
});
