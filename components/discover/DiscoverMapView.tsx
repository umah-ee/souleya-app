import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';
import type { SoEvent } from '../../types/events';
import type { Place } from '../../types/places';

// Dynamischer Import – @rnmapbox/maps ist nur im Dev-Build verfuegbar
let Mapbox: typeof import('@rnmapbox/maps').default | null = null;
try {
  Mapbox = require('@rnmapbox/maps').default;
} catch {
  // Nicht verfuegbar (Expo Go)
}

export interface MapNearbyUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location_lat: number;
  location_lng: number;
  is_first_light: boolean;
}

interface Props {
  users: MapNearbyUser[];
  events: SoEvent[];
  places: Place[];
  center: [number, number]; // [lng, lat]
  onRegionChange?: (center: { lat: number; lng: number }) => void;
  onUserPress?: (user: MapNearbyUser) => void;
  onEventPress?: (event: SoEvent) => void;
  onPlacePress?: (place: Place) => void;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

const MAP_STYLES = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

export default function DiscoverMapView({
  users, events, places, center,
  onRegionChange, onUserPress, onEventPress, onPlacePress,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const themeMode = useThemeStore((s) => s.mode);
  const [mapboxReady, setMapboxReady] = useState(false);

  // Mapbox initialisieren
  useEffect(() => {
    if (!Mapbox || !MAPBOX_TOKEN) return;
    try {
      Mapbox.setAccessToken(MAPBOX_TOKEN);
      setMapboxReady(true);
    } catch {
      // Fehler bei Initialisierung
    }
  }, []);

  // Fallback wenn Mapbox nicht verfuegbar
  if (!Mapbox || !MAPBOX_TOKEN || !mapboxReady) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.bgGradientEnd }]}>
        <Icon name="map" size={48} color={colors.textMuted} />
        <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
          Karte verfuegbar im Development Build
        </Text>
      </View>
    );
  }

  const MapView = Mapbox.MapView;
  const Camera = Mapbox.Camera;
  const PointAnnotation = Mapbox.PointAnnotation;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        styleURL={MAP_STYLES[themeMode]}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        onRegionDidChange={(feature: any) => {
          if (!onRegionChange) return;
          const coords = feature?.geometry?.coordinates;
          if (coords) {
            onRegionChange({ lat: coords[1], lng: coords[0] });
          }
        }}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: center,
            zoomLevel: 12,
          }}
        />

        {/* User Markers – Gold Kreis mit Avatar */}
        {users.map((user) => (
          <PointAnnotation
            key={`user-${user.id}`}
            id={`user-${user.id}`}
            coordinate={[user.location_lng, user.location_lat]}
            onSelected={() => onUserPress?.(user)}
          >
            <View style={[
              styles.userMarker,
              { borderColor: user.is_first_light ? colors.gold : `${colors.gold}88` },
            ]}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.userMarkerImg} />
              ) : (
                <Text style={styles.userMarkerInitial}>
                  {(user.display_name ?? user.username ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
          </PointAnnotation>
        ))}

        {/* Event Markers – Lila Kreis mit Kalender-Icon */}
        {events.map((event) => (
          <PointAnnotation
            key={`event-${event.id}`}
            id={`event-${event.id}`}
            coordinate={[event.location_lng, event.location_lat]}
            onSelected={() => onEventPress?.(event)}
          >
            <View style={styles.eventMarker}>
              <Icon name="calendar-event" size={14} color="#fff" />
            </View>
          </PointAnnotation>
        ))}

        {/* Place Markers – Gold Pin */}
        {places.map((place) => (
          <PointAnnotation
            key={`place-${place.id}`}
            id={`place-${place.id}`}
            coordinate={[place.location_lng, place.location_lat]}
            onSelected={() => onPlacePress?.(place)}
          >
            <View style={[styles.placeMarker, { backgroundColor: colors.gold }]}>
              <Icon name="building" size={14} color="#fff" />
            </View>
          </PointAnnotation>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  placeholderText: {
    fontSize: 12, letterSpacing: 1,
  },

  userMarker: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#A8894E',
  },
  userMarkerImg: {
    width: 35, height: 35, borderRadius: 17.5,
  },
  userMarkerInitial: {
    fontSize: 14, fontWeight: '600', color: '#fff',
  },

  eventMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#8B5CF6',
    borderWidth: 2, borderColor: '#A78BFA',
    alignItems: 'center', justifyContent: 'center',
  },

  placeMarker: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: 'rgba(200,169,110,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
});
