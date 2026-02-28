import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';
import { createPlace, PLACE_TAGS } from '../../lib/places';
import { geocodeLocation } from '../../lib/events';
import type { CreatePlaceData } from '../../types/places';

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

export default function CreatePlaceModal({ visible, onClose, onCreated }: Props) {
  const colors = useThemeStore((s) => s.colors);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Geocoding
  const [geoSuggestions, setGeoSuggestions] = useState<GeoSuggestion[]>([]);
  const [showGeoDropdown, setShowGeoDropdown] = useState(false);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset bei Schliessen
  useEffect(() => {
    if (!visible) {
      setName('');
      setDescription('');
      setSelectedTags([]);
      setLocationQuery('');
      setLocationAddress('');
      setLocationLat(null);
      setLocationLng(null);
      setError('');
      setGeoSuggestions([]);
      setShowGeoDropdown(false);
    }
  }, [visible]);

  // Debounced Geocoding
  useEffect(() => {
    if (geoTimer.current) clearTimeout(geoTimer.current);
    if (locationQuery.trim().length < 3) {
      setGeoSuggestions([]);
      setShowGeoDropdown(false);
      return;
    }
    geoTimer.current = setTimeout(async () => {
      try {
        const res = await geocodeLocation(locationQuery, 'forward');
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
  }, [locationQuery]);

  const handleGeoSelect = (geo: GeoSuggestion) => {
    setLocationQuery(geo.place_name);
    setLocationAddress(geo.place_name);
    setLocationLat(geo.lat);
    setLocationLng(geo.lng);
    setShowGeoDropdown(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) {
      setError('Bitte gib einen Namen ein.');
      return;
    }
    if (name.trim().length > 200) {
      setError('Der Name darf maximal 200 Zeichen lang sein.');
      return;
    }
    if (locationLat == null || locationLng == null) {
      setError('Bitte waehle einen Standort aus der Liste.');
      return;
    }

    const addressParts = locationAddress ? locationAddress.split(', ') : [];
    const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : undefined;
    const country = addressParts.length >= 1 ? addressParts[addressParts.length - 1] : undefined;

    const data: CreatePlaceData = {
      name: name.trim(),
      description: description.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      address: locationAddress.trim() || locationQuery.trim() || undefined,
      city,
      country,
      location_lat: locationLat,
      location_lng: locationLng,
    };

    setSaving(true);
    try {
      await createPlace(data);
      onCreated();
    } catch (e) {
      console.error(e);
      setError('Ort konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'poi': return 'Ort';
      case 'address': return 'Adresse';
      case 'place': return 'Stadt';
      case 'neighborhood': return 'Viertel';
      default: return 'Gebiet';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.bgGradientStart }]}>
          {/* Gold-Linie */}
          <View style={[styles.goldLine, { backgroundColor: colors.gold }]} />

          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textH }]}>Soul Place vorschlagen</Text>
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
            {/* Name */}
            <Text style={[styles.label, { color: colors.textMuted }]}>NAME *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.goldBorderS, color: colors.textH }]}
              value={name}
              onChangeText={setName}
              placeholder="z.B. Yoga Loft Berlin"
              placeholderTextColor={colors.textMuted}
              maxLength={200}
            />

            {/* Beschreibung */}
            <Text style={[styles.label, { color: colors.textMuted }]}>BESCHREIBUNG</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.glass, borderColor: colors.goldBorderS, color: colors.textH }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Was macht diesen Ort besonders?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={3000}
              textAlignVertical="top"
            />

            {/* Tags */}
            <Text style={[styles.label, { color: colors.textMuted }]}>TAGS</Text>
            <View style={styles.tagsWrap}>
              {PLACE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagBtn,
                      { borderColor: colors.divider },
                      isSelected && { backgroundColor: colors.goldBg, borderColor: colors.goldBorder },
                    ]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagBtnText, { color: colors.textMuted }, isSelected && { color: colors.goldDeep }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Standort */}
            <Text style={[styles.label, { color: colors.textMuted }]}>STANDORT *</Text>
            <View style={styles.locationContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.goldBorderS, color: colors.textH }]}
                value={locationQuery}
                onChangeText={(text) => {
                  setLocationQuery(text);
                  setLocationAddress('');
                  setLocationLat(null);
                  setLocationLng(null);
                }}
                placeholder="Adresse oder Ort suchen ..."
                placeholderTextColor={colors.textMuted}
              />
              {locationLat != null && (
                <View style={styles.locationCheck}>
                  <Icon name="map-pin" size={12} color={colors.success} />
                </View>
              )}
            </View>

            {/* Geocoding Ergebnis */}
            {locationAddress && locationLat != null && (
              <Text style={[styles.addressHint, { color: colors.textMuted }]} numberOfLines={1}>
                {locationAddress}
              </Text>
            )}

            {/* Geocoding Dropdown */}
            {showGeoDropdown && geoSuggestions.length > 0 && (
              <View style={[styles.geoDropdown, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                {geoSuggestions.map((geo, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.geoItem,
                      i < geoSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                    ]}
                    onPress={() => handleGeoSelect(geo)}
                    activeOpacity={0.7}
                  >
                    <Icon name="map-pin" size={12} color={colors.gold} />
                    <View style={styles.geoItemInfo}>
                      <Text style={[styles.geoItemName, { color: colors.textH }]} numberOfLines={1}>
                        {geo.place_name}
                      </Text>
                      <Text style={[styles.geoItemType, { color: colors.textMuted }]}>
                        {getTypeLabel(geo.feature_type)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Fehler */}
            {error !== '' && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.divider }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>ABBRECHEN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, saving && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>ORT VORSCHLAGEN</Text>
                )}
              </TouchableOpacity>
            </View>
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
    overflow: 'hidden',
  },
  goldLine: {
    height: 2,
    opacity: 0.5,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  tagBtnText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  locationContainer: {
    position: 'relative',
  },
  locationCheck: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  addressHint: {
    fontSize: 11,
    marginTop: 2,
  },
  geoDropdown: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  geoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  geoItemInfo: {
    flex: 1,
  },
  geoItemName: {
    fontSize: 13,
  },
  geoItemType: {
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 9,
    letterSpacing: 2,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A8894E',
  },
  submitBtnText: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#fff',
    fontWeight: '500',
  },
});
