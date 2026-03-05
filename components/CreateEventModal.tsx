/**
 * CreateEventModal – Event-Erstellung mit Geocoding
 * Bottom Sheet Modal (analog zu CreatePlaceModal)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Platform,
  KeyboardAvoidingView, Alert,
} from 'react-native';
import { useThemeStore } from '../store/theme';
import { createEvent, geocodeLocation } from '../lib/events';
import { Icon } from './Icon';
import type { CreateEventData } from '../types/events';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface GeoSuggestion {
  place_name: string;
  lat: number;
  lng: number;
  feature_type: string;
}

export default function CreateEventModal({ visible, onClose, onCreated }: Props) {
  const colors = useThemeStore((s) => s.colors);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'meetup' | 'course'>('meetup');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Geocoding
  const [geoSuggestions, setGeoSuggestions] = useState<GeoSuggestion[]>([]);
  const [showGeoDropdown, setShowGeoDropdown] = useState(false);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset bei Oeffnen
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setCategory('meetup');
      setLocationName('');
      setLocationAddress('');
      setLocationLat(null);
      setLocationLng(null);
      setDate('');
      setStartTime('');
      setEndTime('');
      setMaxParticipants('');
      setError('');
      setGeoSuggestions([]);
      setShowGeoDropdown(false);
    }
  }, [visible]);

  // Debounced Geocoding
  useEffect(() => {
    if (geoTimer.current) clearTimeout(geoTimer.current);
    if (locationName.trim().length < 3) {
      setGeoSuggestions([]);
      setShowGeoDropdown(false);
      return;
    }
    geoTimer.current = setTimeout(async () => {
      try {
        const res = await geocodeLocation(locationName, 'forward');
        if (res.results && res.results.length > 0) {
          setGeoSuggestions(res.results.map((r) => ({
            place_name: r.place_name,
            lat: r.lat,
            lng: r.lng,
            feature_type: r.feature_type,
          })));
          setShowGeoDropdown(true);
        } else {
          setGeoSuggestions([]);
          setShowGeoDropdown(false);
        }
      } catch {
        setGeoSuggestions([]);
        setShowGeoDropdown(false);
      }
    }, 500);
    return () => {
      if (geoTimer.current) clearTimeout(geoTimer.current);
    };
  }, [locationName]);

  const handleGeoSelect = useCallback((geo: GeoSuggestion) => {
    // Bei POI/Adresse: Kurzname + volle Adresse
    const parts = geo.place_name.split(',');
    if (geo.feature_type === 'poi' || geo.feature_type === 'address') {
      setLocationName(parts[0]?.trim() ?? geo.place_name);
      setLocationAddress(geo.place_name);
    } else {
      setLocationName(geo.place_name);
      setLocationAddress('');
    }
    setLocationLat(geo.lat);
    setLocationLng(geo.lng);
    setShowGeoDropdown(false);
  }, []);

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }
    if (!locationName.trim()) { setError('Bitte gib einen Ort ein.'); return; }
    if (locationLat == null || locationLng == null) { setError('Bitte waehle einen Ort aus der Liste.'); return; }
    if (!date) { setError('Bitte gib ein Datum ein (TT.MM.JJJJ).'); return; }
    if (!startTime) { setError('Bitte gib eine Startzeit ein (HH:MM).'); return; }

    // Datum parsen (TT.MM.JJJJ → YYYY-MM-DD)
    const dateParts = date.split('.');
    if (dateParts.length !== 3) { setError('Datum im Format TT.MM.JJJJ eingeben.'); return; }
    const isoDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;

    // Validiere Datum
    const parsed = new Date(`${isoDate}T${startTime}:00`);
    if (isNaN(parsed.getTime())) { setError('Ungültiges Datum oder Uhrzeit.'); return; }

    const startsAt = parsed.toISOString();
    const endsAt = endTime ? new Date(`${isoDate}T${endTime}:00`).toISOString() : undefined;

    const data: CreateEventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      location_name: locationName.trim(),
      location_address: locationAddress.trim() || undefined,
      location_lat: locationLat,
      location_lng: locationLng,
      starts_at: startsAt,
      ends_at: endsAt,
      max_participants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
    };

    setSaving(true);
    try {
      await createEvent(data);
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      setError('Event konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = (ft: string) => {
    switch (ft) {
      case 'poi': return 'Ort';
      case 'address': return 'Adresse';
      case 'place': return 'Stadt';
      case 'neighborhood': return 'Viertel';
      default: return 'Gebiet';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.bgSolid, borderColor: colors.glassBorder }]}>
          {/* Gold-Leiste */}
          <View style={[styles.goldLine, { backgroundColor: colors.gold }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textH }]}>Event erstellen</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glass }]}>
              <Icon name="x" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {/* Titel */}
            <Text style={[styles.label, { color: colors.textMuted }]}>TITEL *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
              value={title}
              onChangeText={setTitle}
              placeholder="z.B. Yoga im Park"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
            />

            {/* Beschreibung */}
            <Text style={[styles.label, { color: colors.textMuted }]}>BESCHREIBUNG</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Was erwartet die Teilnehmer?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />

            {/* Kategorie */}
            <Text style={[styles.label, { color: colors.textMuted }]}>KATEGORIE</Text>
            <View style={styles.categoryRow}>
              <TouchableOpacity
                style={[
                  styles.categoryBtn,
                  category === 'meetup'
                    ? { backgroundColor: colors.gold }
                    : { borderColor: colors.divider, borderWidth: 1 },
                ]}
                onPress={() => setCategory('meetup')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, { color: category === 'meetup' ? colors.textOnGold : colors.textMuted }]}>
                  MEETUP
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryBtn,
                  category === 'course'
                    ? { backgroundColor: '#7C5CFC' }
                    : { borderColor: colors.divider, borderWidth: 1 },
                ]}
                onPress={() => setCategory('course')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, { color: category === 'course' ? '#FFFFFF' : colors.textMuted }]}>
                  KURS
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ort mit Geocoding */}
            <Text style={[styles.label, { color: colors.textMuted }]}>ORT *</Text>
            <View>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Icon name="map-pin" size={14} color={colors.gold} />
                <TextInput
                  style={[styles.inputInner, { color: colors.textH }]}
                  value={locationName}
                  onChangeText={(v) => {
                    setLocationName(v);
                    setLocationAddress('');
                    setLocationLat(null);
                    setLocationLng(null);
                  }}
                  placeholder="Adresse oder Ort suchen ..."
                  placeholderTextColor={colors.textMuted}
                />
                {locationLat != null && (
                  <Icon name="check" size={14} color={colors.success} />
                )}
              </View>

              {/* Selektierte Adresse */}
              {locationAddress && locationLat != null ? (
                <Text style={[styles.addressHint, { color: colors.textMuted }]} numberOfLines={1}>
                  {locationAddress}
                </Text>
              ) : null}

              {/* Geocoding-Dropdown */}
              {showGeoDropdown && geoSuggestions.length > 0 && (
                <View style={[styles.geoDropdown, { backgroundColor: colors.bgSolid, borderColor: colors.glassBorder }]}>
                  {geoSuggestions.map((geo, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.geoItem,
                        i < geoSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.dividerL },
                      ]}
                      onPress={() => handleGeoSelect(geo)}
                      activeOpacity={0.7}
                    >
                      <Icon name="map-pin" size={13} color={colors.gold} />
                      <View style={styles.geoItemText}>
                        <Text style={[styles.geoName, { color: colors.textH }]} numberOfLines={1}>
                          {geo.place_name}
                        </Text>
                        <Text style={[styles.geoType, { color: colors.textMuted }]}>
                          {typeLabel(geo.feature_type)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Datum + Zeiten */}
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>DATUM *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="TT.MM.JJJJ"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>START *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>ENDE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Max. Teilnehmer */}
            <Text style={[styles.label, { color: colors.textMuted }]}>MAX. TEILNEHMER</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="Unbegrenzt"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            {/* Fehler */}
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: `${colors.error}18`, borderColor: `${colors.error}44` }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: saving ? colors.goldBg : colors.gold }]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={colors.textOnGold} size="small" />
              ) : (
                <Text style={[styles.submitText, { color: colors.textOnGold }]}>EVENT ERSTELLEN</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  goldLine: { height: 2, opacity: 0.6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '500' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 40 },

  label: {
    fontSize: 9, letterSpacing: 3,
    marginBottom: 6, marginTop: 14,
  },
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14,
  },
  inputInner: { flex: 1, fontSize: 14, paddingVertical: 10 },

  categoryRow: { flexDirection: 'row', gap: 10 },
  categoryBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: 999, alignItems: 'center',
  },
  categoryText: { fontSize: 9, letterSpacing: 2, fontWeight: '600' },

  addressHint: { fontSize: 11, marginTop: 4, marginLeft: 28 },

  geoDropdown: {
    borderWidth: 1, borderRadius: 12,
    marginTop: 4, overflow: 'hidden',
    maxHeight: 200,
  },
  geoItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  geoItemText: { flex: 1 },
  geoName: { fontSize: 13 },
  geoType: { fontSize: 9, letterSpacing: 2, marginTop: 2 },

  dateRow: { flexDirection: 'row', gap: 10 },
  timeRow: { flexDirection: 'row', gap: 10 },

  errorBanner: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, marginTop: 14,
  },
  errorText: { fontSize: 13, textAlign: 'center' },

  submitBtn: {
    paddingVertical: 14, borderRadius: 999,
    alignItems: 'center', marginTop: 20,
  },
  submitText: { fontSize: 10, letterSpacing: 3, fontWeight: '600' },
});
