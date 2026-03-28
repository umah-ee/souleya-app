import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Share, Modal, Pressable,
  StyleSheet, ActivityIndicator, Image, Animated, PanResponder, Dimensions, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { searchUsers, type UserSearchResult } from '../../lib/users';
import { sendConnectionRequest, getConnectionStatus } from '../../lib/circles';
import { fetchNearbyUsers, fetchEvents, joinEvent, leaveEvent, bookmarkEvent, unbookmarkEvent } from '../../lib/events';
import { fetchNearbyPlaces, savePlace, unsavePlace, PLACE_TAGS } from '../../lib/places';
import { fetchProfile } from '../../lib/profile';
import type { ConnectionStatus } from '../../types/circles';
import type { SoEvent } from '../../types/events';
import type { Place } from '../../types/places';
import { Icon } from '../../components/Icon';
import CreatePlaceModal from '../../components/discover/CreatePlaceModal';
import CreateEventModal from '../../components/CreateEventModal';
import DiscoverMapView, { type MapNearbyUser } from '../../components/discover/DiscoverMapView';
import FloatingSearchBar from '../../components/discover/FloatingSearchBar';
import FloatingSegmentTabs, { type DiscoverSegment } from '../../components/discover/FloatingSegmentTabs';
import FloatingTagBar from '../../components/discover/FloatingTagBar';

interface UserWithStatus extends UserSearchResult {
  connectionStatus: ConnectionStatus;
  connectionId: string | null;
}

interface NearbyUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  location_lat: number;
  location_lng: number;
  soul_level: number;
  is_first_light: boolean;
  connections_count: number;
}

