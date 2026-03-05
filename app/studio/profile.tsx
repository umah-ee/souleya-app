import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../../components/Icon';
import { fetchMentorProfile, updateMentorProfile } from '../../lib/studio';
import type { MentorProfile, UpdateMentorProfileData } from '../../types/studio';

const SPECIALIZATION_SUGGESTIONS = [
  'Yoga', 'Meditation', 'Breathwork', 'Achtsamkeit', 'Kakao-Zeremonie',
  'Sound Healing', 'Tantra', 'Ayurveda', 'Schamanismus', 'Astrologie',
  'Reiki', 'Qigong', 'Pilates', 'Ernaehrung', 'Coaching',
  'Tarot', 'Naturverbindung', 'Tanz', 'Journaling', 'Kreativitaet',
];

const SOCIAL_PLATFORMS: { key: string; label: string; placeholder: string; icon: IconName }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: '@deinname', icon: 'brand-instagram' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/...', icon: 'brand-youtube' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@deinname', icon: 'brand-tiktok' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/...', icon: 'brand-linkedin' },
];

export default function StudioProfileScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState<UpdateMentorProfileData>({
    mentor_bio: '',
    mentor_tagline: '',
    specializations: [],
    mentor_website: '',
    mentor_social: {},
  });

  useEffect(() => {
    fetchMentorProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          mentor_bio: p.mentor_bio ?? '',
          mentor_tagline: p.mentor_tagline ?? '',
          specializations: p.specializations ?? [],
          mentor_website: p.mentor_website ?? '',
          mentor_social: p.mentor_social ?? {},
        });
      })
      .catch(() => Alert.alert('Fehler', 'Profil konnte nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await updateMentorProfile(form);
      setProfile(updated);
      Alert.alert('Gespeichert', 'Dein Mentor-Profil wurde aktualisiert.');
    } catch {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }, [form]);

  const addSpecialization = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || (form.specializations ?? []).includes(trimmed)) return;
    setForm((f) => ({ ...f, specializations: [...(f.specializations ?? []), trimmed] }));
    setTagInput('');
  }, [form.specializations]);

  const removeSpecialization = useCallback((tag: string) => {
    setForm((f) => ({ ...f, specializations: (f.specializations ?? []).filter((t) => t !== tag) }));
  }, []);

  const updateSocial = useCallback((key: string, value: string) => {
    setForm((f) => ({ ...f, mentor_social: { ...(f.mentor_social ?? {}), [key]: value } }));
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgSolid }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >

      {/* Profilinfo-Card */}
      {profile && (
        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.glass, borderColor: colors.gold }]}>
              <Icon name="user" size={24} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.textH }]}>
                {profile.display_name || profile.username || 'Unbenannt'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSec }]}>
                {profile.email}
              </Text>
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Name, Avatar und E-Mail werden ueber dein allgemeines Profil bearbeitet.
          </Text>
        </View>
      )}

      {/* Tagline */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TAGLINE</Text>
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <TextInput
          value={form.mentor_tagline ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, mentor_tagline: v }))}
          placeholder="z.B. Yoga-Lehrerin & Achtsamkeits-Coach"
          placeholderTextColor={colors.textMuted}
          maxLength={120}
          style={[styles.input, { color: colors.textH, borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
        />
        <Text style={[styles.charCount, { color: colors.textMuted }]}>
          {(form.mentor_tagline ?? '').length}/120
        </Text>
      </View>

      {/* Bio */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MENTOR BIO</Text>
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <TextInput
          value={form.mentor_bio ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, mentor_bio: v }))}
          placeholder="Erzaehle ueber dich, deine Erfahrung und deine Philosophie..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          textAlignVertical="top"
          style={[
            styles.input, styles.textArea,
            { color: colors.textH, borderColor: colors.glassBorder, backgroundColor: colors.glass },
          ]}
        />
        <Text style={[styles.charCount, { color: colors.textMuted }]}>
          {(form.mentor_bio ?? '').length}/2000
        </Text>
      </View>

      {/* Spezialisierungen */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SPEZIALISIERUNGEN</Text>
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>

        {/* Aktive Tags */}
        {(form.specializations ?? []).length > 0 && (
          <View style={styles.tagRow}>
            {(form.specializations ?? []).map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.activeTag, { backgroundColor: colors.gold }]}
                onPress={() => removeSpecialization(tag)}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>{tag}</Text>
                <Icon name="x" size={12} color="#1a1a1a" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={styles.tagInputRow}>
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={() => addSpecialization(tagInput)}
            placeholder="Spezialisierung eingeben..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={[
              styles.input, { flex: 1, color: colors.textH, borderColor: colors.glassBorder, backgroundColor: colors.glass },
            ]}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: tagInput.trim() ? colors.gold : colors.glass }]}
            onPress={() => addSpecialization(tagInput)}
            disabled={!tagInput.trim()}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={16} color={tagInput.trim() ? '#1a1a1a' : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Vorschlaege */}
        <View style={styles.tagRow}>
          {SPECIALIZATION_SUGGESTIONS
            .filter((s) => !(form.specializations ?? []).includes(s))
            .map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.suggestionTag, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                onPress={() => addSpecialization(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionTagText, { color: colors.textSec }]}>+ {s}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>

      {/* Website */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WEBSITE</Text>
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={styles.iconInputRow}>
          <Icon name="world" size={18} color={colors.textMuted} />
          <TextInput
            value={form.mentor_website ?? ''}
            onChangeText={(v) => setForm((f) => ({ ...f, mentor_website: v }))}
            placeholder="https://deine-website.de"
            placeholderTextColor={colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
            style={[
              styles.input, { flex: 1, color: colors.textH, borderColor: colors.glassBorder, backgroundColor: colors.glass },
            ]}
          />
        </View>
      </View>

      {/* Social Links */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SOCIAL MEDIA</Text>
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        {SOCIAL_PLATFORMS.map((platform, i) => (
          <View
            key={platform.key}
            style={[
              styles.socialRow,
              i < SOCIAL_PLATFORMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.dividerL },
            ]}
          >
            <Text style={[styles.socialLabel, { color: colors.textSec }]}>{platform.label}</Text>
            <TextInput
              value={(form.mentor_social ?? {})[platform.key] ?? ''}
              onChangeText={(v) => updateSocial(platform.key, v)}
              placeholder={platform.placeholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[
                styles.socialInput,
                { color: colors.textH, borderColor: colors.glassBorder, backgroundColor: colors.glass },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Speichern */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.gold, opacity: saving ? 0.6 : 1 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator color="#1a1a1a" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Profil speichern</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },

  profileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 16, fontWeight: '500' },
  profileEmail: { fontSize: 12, marginTop: 2 },
  hint: { fontSize: 11, fontStyle: 'italic' },

  sectionLabel: {
    fontSize: 9, letterSpacing: 2.5, marginBottom: 8, marginTop: 4,
  },

  input: {
    padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 14,
  },
  textArea: {
    minHeight: 120, textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 10, textAlign: 'right', marginTop: 4,
  },

  tagRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10,
  },
  activeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999,
  },
  activeTagText: {
    fontSize: 11, fontWeight: '500', color: '#1a1a1a',
  },
  suggestionTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, borderWidth: 1,
  },
  suggestionTagText: {
    fontSize: 11,
  },
  tagInputRow: {
    flexDirection: 'row', gap: 8, marginBottom: 10,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  iconInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },

  socialRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
  },
  socialLabel: {
    fontSize: 12, fontWeight: '500', width: 80,
  },
  socialInput: {
    flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, fontSize: 13,
  },

  saveBtn: {
    padding: 16, borderRadius: 9999, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: {
    fontSize: 14, fontWeight: '500', color: '#1a1a1a',
  },
});
