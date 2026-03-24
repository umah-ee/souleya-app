/**
 * StepAvatar – Profilbild hochladen (expo-image-picker)
 * Speichert sofort via uploadAvatar + PATCH /users/me
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '../../../store/theme';
import { uploadAvatar, updateProfile } from '../../../lib/profile';
import { Icon } from '../../Icon';

const GOLD = '#C8A96E';

interface Props {
  currentAvatarUrl?: string | null;
  onComplete: (avatarUrl?: string) => void;
  onBack: () => void;
  isFirst: boolean;
}

export default function StepAvatar({ currentAvatarUrl, onComplete, onBack, isFirst }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPreview(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    setError('');
    try {
      // If the preview is a local URI (new image), upload it
      if (preview.startsWith('file://') || preview.startsWith('content://')) {
        const ext = preview.split('.').pop() ?? 'jpg';
        const publicUrl = await uploadAvatar({
          uri: preview,
          name: `avatar.${ext}`,
          type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        });
        await updateProfile({ avatar_url: publicUrl });
        onComplete(publicUrl);
      } else {
        // Already a remote URL (unchanged avatar)
        onComplete(preview);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {/* Preview */}
      <TouchableOpacity onPress={pickImage} style={styles.previewWrap} activeOpacity={0.8}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.previewImage} />
        ) : (
          <View style={[styles.previewPlaceholder, { backgroundColor: `${GOLD}12`, borderColor: `${GOLD}30` }]}>
            <Icon name="camera" size={32} color={colors.textMuted} />
            <Text style={[styles.previewText, { color: colors.textMuted }]}>Bild auswaehlen</Text>
          </View>
        )}
        {/* Overlay icon */}
        {preview && (
          <View style={styles.editBadge}>
            <Icon name="camera" size={14} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

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
          style={[styles.nextBtn, { opacity: preview && !saving ? 1 : 0.4 }]}
          onPress={handleSave}
          disabled={!preview || saving}
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
  previewWrap: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  previewText: {
    fontSize: 11,
    marginTop: 4,
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: 12,
    color: '#E57373',
    textAlign: 'center',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
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
