import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createPulse, uploadPulseImage } from '../lib/pulse';
import { geocodeLocation } from '../lib/events';
import type { Pulse, CreatePulseData } from '../types/pulse';
import type { Challenge } from '../types/challenges';
import { useThemeStore } from '../store/theme';
import { Icon } from './Icon';
import CreateChallengeModal from './challenges/CreateChallengeModal';

const MAX_IMAGES = 10;

type Visibility = 'public' | 'circle' | 'private';

interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

interface PollData {
  question: string;
  options: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (pulse: Pulse) => void;
  onChallengeCreated?: (challenge: Challenge) => void;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: string }[] = [
  { value: 'circle', label: 'Circle', icon: 'users' },
  { value: 'public', label: 'Alle', icon: 'world' },
  { value: 'private', label: 'Nur ich', icon: 'lock' },
];

export default function CreatePulseModal({ visible, onClose, onCreated, onChallengeCreated }: Props) {
  const colors = useThemeStore((s) => s.colors);

  // Basis
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const maxLen = 1000;

  // Sichtbarkeit
  const [visibility, setVisibility] = useState<Visibility>('circle');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  // Ort
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<LocationData[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Umfrage
  const [poll, setPoll] = useState<PollData | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Challenge
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // ── Bilder ──────────────────────────────────────────────────
  const handlePickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Maximum erreicht', `Du kannst maximal ${MAX_IMAGES} Bilder hinzufügen.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri }))].slice(0, MAX_IMAGES));
    }
  };

  // ── Standortsuche ────────────────────────────────────────────
  const handleLocationSearch = (query: string) => {
    setLocationSearch(query);
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    if (query.trim().length < 2) { setLocationResults([]); return; }
    locationDebounce.current = setTimeout(async () => {
      setSearchingLocation(true);
      try {
        const res = await geocodeLocation(query);
        setLocationResults(
          (res.results ?? []).map((r) => ({ name: r.place_name, lat: r.lat, lng: r.lng })),
        );
      } catch {
        setLocationResults([]);
      } finally {
        setSearchingLocation(false);
      }
    }, 400);
  };

  const selectLocation = (loc: LocationData) => {
    setLocation(loc);
    setShowLocationPicker(false);
    setLocationSearch('');
    setLocationResults([]);
  };

  // ── Umfrage ──────────────────────────────────────────────────
  const handleSavePoll = () => {
    const valid = pollOptions.filter((o) => o.trim().length > 0);
    if (pollQuestion.trim() && valid.length >= 2) {
      setPoll({ question: pollQuestion.trim(), options: valid });
      setShowPollCreator(false);
    }
  };

  const resetPollCreator = () => {
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if ((!content.trim() && images.length === 0) || loading) return;
    setLoading(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          setUploadProgress(`Bilder hochladen … ${i + 1}/${images.length}`);
          imageUrls.push(await uploadPulseImage(images[i].uri));
        }
        setUploadProgress('');
      }

      const data: CreatePulseData & { visibility?: Visibility } = {};
      if (content.trim()) data.content = content.trim();
      if (imageUrls.length > 0) { data.image_url = imageUrls[0]; data.image_urls = imageUrls; }
      if (location) { data.location_lat = location.lat; data.location_lng = location.lng; data.location_name = location.name; }
      if (poll) { data.poll = { question: poll.question, options: poll.options.map((label) => ({ label })) }; }
      data.visibility = visibility;

      const pulse = await createPulse(data);
      setContent(''); setImages([]); setLocation(null); setPoll(null);
      setPollQuestion(''); setPollOptions(['', '']);
      setShowLocationPicker(false); setShowPollCreator(false);
      setVisibility('circle');
      onCreated(pulse);
      onClose();
    } catch {
      Alert.alert('Fehler', 'Post konnte nicht erstellt werden. Bitte versuch es nochmal.');
    }
    setUploadProgress('');
    setLoading(false);
  };

  const canSubmit = (content.trim().length > 0 || images.length > 0) && !loading;
  const currentVisibility = VISIBILITY_OPTIONS.find((o) => o.value === visibility)!;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.bgGradientStart, borderColor: colors.goldBorderS }]}>
          <View style={[styles.handle, { backgroundColor: colors.goldBorderS }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.goldDeep }]}>NEUER PULSE</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Textarea */}
            <TextInput
              style={[styles.input, { color: colors.textH }]}
              value={content}
              onChangeText={setContent}
              placeholder="Teile einen Gedanken, eine Erfahrung …"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={maxLen}
              autoFocus
            />

            {/* Bild-Vorschau */}
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.imageScroll} contentContainerStyle={styles.imageScrollContent}>
                {images.map((img, i) => (
                  <View key={i} style={styles.thumbContainer}>
                    <Image source={{ uri: img.uri }} style={styles.thumb} />
                    <TouchableOpacity
                      style={[styles.thumbRemove, { backgroundColor: colors.error }]}
                      onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      activeOpacity={0.7}
                    >
                      <Icon name="x" size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Upload-Fortschritt */}
            {!!uploadProgress && (
              <View style={styles.progressRow}>
                <ActivityIndicator color={colors.gold} size="small" />
                <Text style={[styles.progressText, { color: colors.textMuted }]}>{uploadProgress}</Text>
              </View>
            )}

            {/* Ort-Vorschau */}
            {location && (
              <View style={[styles.chip, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}>
                <Icon name="map-pin" size={14} color={colors.gold} />
                <Text style={[styles.chipText, { color: colors.textH }]} numberOfLines={1}>{location.name}</Text>
                <TouchableOpacity onPress={() => setLocation(null)}>
                  <Icon name="x" size={12} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Ort-Suche */}
            {showLocationPicker && !location && (
              <View style={styles.pickerBox}>
                <TextInput
                  style={[styles.pickerInput, { color: colors.textH, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                  value={locationSearch}
                  onChangeText={handleLocationSearch}
                  placeholder="Ort suchen …"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                {searchingLocation && (
                  <ActivityIndicator color={colors.gold} size="small" style={{ marginTop: 8 }} />
                )}
                {locationResults.map((loc, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.locationResult, { borderColor: colors.dividerL }]}
                    onPress={() => selectLocation(loc)}
                    activeOpacity={0.7}
                  >
                    <Icon name="map-pin" size={12} color={colors.gold} />
                    <Text style={[styles.locationResultText, { color: colors.textH }]} numberOfLines={1}>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Umfrage-Vorschau */}
            {poll && (
              <View style={[styles.chip, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}>
                <Icon name="chart-bar" size={14} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chipLabel, { color: colors.gold }]}>UMFRAGE</Text>
                  <Text style={[styles.chipText, { color: colors.textH }]} numberOfLines={1}>{poll.question}</Text>
                </View>
                <TouchableOpacity onPress={() => setPoll(null)}>
                  <Icon name="x" size={12} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Umfrage-Creator */}
            {showPollCreator && !poll && (
              <View style={[styles.pickerBox, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <TextInput
                  style={[styles.pickerInput, { color: colors.textH, backgroundColor: colors.bgGradientStart, borderColor: colors.glassBorder }]}
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  placeholder="Frage …"
                  placeholderTextColor={colors.textMuted}
                  maxLength={300}
                />
                {pollOptions.map((opt, idx) => (
                  <View key={idx} style={styles.pollOptionRow}>
                    <TextInput
                      style={[styles.pollOptionInput, { color: colors.textH, backgroundColor: colors.bgGradientStart, borderColor: colors.glassBorder, flex: 1 }]}
                      value={opt}
                      onChangeText={(v) => { const next = [...pollOptions]; next[idx] = v; setPollOptions(next); }}
                      placeholder={`Option ${idx + 1}`}
                      placeholderTextColor={colors.textMuted}
                      maxLength={200}
                    />
                    {pollOptions.length > 2 && (
                      <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} style={{ marginLeft: 8 }}>
                        <Icon name="x" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <View style={styles.pollActions}>
                  {pollOptions.length < 10 && (
                    <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ''])}>
                      <Text style={[styles.pollAddOption, { color: colors.gold }]}>+ Option</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.pollBtns}>
                    <TouchableOpacity
                      style={[styles.pollCancelBtn, { borderColor: colors.divider }]}
                      onPress={resetPollCreator}
                    >
                      <Text style={[styles.pollCancelText, { color: colors.textMuted }]}>Abbrechen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pollSaveBtn, { backgroundColor: colors.gold }]}
                      onPress={handleSavePoll}
                      disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                    >
                      <Text style={[styles.pollSaveText, { color: colors.textOnGold }]}>Hinzufügen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.dividerL }]}>
            {/* Toolbar */}
            <View style={styles.toolbar}>
              {/* Bilder */}
              <TouchableOpacity
                style={[styles.toolBtn, images.length > 0 && { backgroundColor: colors.goldBg }]}
                onPress={() => { handlePickImages(); setShowLocationPicker(false); setShowPollCreator(false); }}
                activeOpacity={0.7}
              >
                <Icon name="photo" size={18} color={images.length > 0 ? colors.gold : colors.textMuted} />
                {images.length > 0 && (
                  <Text style={[styles.toolBadge, { color: colors.gold }]}>{images.length}</Text>
                )}
              </TouchableOpacity>

              {/* Ort */}
              <TouchableOpacity
                style={[styles.toolBtn, (showLocationPicker || location) && { backgroundColor: colors.goldBg }]}
                onPress={() => { setShowLocationPicker(!showLocationPicker); setShowPollCreator(false); }}
                activeOpacity={0.7}
              >
                <Icon name="map-pin" size={18} color={(showLocationPicker || location) ? colors.gold : colors.textMuted} />
              </TouchableOpacity>

              {/* Umfrage */}
              <TouchableOpacity
                style={[styles.toolBtn, (showPollCreator || poll) && { backgroundColor: colors.goldBg }]}
                onPress={() => { setShowPollCreator(!showPollCreator); setShowLocationPicker(false); }}
                activeOpacity={0.7}
              >
                <Icon name="chart-bar" size={18} color={(showPollCreator || poll) ? colors.gold : colors.textMuted} />
              </TouchableOpacity>

              {/* Challenge */}
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => setShowChallengeModal(true)}
                activeOpacity={0.7}
              >
                <Icon name="target" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.counter, { color: content.length > maxLen * 0.9 ? colors.error : colors.textMuted }]}>
                {content.length}/{maxLen}
              </Text>
            </View>

            {/* Sichtbarkeit + Teilen */}
            <View style={styles.actions}>
              {/* Sichtbarkeit */}
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={[styles.visibilityBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                  onPress={() => setShowVisibilityMenu(!showVisibilityMenu)}
                  activeOpacity={0.7}
                >
                  <Icon name={currentVisibility.icon as any} size={13} color={colors.textSec} />
                  <Text style={[styles.visibilityText, { color: colors.textSec }]}>{currentVisibility.label}</Text>
                </TouchableOpacity>

                {showVisibilityMenu && (
                  <View style={[styles.visibilityMenu, { backgroundColor: colors.bgElevated, borderColor: colors.dividerL }]}>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.visibilityMenuItem,
                          { borderBottomColor: colors.dividerL },
                          visibility === opt.value && { backgroundColor: colors.goldBg },
                        ]}
                        onPress={() => { setVisibility(opt.value); setShowVisibilityMenu(false); }}
                        activeOpacity={0.7}
                      >
                        <Icon name={opt.icon as any} size={14} color={visibility === opt.value ? colors.gold : colors.textH} />
                        <Text style={[styles.visibilityMenuText, { color: visibility === opt.value ? colors.gold : colors.textH }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Teilen-Button */}
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
        </View>
      </KeyboardAvoidingView>

      <CreateChallengeModal
        visible={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        onCreated={(challenge) => { setShowChallengeModal(false); onChallengeCreated?.(challenge); }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    minHeight: 320, maxHeight: '90%',
    borderTopWidth: 1,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: { fontSize: 10, letterSpacing: 4, fontWeight: '600' },
  input: { fontSize: 15, lineHeight: 24, minHeight: 100, textAlignVertical: 'top' },

  // Bilder
  imageScroll: { marginTop: 8, maxHeight: 72 },
  imageScrollContent: { gap: 8, paddingVertical: 4 },
  thumbContainer: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 60, height: 60 },
  thumbRemove: {
    position: 'absolute', top: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressText: { fontSize: 11 },

  // Chip (Ort/Umfrage-Vorschau)
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, marginTop: 8,
  },
  chipLabel: { fontSize: 8, letterSpacing: 1.5, fontWeight: '600' },
  chipText: { fontSize: 12, flex: 1 },

  // Ort-Picker
  pickerBox: { marginTop: 8, borderRadius: 8, borderWidth: 1, padding: 10, gap: 6 },
  pickerInput: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14,
  },
  locationResult: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  locationResultText: { fontSize: 13, flex: 1 },

  // Umfrage
  pollOptionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pollOptionInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 },
  pollActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pollAddOption: { fontSize: 12, fontWeight: '600' },
  pollBtns: { flexDirection: 'row', gap: 8 },
  pollCancelBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pollCancelText: { fontSize: 11, fontWeight: '500' },
  pollSaveBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pollSaveText: { fontSize: 11, fontWeight: '600' },

  // Footer
  footer: { borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    padding: 8, borderRadius: 8,
  },
  toolBadge: { fontSize: 10, fontWeight: '600' },
  counter: { fontSize: 10, letterSpacing: 1, marginLeft: 4 },

  // Aktionen (Sichtbarkeit + Teilen)
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Sichtbarkeit
  visibilityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  visibilityText: { fontSize: 11, fontWeight: '500' },
  visibilityMenu: {
    position: 'absolute', bottom: 40, left: 0,
    borderRadius: 10, borderWidth: 1,
    minWidth: 140, zIndex: 50,
    overflow: 'hidden',
  },
  visibilityMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1,
  },
  visibilityMenuText: { fontSize: 13, fontWeight: '500' },

  // Submit
  submitBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 99 },
  submitBtnDisabled: { opacity: 0.35 },
  submitText: { fontSize: 10, letterSpacing: 3, fontWeight: '600' },
});
