import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { updateProfile, uploadAvatar, uploadBanner } from '../../lib/profile';
import { geocodeLocation } from '../../lib/events';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';
import type { Profile } from '../../types/profile';
import BottomPanel from './BottomPanel';

const INTEREST_SUGGESTIONS = [
  'Achtsamkeit', 'Yoga', 'Meditation', 'Breathwork', 'Kakao-Zeremonie',
  'Sound Healing', 'Naturverbindung', 'Tantra', 'Ayurveda', 'Schamanismus',
  'Astrologie', 'Tarot', 'Reiki', 'Qigong', 'Pilates',
  'Ernaehrung', 'Journaling', 'Kreativitaet', 'Tanz', 'Philosophie',
];
const MAX_INTERESTS = 10;

interface EditProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onProfileUpdated: (updated: Profile) => void;
}

export default function EditProfilePanel({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}: EditProfilePanelProps) {
  const colors = useThemeStore((s) => s.colors);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    interests: [] as string[],
  });

  // Reset form when panel opens
  useEffect(() => {
    if (isOpen && profile) {
      setForm({
        display_name: profile.display_name ?? '',
        username: profile.username ?? '',
        bio: profile.bio ?? '',
        location: profile.location ?? '',
        location_lat: profile.location_lat,
        location_lng: profile.location_lng,
        interests: profile.interests ?? [],
      });
      setError('');
      setSuccess('');
      setTagInput('');
    }
  }, [isOpen, profile]);

  // ── GPS ──
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Standort-Berechtigung wurde verweigert');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const { latitude, longitude } = loc.coords;
      const res = await geocodeLocation(`${longitude},${latitude}`, 'reverse');
      if (res.results.length > 0) {
        const place = res.results[0];
        setForm((f) => ({
          ...f,
          location: place.place_name.split(',').slice(0, 2).join(',').trim(),
          location_lat: place.lat,
          location_lng: place.lng,
        }));
        setSuccess('Standort erkannt');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Standort konnte nicht aufgeloest werden');
      }
    } catch {
      setError('Standorterkennung fehlgeschlagen');
    } finally {
      setDetectingLocation(false);
    }
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateProfile({
        display_name: form.display_name || undefined,
        username: form.username || undefined,
        bio: form.bio || undefined,
        location: form.location || undefined,
        location_lat: form.location_lat ?? undefined,
        location_lng: form.location_lng ?? undefined,
        interests: form.interests,
      });
      onProfileUpdated(updated);
      setSuccess('Profil gespeichert');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar Upload ──
  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      setError('Bild darf maximal 5 MB gross sein');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const avatarUrl = await uploadAvatar({
        uri: asset.uri,
        name: `avatar.${ext}`,
        type: asset.mimeType ?? `image/${ext}`,
      });
      const updated = await updateProfile({ avatar_url: avatarUrl });
      onProfileUpdated(updated);
      setSuccess('Avatar aktualisiert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  // ── Banner Upload ──
  const handleBannerPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      setError('Banner darf maximal 10 MB gross sein');
      return;
    }
    setUploadingBanner(true);
    setError('');
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const bannerUrl = await uploadBanner({
        uri: asset.uri,
        name: `banner.${ext}`,
        type: asset.mimeType ?? `image/${ext}`,
      });
      const updated = await updateProfile({ banner_url: bannerUrl });
      onProfileUpdated(updated);
      setSuccess('Banner aktualisiert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
    } finally {
      setUploadingBanner(false);
    }
  };

  // ── Interests ──
  const addInterest = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || form.interests.length >= MAX_INTERESTS) return;
    if (form.interests.includes(trimmed)) return;
    setForm((f) => ({ ...f, interests: [...f.interests, trimmed] }));
    setTagInput('');
  };

  const removeInterest = (tag: string) => {
    setForm((f) => ({ ...f, interests: f.interests.filter((t) => t !== tag) }));
  };

  const unusedSuggestions = INTEREST_SUGGESTIONS.filter(
    (s) => !form.interests.includes(s),
  ).slice(0, 8);

  return (
    <BottomPanel isOpen={isOpen} onClose={onClose} title="Profil bearbeiten">
      {/* Messages */}
      {success ? (
        <View style={[styles.msgBanner, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}44` }]}>
          <Text style={[styles.msgText, { color: colors.success }]}>{success}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.msgBanner, { backgroundColor: `${colors.error}18`, borderColor: `${colors.error}44` }]}>
          <Text style={[styles.msgText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      {/* Avatar + Banner Upload */}
      <View style={styles.uploadRow}>
        <TouchableOpacity onPress={handleAvatarPick} activeOpacity={0.7} style={styles.uploadItem}>
          <View style={[styles.uploadCircle, { borderColor: colors.goldBorderS }]}>
            {uploading ? (
              <ActivityIndicator color={colors.gold} size="small" />
            ) : profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.uploadCircleImg} />
            ) : (
              <Icon name="camera" size={20} color={colors.textMuted} />
            )}
          </View>
          <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>Avatar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBannerPick} activeOpacity={0.7} style={styles.uploadItem}>
          <View style={[styles.uploadRect, { borderColor: colors.goldBorderS, backgroundColor: colors.glass }]}>
            {uploadingBanner ? (
              <ActivityIndicator color={colors.gold} size="small" />
            ) : profile.banner_url ? (
              <Image source={{ uri: profile.banner_url }} style={styles.uploadRectImg} />
            ) : (
              <Icon name="photo" size={20} color={colors.textMuted} />
            )}
          </View>
          <Text style={[styles.uploadLabel, { color: colors.textMuted }]}>Banner</Text>
        </TouchableOpacity>
      </View>

      {/* Name + Username */}
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NAME</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
        value={form.display_name}
        onChangeText={(v) => setForm((f) => ({ ...f, display_name: v }))}
        placeholder="Anzeigename"
        placeholderTextColor={colors.textMuted}
        maxLength={60}
      />

      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>USERNAME</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Text style={[styles.atSign, { color: colors.textMuted }]}>@</Text>
        <TextInput
          style={[styles.inputInner, { color: colors.textH }]}
          value={form.username}
          onChangeText={(v) => setForm((f) => ({ ...f, username: v.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
          placeholder="username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          maxLength={30}
        />
      </View>

      {/* Bio */}
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>BIO</Text>
      <TextInput
        style={[styles.input, styles.bioInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
        value={form.bio}
        onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
        placeholder="Ueber dich ..."
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={300}
      />

      {/* Location */}
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ORT</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Icon name="map-pin" size={14} color={colors.gold} />
        <TextInput
          style={[styles.inputInner, { color: colors.textH }]}
          value={form.location}
          onChangeText={(v) => setForm((f) => ({ ...f, location: v, location_lat: null, location_lng: null }))}
          placeholder="Ort (z.B. Muenchen)"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
        />
        <TouchableOpacity onPress={handleDetectLocation} disabled={detectingLocation} activeOpacity={0.7} style={{ padding: 4 }}>
          {detectingLocation ? (
            <ActivityIndicator color={colors.gold} size="small" />
          ) : (
            <Icon name="current-location" size={16} color={colors.gold} />
          )}
        </TouchableOpacity>
      </View>
      {form.location_lat && (
        <Text style={[styles.locationHint, { color: colors.textMuted }]}>Standort gesetzt</Text>
      )}

      {/* Interests */}
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
        INTERESSEN ({form.interests.length}/{MAX_INTERESTS})
      </Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
        <Icon name="tag" size={14} color={colors.gold} />
        <TextInput
          style={[styles.inputInner, { color: colors.textH }]}
          value={tagInput}
          onChangeText={setTagInput}
          placeholder="Interesse eingeben ..."
          placeholderTextColor={colors.textMuted}
          maxLength={30}
          onSubmitEditing={() => addInterest(tagInput)}
          returnKeyType="done"
        />
        {tagInput.trim().length > 0 && form.interests.length < MAX_INTERESTS && (
          <TouchableOpacity onPress={() => addInterest(tagInput)} activeOpacity={0.7} style={{ padding: 4 }}>
            <Icon name="plus" size={16} color={colors.gold} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions */}
      {unusedSuggestions.length > 0 && form.interests.length < MAX_INTERESTS && (
        <View style={styles.suggestionsRow}>
          {unusedSuggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.suggestionChip, { borderColor: colors.goldBorderS }]}
              onPress={() => addInterest(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.suggestionText, { color: colors.textSec }]}>{s}</Text>
              <Icon name="plus" size={10} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Active Tags */}
      {form.interests.length > 0 && (
        <View style={styles.activeTags}>
          {form.interests.map((tag) => (
            <View key={tag} style={[styles.activeTag, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
              <Text style={[styles.activeTagText, { color: colors.goldDeep }]}>{tag}</Text>
              <TouchableOpacity onPress={() => removeInterest(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="x" size={10} color={colors.goldDeep} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Save + Cancel */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.gold }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.textOnGold} size="small" />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.textOnGold }]}>SPEICHERN</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.divider }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>ABBRECHEN</Text>
        </TouchableOpacity>
      </View>
    </BottomPanel>
  );
}

const styles = StyleSheet.create({
  msgBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  msgText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    justifyContent: 'center',
  },
  uploadItem: {
    alignItems: 'center',
    gap: 6,
  },
  uploadCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadCircleImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  uploadRect: {
    width: 100,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadRectImg: {
    width: 100,
    height: 56,
    borderRadius: 12,
  },
  uploadLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  inputInner: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 10,
  },
  atSign: {
    fontSize: 14,
    fontWeight: '500',
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 28,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
