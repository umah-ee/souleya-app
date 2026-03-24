/**
 * StepLocation – GPS-Standort oder manuelle Eingabe
 * Nutzt expo-location + POST /users/geocode
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
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useThemeStore } from '../../../store/theme';
import { updateProfile } from '../../../lib/profile';
import { apiFetch } from '../../../lib/api';
import { Icon } from '../../Icon';

const GOLD = '#C8A96E';

interface GeocodeResult {
  location: string;
  lat: number;
  lng: number;
}

interface Props {
  currentLocation?: string | null;
  onComplete: () => void;
  onBack: () => void;
  isFirst: boolean;
}

export default function StepLocation({ currentLocation, onComplete, onBack, isFirst }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [city, setCity] = useState(currentLocation ?? '');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isValid = city.trim().length >= 2;

  const handleGPS = async () => {
    setLocating(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Standort-Zugriff', 'Bitte erlaube den Standort-Zugriff in den Einstellungen.');
        setLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      // Reverse geocode via API
      const result = await apiFetch<GeocodeResult>('/users/geocode', {
        method: 'POST',
        body: JSON.stringify({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        }),
      });

      setCity(result.location);
    } catch (err) {
      setError('Standort konnte nicht ermittelt werden');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setError('');
    try {
      // Forward geocode the city name
      const result = await apiFetch<GeocodeResult>('/users/geocode', {
        method: 'POST',
        body: JSON.stringify({ query: city.trim() }),
      });

      await updateProfile({
        location: result.location,
        location_lat: result.lat,
        location_lng: result.lng,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {/* City Input + GPS */}
      <View style={styles.inputRow}>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Stadt eingeben …"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              color: colors.textBody,
            },
          ]}
        />
        <TouchableOpacity
          style={[styles.gpsBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
          onPress={handleGPS}
          disabled={locating}
          activeOpacity={0.7}
        >
          {locating ? (
            <ActivityIndicator color={GOLD} size="small" />
          ) : (
            <Icon name="current-location" size={18} color={GOLD} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Nur die Stadt — keine genaue Adresse. Oder nutze GPS.
      </Text>

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
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  gpsBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 11,
    marginTop: 6,
    marginBottom: 4,
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
    backgroundColor: '#C8A96E',
  },
  nextBtnText: {
    color: '#1A1714',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
