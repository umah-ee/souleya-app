/**
 * LocationShareCard – Zeigt einen geteilten Standort in der Chat-Nachricht
 * Unterstuetzt statische und Live-Standorte
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

interface LocationData {
  lat: number;
  lng: number;
  title?: string;
  subtitle?: string;
  is_live?: boolean;
  expires_at?: string;
}

interface Props {
  location: LocationData;
  onPress?: () => void;
}

export default function LocationShareCard({ location, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [isExpired, setIsExpired] = useState(false);

  // Live-Standort Ablauf pruefen
  useEffect(() => {
    if (!location.is_live || !location.expires_at) return;
    const check = () => {
      setIsExpired(new Date(location.expires_at!).getTime() < Date.now());
    };
    check();
    const interval = setInterval(check, 10000); // alle 10s pruefen
    return () => clearInterval(interval);
  }, [location.is_live, location.expires_at]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Mapbox Static Image oder Apple/Google Maps oeffnen
      const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  // Statische Mapbox-Karte als Vorschaubild
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
  const staticMapUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+C8A96E(${location.lng},${location.lat})/${location.lng},${location.lat},14,0/280x140@2x?access_token=${mapboxToken}`
    : null;

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: colors.glassBorder }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Karten-Vorschau */}
      {staticMapUrl ? (
        <View style={styles.mapPreview}>
          <View style={[styles.mapImage, { backgroundColor: `${colors.gold}10` }]}>
            {/* Mapbox Static Image */}
            <View style={styles.mapImageInner}>
              <Icon name="map-pin" size={24} color={colors.gold} />
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.mapPreview, { backgroundColor: `${colors.gold}10` }]}>
          <Icon name="map-pin" size={24} color={colors.gold} />
        </View>
      )}

      {/* Standort-Info */}
      <View style={styles.info}>
        <View style={styles.infoHeader}>
          {location.is_live && !isExpired && (
            <View style={[styles.liveBadge, { backgroundColor: '#22C55E' }]}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {location.is_live && isExpired && (
            <View style={[styles.liveBadge, { backgroundColor: colors.textMuted }]}>
              <Text style={styles.liveBadgeText}>BEENDET</Text>
            </View>
          )}
          <Icon name="map-pin" size={14} color={colors.gold} />
          <Text style={[styles.title, { color: colors.textH }]} numberOfLines={1}>
            {location.title || 'Standort'}
          </Text>
        </View>
        {location.subtitle && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {location.subtitle}
          </Text>
        )}
        <Text style={[styles.coords, { color: colors.textMuted }]}>
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  mapPreview: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,169,110,0.05)',
  },
  mapImage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapImageInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 10,
    gap: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  subtitle: {
    fontSize: 11,
    marginLeft: 20,
  },
  coords: {
    fontSize: 9,
    marginLeft: 20,
    letterSpacing: 0.5,
  },
});