const FALLBACK_LAT = 48.137;
const FALLBACK_LNG = 11.576;
const RADIUS = 25;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const userId = session?.user.id;
  const SCREEN_H = Dimensions.get('window').height;

  // ── GPS-Standort ─────────────────────────────────────
  const [userLat, setUserLat] = useState(FALLBACK_LAT);
  const [userLng, setUserLng] = useState(FALLBACK_LNG);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locatingGPS, setLocatingGPS] = useState(false);

  const fetchGPSLocation = useCallback(async () => {
    setLocatingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      // Timeout: Max 8 Sekunden warten auf GPS
      const locPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
      const loc = await Promise.race([locPromise, timeoutPromise]);

      if (loc && 'coords' in loc) {
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);

        // Reverse Geocoding fuer Ortsnamen
        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo) {
            const name = geo.city ?? geo.subregion ?? geo.region ?? '';
            setLocationName(name);
          }
        } catch {
          // Reverse Geocoding fehlgeschlagen — kein Problem
        }
      }
    } catch {
      // GPS nicht verfuegbar — Fallback bleibt
    } finally {
      setLocationLoaded(true);
      setLocatingGPS(false);
    }
  }, []);

  // GPS starten, aber Daten auch ohne GPS nach 2s laden (Fallback)
  useEffect(() => {
    fetchGPSLocation();
    // Safety: Auch ohne GPS nach 2 Sekunden locationLoaded setzen
    const fallbackTimer = setTimeout(() => {
      setLocationLoaded(true);
    }, 2000);
    return () => clearTimeout(fallbackTimer);
  }, []);
  const SNAP_LOW = SCREEN_H * 0.12;
  const SNAP_MID = SCREEN_H * 0.45;
  const SNAP_HIGH = SCREEN_H * 0.88;
  const sheetY = useRef(new Animated.Value(SCREEN_H - SNAP_LOW)).current;
  const lastSnap = useRef(SCREEN_H - SNAP_LOW);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      const newY = lastSnap.current + g.dy;
      const clamped = Math.max(SCREEN_H - SNAP_HIGH, Math.min(SCREEN_H - SNAP_LOW, newY));
      sheetY.setValue(clamped);
    },
    onPanResponderRelease: (_, g) => {
      const currentY = lastSnap.current + g.dy;
      const targets = [SCREEN_H - SNAP_HIGH, SCREEN_H - SNAP_MID, SCREEN_H - SNAP_LOW];
      let closest = targets[0];
      for (const t of targets) {
        if (Math.abs(currentY - t) < Math.abs(currentY - closest)) closest = t;
      }
      // Wenn schneller Swipe nach oben/unten, snap in Richtung
      if (g.vy < -0.5) closest = targets[0]; // hoch
      else if (g.vy > 0.5) closest = targets[2]; // runter
      lastSnap.current = closest;
      Animated.spring(sheetY, { toValue: closest, useNativeDriver: false, tension: 80, friction: 12 }).start();
    },
  }), [SCREEN_H]);

  // ── Segment + Tags ─────────────────────────────────────
  const [segment, setSegment] = useState<DiscoverSegment>('alle');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // ── Suche ──────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserWithStatus[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Discover-Daten ─────────────────────────────────────
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [events, setEvents] = useState<SoEvent[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningEvent, setJoiningEvent] = useState<Record<string, boolean>>({});
  const [savingPlace, setSavingPlace] = useState<Record<string, boolean>>({});
  const [bookmarkingEvent, setBookmarkingEvent] = useState<Record<string, boolean>>({});
  const [showCreatePlace, setShowCreatePlace] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedMapUser, setSelectedMapUser] = useState<NearbyUser | null>(null);

  const isSearchActive = query.trim().length >= 2;

  // ── Profil-Tags als initiale Filter ────────────────────
  const [tagsInitialized, setTagsInitialized] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  useEffect(() => {
    if (!userId || tagsInitialized) return;
    fetchProfile()
      .then((profile) => {
        const interests = profile.interests ?? [];
        setUserInterests(interests);
        const matching = interests.filter((i: string) => PLACE_TAGS.includes(i));
        if (matching.length > 0) setActiveTags(matching);
        setTagsInitialized(true);
      })
      .catch(() => setTagsInitialized(true));
  }, [userId, tagsInitialized]);

  // ── Daten laden ────────────────────────────────────────
  const loadDiscoverData = useCallback(async () => {
    setLoading(true);
    try {
      const [nearbyRes, eventsRes, placesRes] = await Promise.all([
        fetchNearbyUsers(userLat, userLng, RADIUS),
        fetchEvents({ lat: userLat, lng: userLng }),
        fetchNearbyPlaces(userLat, userLng, RADIUS, activeTags.length > 0 ? activeTags : undefined),
      ]);
      setNearbyUsers(nearbyRes.data);
      setEvents(eventsRes.data);
      setPlaces(placesRes);
    } catch (e) {
      console.error('Discover laden fehlgeschlagen:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTags, userLat, userLng]);

  // Erst laden wenn GPS-Position bekannt
  useEffect(() => {
    if (locationLoaded) loadDiscoverData();
  }, [locationLoaded, loadDiscoverData]);

  // ── Tag Toggle ─────────────────────────────────────────
  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // ── User-Suche (Debounced) ─────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); setSearched(false); return; }
    setSearching(true);
    setSearched(true);
    try {
      const { data } = await searchUsers(q);
      const withStatus = await Promise.all(
        data.map(async (user) => {
          try {
            const status = await getConnectionStatus(user.id);
            return { ...user, connectionStatus: status.status, connectionId: status.connectionId };
          } catch {
            return { ...user, connectionStatus: 'none' as ConnectionStatus, connectionId: null };
          }
        }),
      );
      setSearchResults(withStatus);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // ── Actions ────────────────────────────────────────────
  const handleConnect = async (user: UserWithStatus) => {
    try {
      await sendConnectionRequest(user.id);
      setSearchResults((prev) => prev.map((u) => u.id === user.id ? { ...u, connectionStatus: 'pending_outgoing' } : u));
    } catch (e) { console.error(e); }
  };

  const handleJoinEvent = async (eventId: string) => {
    setJoiningEvent((s) => ({ ...s, [eventId]: true }));
    try {
      const res = await joinEvent(eventId);
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, has_joined: true, participants_count: res.participants_count } : e));
    } catch (e) { console.error(e); }
    finally { setJoiningEvent((s) => ({ ...s, [eventId]: false })); }
  };

  const handleLeaveEvent = async (eventId: string) => {
    setJoiningEvent((s) => ({ ...s, [eventId]: true }));
    try {
      const res = await leaveEvent(eventId);
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, has_joined: false, participants_count: res.participants_count } : e));
    } catch (e) { console.error(e); }
    finally { setJoiningEvent((s) => ({ ...s, [eventId]: false })); }
  };

  const handleSavePlace = async (placeId: string) => {
    setSavingPlace((s) => ({ ...s, [placeId]: true }));
    try { await savePlace(placeId); setPlaces((prev) => prev.map((p) => p.id === placeId ? { ...p, is_saved: true } : p)); }
    catch (e) { console.error(e); }
    finally { setSavingPlace((s) => ({ ...s, [placeId]: false })); }
  };

  const handleUnsavePlace = async (placeId: string) => {
    setSavingPlace((s) => ({ ...s, [placeId]: true }));
    try { await unsavePlace(placeId); setPlaces((prev) => prev.map((p) => p.id === placeId ? { ...p, is_saved: false } : p)); }
    catch (e) { console.error(e); }
    finally { setSavingPlace((s) => ({ ...s, [placeId]: false })); }
  };

  const handleBookmarkEvent = async (eventId: string) => {
    setBookmarkingEvent((s) => ({ ...s, [eventId]: true }));
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, is_bookmarked: true } : e));
    try { await bookmarkEvent(eventId); }
    catch { setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, is_bookmarked: false } : e)); }
    finally { setBookmarkingEvent((s) => ({ ...s, [eventId]: false })); }
  };

  const handleUnbookmarkEvent = async (eventId: string) => {
    setBookmarkingEvent((s) => ({ ...s, [eventId]: true }));
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, is_bookmarked: false } : e));
    try { await unbookmarkEvent(eventId); }
    catch { setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, is_bookmarked: true } : e)); }
    finally { setBookmarkingEvent((s) => ({ ...s, [eventId]: false })); }
  };

  const handleShareEvent = async (event: SoEvent) => {
    try {
      await Share.share({
        message: `${event.title} auf Souleya entdecken!`,
        url: `https://souleya.com/discover`,
      });
    } catch {
      // Abgebrochen
    }
  };

  // ── Helpers ────────────────────────────────────────────
  const getStatusLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'Verbunden';
      case 'pending_outgoing': return 'Angefragt';
      case 'pending_incoming': return 'Antworten';
      default: return 'Verbinden';
    }
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
  };

  // ── Bottom Sheet Items ─────────────────────────────────
  const bottomSheetItems = useMemo(() => {
    if (segment === 'mitglieder') return nearbyUsers.map((u) => ({ ...u, _type: 'user' as const }));
    if (segment === 'events') return events.map((e) => ({ ...e, _type: 'event' as const }));
    if (segment === 'orte') return places.map((p) => ({ ...p, _type: 'place' as const }));
    // 'alle' — gemischt
    return [
      ...nearbyUsers.slice(0, 5).map((u) => ({ ...u, _type: 'user' as const })),
      ...events.slice(0, 5).map((e) => ({ ...e, _type: 'event' as const })),
      ...places.slice(0, 5).map((p) => ({ ...p, _type: 'place' as const })),
    ];
  }, [segment, nearbyUsers, events, places]);

  const resultCount = segment === 'alle'
    ? nearbyUsers.length + events.length + places.length
    : bottomSheetItems.length;

  // ── Map Users ──────────────────────────────────────────
  const mapUsers: MapNearbyUser[] = nearbyUsers.map((u) => ({
    id: u.id, display_name: u.display_name, username: u.username,
    avatar_url: u.avatar_url, location_lat: u.location_lat,
    location_lng: u.location_lng, is_first_light: u.is_first_light,
  }));

  // ── Render Bottom Sheet Item ───────────────────────────
  const renderBottomSheetItem = ({ item }: { item: any }) => {
    if (item._type === 'user') {
      const name = item.display_name ?? item.username ?? 'Anonym';
      return (
        <TouchableOpacity style={[styles.bsCard, { borderColor: colors.divider }]} activeOpacity={0.7}>
          <View style={[styles.bsAvatar, { backgroundColor: '#A8894E' }]}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.bsAvatarImg} />
            ) : (
              <Text style={styles.bsAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.bsCardInfo}>
            <Text style={[styles.bsCardName, { color: colors.textH }]} numberOfLines={1}>{name}</Text>
            {item.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="map-pin" size={10} color={colors.textMuted} />
                <Text style={[styles.bsCardSub, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>
              </View>
            )}
          </View>
          {item.is_first_light && (
            <View style={[styles.flBadge, { borderColor: colors.gold, backgroundColor: `${colors.gold}18` }]}>
              <Text style={[styles.flBadgeText, { color: colors.gold }]}>FL</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (item._type === 'event') {
      return (
        <TouchableOpacity style={[styles.bsCard, { borderColor: colors.divider }]} activeOpacity={0.7}>
          <View style={[styles.bsIconCircle, { backgroundColor: '#8B5CF6' }]}>
            <Icon name="calendar-event" size={16} color="#fff" />
          </View>
          <View style={styles.bsCardInfo}>
            <Text style={[styles.bsCardName, { color: colors.textH }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.bsCardSub, { color: colors.textMuted }]}>{formatEventDate(item.starts_at)}</Text>
          </View>
          <TouchableOpacity onPress={() => handleShareEvent(item)} hitSlop={8}>
            <Icon name="share" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => item.is_bookmarked ? handleUnbookmarkEvent(item.id) : handleBookmarkEvent(item.id)}
            disabled={bookmarkingEvent[item.id]}
            hitSlop={8}
          >
            <Icon
              name={item.is_bookmarked ? 'bookmark-filled' : 'bookmark'}
              size={18}
              color={item.is_bookmarked ? colors.gold : colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => item.has_joined ? handleLeaveEvent(item.id) : handleJoinEvent(item.id)}
            disabled={joiningEvent[item.id]}
            style={[styles.bsAction, { borderColor: colors.gold }]}
          >
            <Text style={[styles.bsActionText, { color: colors.gold }]}>
              {item.has_joined ? 'Dabei' : 'Teilnehmen'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    if (item._type === 'place') {
      return (
        <TouchableOpacity
          style={[styles.bsCard, { borderColor: colors.divider }]}
          onPress={() => router.push(`/places/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.bsIconCircle, { backgroundColor: colors.gold }]}>
            <Icon name="map-pin" size={16} color="#fff" />
          </View>
          <View style={styles.bsCardInfo}>
            <Text style={[styles.bsCardName, { color: colors.textH }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.bsCardSub, { color: colors.textMuted }]} numberOfLines={1}>
              {item.address ?? item.city ?? ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => item.is_saved ? handleUnsavePlace(item.id) : handleSavePlace(item.id)}
            hitSlop={8}
          >
            <Icon name={item.is_saved ? 'bookmark-filled' : 'bookmark'} size={18} color={item.is_saved ? colors.gold : colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // ── Search Result Item ─────────────────────────────────
  const renderSearchUser = ({ item }: { item: UserWithStatus }) => {
    const name = item.display_name ?? item.username ?? 'Anonym';
    const isMe = item.id === userId;
    return (
      <View style={[styles.bsCard, { borderColor: colors.divider }]}>
        <View style={[styles.bsAvatar, { backgroundColor: '#A8894E' }]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.bsAvatarImg} />
          ) : (
            <Text style={styles.bsAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.bsCardInfo}>
          <Text style={[styles.bsCardName, { color: colors.textH }]} numberOfLines={1}>{name}</Text>
          {item.username && <Text style={[styles.bsCardSub, { color: colors.textMuted }]}>@{item.username}</Text>}
        </View>
        {!isMe && (
          <TouchableOpacity
            style={[styles.bsAction, { borderColor: colors.gold }, item.connectionStatus !== 'none' && { borderColor: colors.divider }]}
            onPress={() => item.connectionStatus === 'none' && handleConnect(item)}
            disabled={item.connectionStatus !== 'none'}
          >
            <Text style={[styles.bsActionText, { color: item.connectionStatus === 'none' ? colors.gold : colors.textMuted }]}>
              {getStatusLabel(item.connectionStatus)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fullscreen Karte */}
      <DiscoverMapView
        users={mapUsers}
        events={events.filter((e) => e.location_lat && e.location_lng)}
        places={places.filter((p) => p.location_lat && p.location_lng)}
        center={[userLng, userLat]}
        onRegionChange={() => {}}
        onUserPress={(mapUser) => {
          const full = nearbyUsers.find((u) => u.id === mapUser.id) ?? {
            id: mapUser.id,
            username: mapUser.username,
            display_name: mapUser.display_name,
            avatar_url: mapUser.avatar_url,
            bio: null,
            location: null,
            location_lat: mapUser.location_lat,
            location_lng: mapUser.location_lng,
            soul_level: 1,
            is_first_light: mapUser.is_first_light,
            connections_count: 0,
          };
          setSelectedMapUser(full);
        }}
        onEventPress={() => {}}
        onPlacePress={(place) => router.push(`/places/${place.id}` as any)}
      />

      {/* Floating Controls ueber der Karte */}
      <View style={styles.floatingControls} pointerEvents="box-none">
        <FloatingSearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Souls suchen …"
          locationName={locationName}
          onGPSPress={fetchGPSLocation}
          locatingGPS={locatingGPS}
        />

        {!isSearchActive && (
          <>
            <FloatingSegmentTabs
              active={segment}
              onChange={setSegment}
              counts={{
                mitglieder: nearbyUsers.length,
                events: events.length,
                orte: places.length,
              }}
            />
            {(segment === 'alle' || segment === 'orte') && (
              <FloatingTagBar
                tags={PLACE_TAGS.slice(0, 20)}
                activeTags={activeTags}
                userInterests={userInterests}
                onToggle={toggleTag}
              />
            )}
          </>
        )}
      </View>

      {/* Suche-Overlay */}
      {isSearchActive && (
        <View style={[styles.searchOverlay, { backgroundColor: colors.bgSolid }]}>
          {searching ? (
            <View style={styles.center}><ActivityIndicator color={colors.gold} /></View>
          ) : searchResults.length === 0 && searched ? (
            <View style={styles.center}>
              <Icon name="search" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 8 }]}>Keine Ergebnisse</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchUser}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}

      {/* Bottom Sheet (custom, kein @gorhom/bottom-sheet) */}
      {!isSearchActive && (
        <Animated.View
          style={[styles.bottomSheet, { backgroundColor: colors.bgSolid, top: sheetY }]}
        >
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.bsDragArea}>
            <View style={[styles.bsDragHandle, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.bsHeaderText, { color: colors.textSec }]}>
              {loading ? 'Laden …' : `${resultCount} Ergebnis${resultCount !== 1 ? 'se' : ''} in ${RADIUS} km`}
            </Text>
          </View>

          {/* Liste */}
          <FlatList
            data={bottomSheetItems}
            keyExtractor={(item: any) => `${item._type}-${item.id}`}
            renderItem={renderBottomSheetItem}
            contentContainerStyle={styles.bsListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.centerSmall}>
                  <Icon name="compass" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 8 }]}>
                    {segment === 'mitglieder' ? 'Keine Souls in der Naehe' :
                     segment === 'events' ? 'Keine Events in der Naehe' :
                     segment === 'orte' ? 'Keine Soul Places' : 'Noch nichts entdeckt'}
                  </Text>
                </View>
              ) : null
            }
          />
        </Animated.View>
      )}

      {/* FAB */}
      {userId && (segment === 'orte' || segment === 'events') && !isSearchActive && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => segment === 'orte' ? setShowCreatePlace(true) : setShowCreateEvent(true)}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modals */}
      <CreatePlaceModal
        visible={showCreatePlace}
        onClose={() => setShowCreatePlace(false)}
        onCreated={() => { setShowCreatePlace(false); loadDiscoverData(); }}
      />
      <CreateEventModal
        visible={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onCreated={() => { setShowCreateEvent(false); loadDiscoverData(); }}
      />

      {/* Map User Profilkarte */}
      {selectedMapUser && (
        <Modal transparent animationType="slide" onRequestClose={() => setSelectedMapUser(null)}>
          <Pressable style={styles.mapUserOverlay} onPress={() => setSelectedMapUser(null)}>
            <Pressable style={[styles.mapUserSheet, { backgroundColor: colors.bgSolid, borderColor: colors.glassBorder }]} onPress={() => {}}>
              {/* Drag Handle */}
              <View style={styles.mapUserHandleBar}>
                <View style={[styles.mapUserDrag, { backgroundColor: colors.divider }]} />
              </View>

              {/* Avatar + Name */}
              <View style={styles.mapUserHeader}>
                <View style={[styles.mapUserAvatar, { backgroundColor: colors.avatarBg }]}>
                  {selectedMapUser.avatar_url ? (
                    <Image source={{ uri: selectedMapUser.avatar_url }} style={styles.mapUserAvatarImg} />
                  ) : (
                    <Text style={[styles.mapUserInitials, { color: colors.gold }]}>
                      {(selectedMapUser.display_name ?? selectedMapUser.username ?? '?').slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mapUserName, { color: colors.textH }]}>
                    {selectedMapUser.display_name ?? selectedMapUser.username ?? 'Soul'}
                  </Text>
                  {selectedMapUser.username && (
                    <Text style={[styles.mapUserUsername, { color: colors.textMuted }]}>@{selectedMapUser.username}</Text>
                  )}
                  {selectedMapUser.is_first_light && (
                    <Text style={[styles.mapUserFL, { color: colors.gold }]}>✦ First Light</Text>
                  )}
                </View>
              </View>

              {/* Bio */}
              {selectedMapUser.bio ? (
                <Text style={[styles.mapUserBio, { color: colors.textSec }]} numberOfLines={3}>
                  {selectedMapUser.bio}
                </Text>
              ) : null}

              {/* Schliessen */}
              <TouchableOpacity
                style={[styles.mapUserCloseBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                onPress={() => setSelectedMapUser(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.mapUserCloseTxt, { color: colors.textSec }]}>Schließen</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Floating Controls
  floatingControls: {
    position: 'absolute', top: 8, left: 0, right: 0, zIndex: 10,
    gap: 6, paddingHorizontal: 16,
  },

  // Search Overlay
  searchOverlay: {
    position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, zIndex: 15,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  emptyText: { fontSize: 13, textAlign: 'center' },

  // Bottom Sheet (custom Animated)
  bottomSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '100%', // top wird via Animated.Value gesteuert
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  bsDragArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  bsDragHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  bsHeaderText: { fontSize: 12, fontWeight: '500' },
  bsListContent: { paddingHorizontal: 16, paddingBottom: 100 },
  centerSmall: { paddingVertical: 40, alignItems: 'center' },

  // Bottom Sheet Cards
  bsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bsAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  bsAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  bsAvatarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bsIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  bsCardInfo: { flex: 1, gap: 1 },
  bsCardName: { fontSize: 14, fontWeight: '500' },
  bsCardSub: { fontSize: 11 },
  bsAction: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1,
  },
  bsActionText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  flBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, borderWidth: 1,
  },
  flBadgeText: { fontSize: 7, fontWeight: '600', letterSpacing: 1.5 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 16, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#A8894E', alignItems: 'center', justifyContent: 'center', zIndex: 20,
    shadowColor: '#C8A96E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  // Map User Profilkarte
  mapUserOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  mapUserSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  mapUserHandleBar: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  mapUserDrag: { width: 40, height: 4, borderRadius: 2 },
  mapUserHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  mapUserAvatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  mapUserAvatarImg: { width: 64, height: 64, borderRadius: 32 },
  mapUserInitials: { fontSize: 22, fontWeight: '600' },
  mapUserName: { fontSize: 18, fontWeight: '500' },
  mapUserUsername: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  mapUserFL: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 3 },
  mapUserBio: { fontSize: 13, fontWeight: '500', lineHeight: 20, marginBottom: 16 },
  mapUserCloseBtn: {
    alignItems: 'center', paddingVertical: 12, borderRadius: 999, borderWidth: 1, marginTop: 8,
  },
  mapUserCloseTxt: { fontSize: 14, fontWeight: '500' },
});
