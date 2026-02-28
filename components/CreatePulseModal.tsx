import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createPulse, uploadPulseImage } from '../lib/pulse';
import type { Pulse, CreatePulseData } from '../types/pulse';
import type { Challenge } from '../types/challenges';
import { useThemeStore } from '../store/theme';
import { Icon } from './Icon';
import CreateChallengeModal from './challenges/CreateChallengeModal';

const MAX_IMAGES = 10;

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (pulse: Pulse) => void;
  onChallengeCreated?: (challenge: Challenge) => void;
}

export default function CreatePulseModal({ visible, onClose, onCreated, onChallengeCreated }: Props) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ uri: string; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const maxLen = 1000;
  const colors = useThemeStore((s) => s.colors);

  const handlePickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Maximum erreicht', `Du kannst maximal ${MAX_IMAGES} Bilder hinzufuegen.`);
      return;
    }

    const remaining = MAX_IMAGES - images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        preview: asset.uri,
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if ((!content.trim() && images.length === 0) || loading) return;
    setLoading(true);

    try {
      // Bilder hochladen
      let imageUrls: string[] = [];
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          setUploadProgress(`Bilder werden hochgeladen... ${i + 1}/${images.length}`);
          const url = await uploadPulseImage(images[i].uri);
          imageUrls.push(url);
        }
        setUploadProgress('');
      }

      // Pulse erstellen
      const data: CreatePulseData = {};
      if (content.trim()) data.content = content.trim();
      if (imageUrls.length === 1) {
        data.image_url = imageUrls[0];
      }
      if (imageUrls.length > 0) {
        data.image_urls = imageUrls;
      }

      const pulse = await createPulse(data);
      setContent('');
      setImages([]);
      onCreated(pulse);
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Fehler', 'Pulse konnte nicht erstellt werden. Bitte versuche es erneut.');
    }
    setUploadProgress('');
    setLoading(false);
  };

  const canSubmit = (content.trim().length > 0 || images.length > 0) && !loading;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bgGradientStart, borderColor: colors.goldBorderS }]}>
          <View style={[styles.handle, { backgroundColor: colors.goldBorderS }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.goldDeep }]}>NEUER PULSE</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { color: colors.textH }]}
            value={content}
            onChangeText={setContent}
            placeholder="Teile einen Gedanken, eine Erfahrung ..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={maxLen}
            autoFocus
          />

          {/* Bild-Vorschau */}
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageScroll}
              contentContainerStyle={styles.imageScrollContent}
            >
              {images.map((img, i) => (
                <View key={i} style={styles.thumbContainer}>
                  <Image source={{ uri: img.preview }} style={styles.thumb} />
                  <TouchableOpacity
                    style={[styles.thumbRemove, { backgroundColor: colors.error }]}
                    onPress={() => handleRemoveImage(i)}
                    activeOpacity={0.7}
                  >
                    <Icon name="x" size={10} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Upload-Fortschritt */}
          {uploadProgress ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color={colors.gold} size="small" />
              <Text style={[styles.progressText, { color: colors.textMuted }]}>{uploadProgress}</Text>
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.dividerL }]}>
            <View style={styles.footerLeft}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}
                onPress={handlePickImages}
                activeOpacity={0.7}
              >
                <Icon name="photo" size={16} color={colors.gold} />
                {images.length > 0 && (
                  <Text style={[styles.photoBtnCount, { color: colors.gold }]}>
                    {images.length}/{MAX_IMAGES}
                  </Text>
                )}
              </TouchableOpacity>
              {/* Challenge Button */}
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                onPress={() => setShowChallengeModal(true)}
                activeOpacity={0.7}
              >
                <Icon name="target" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.counter, { color: colors.textMuted }]}>{content.length} / {maxLen}</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.gold }, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={colors.textOnGold} size="small" />
                : <Text style={[styles.submitText, { color: colors.textOnGold }]}>TEILEN</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Challenge Modal */}
      <CreateChallengeModal
        visible={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        onCreated={(challenge) => {
          setShowChallengeModal(false);
          onChallengeCreated?.(challenge);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#2C2A35',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    minHeight: 300,
    borderTopWidth: 1,
    borderColor: 'rgba(200,169,110,0.15)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(200,169,110,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: { fontSize: 10, letterSpacing: 4, color: '#A8894E' },
  input: {
    color: '#F0EDE8', fontSize: 15, lineHeight: 24,
    fontWeight: '400', minHeight: 120,
    textAlignVertical: 'top',
  },

  // Bild-Vorschau
  imageScroll: {
    marginTop: 8,
    maxHeight: 72,
  },
  imageScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  thumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Upload-Fortschritt
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressText: {
    fontSize: 11,
    color: '#5A5450',
  },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 16,
    paddingTop: 12, borderTopWidth: 1,
    borderTopColor: 'rgba(200,169,110,0.08)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(200,169,110,0.08)',
    borderColor: 'rgba(200,169,110,0.15)',
  },
  photoBtnCount: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#C8A96E',
    fontWeight: '500',
  },
  counter: { fontSize: 10, color: '#5A5450', letterSpacing: 1 },
  submitBtn: {
    paddingVertical: 10, paddingHorizontal: 24,
    backgroundColor: '#C8A96E', borderRadius: 99,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitText: { fontSize: 10, letterSpacing: 3, color: '#2C2A35', fontWeight: '600' },
});
