import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { searchUsers, type UserSearchResult } from '../../lib/users';
import { sendConnectionRequest, getConnectionStatus } from '../../lib/circles';
import { fetchNearbyUsers, fetchEvents, joinEvent, leaveEvent } from '../../lib/events';
import { fetchNearbyPlaces, savePlace, unsavePlace, PLACE_TAGS } from '../../lib/places';
import type { ConnectionStatus } from '../../types/circles';
import type { SoEvent } from '../../types/events';
import type { Place } from '../../types/places';
import { Icon } from '../../components/Icon';
import CreatePlaceModal from '../../components/discover/CreatePlaceModal';

type Segment = 'alle' | 'mitglieder' | 'events' | 'orte';

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

// Muenchen als Standard
const DEFAULT_LAT = 48.137;
const DEFAULT_LNG = 11.576;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const userId = session?.user.id;

  // ── Segment + Tags ─────────────────────────────────────
  const [segment, setSegment] = useState<Segment>('alle');
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
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [joiningEvent, setJoiningEvent] = useState<Record<string, boolean>>({});
  const [savingPlace, setSavingPlace] = useState<Record<string, boolean>>({});
  const [showCreatePlace, setShowCreatePlace] = useState(false);

  const isSearchActive = query.trim().length >= 2;

  // ── Daten laden ────────────────────────────────────────
  const loadDiscoverData = useCallback(async () => {
    setLoadingNearby(true);
    setLoadingEvents(true);
    setLoadingPlaces(true);
    try {
      const [nearbyRes, eventsRes, placesRes] = await Promise.all([
        fetchNearbyUsers(DEFAULT_LAT, DEFAULT_LNG),
        fetchEvents({ lat: DEFAULT_LAT, lng: DEFAULT_LNG }),
        fetchNearbyPlaces(DEFAULT_LAT, DEFAULT_LNG, undefined, activeTags.length > 0 ? activeTags : undefined),
      ]);
      setNearbyUsers(nearbyRes.data);
      setEvents(eventsRes.data);
      setPlaces(placesRes);
    } catch (e) {
      console.error('Discover laden fehlgeschlagen:', e);
    } finally {
      setLoadingNearby(false);
      setLoadingEvents(false);
      setLoadingPlaces(false);
    }
  }, [activeTags]);

  useEffect(() => {
    loadDiscoverData();
  }, [loadDiscoverData]);

  // ── Tag Toggle ─────────────────────────────────────────
  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // ── User-Suche (Debounced) ─────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      setSearched(false);
      return;
    }
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
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // ── Verbinden ──────────────────────────────────────────
  const handleConnect = async (user: UserWithStatus) => {
    try {
      await sendConnectionRequest(user.id);
      setSearchResults((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, connectionStatus: 'pending_outgoing' } : u),
      );
    } catch (e) { console.error(e); }
  };

  // ── Event beitreten/verlassen ──────────────────────────
  const handleJoinEvent = async (eventId: string) => {
    setJoiningEvent((s) => ({ ...s, [eventId]: true }));
    try {
      const res = await joinEvent(eventId);
      setEvents((prev) =>
        prev.map((e) => e.id === eventId ? { ...e, has_joined: true, participants_count: res.participants_count } : e),
      );
    } catch (e) { console.error(e); }
    finally { setJoiningEvent((s) => ({ ...s, [eventId]: false })); }
  };

  const handleLeaveEvent = async (eventId: string) => {
    setJoiningEvent((s) => ({ ...s, [eventId]: true }));
    try {
      const res = await leaveEvent(eventId);
      setEvents((prev) =>
        prev.map((e) => e.id === eventId ? { ...e, has_joined: false, participants_count: res.participants_count } : e),
      );
    } catch (e) { console.error(e); }
    finally { setJoiningEvent((s) => ({ ...s, [eventId]: false })); }
  };

  // ── Place speichern ────────────────────────────────────
  const handleSavePlace = async (placeId: string) => {
    setSavingPlace((s) => ({ ...s, [placeId]: true }));
    try {
      await savePlace(placeId);
      setPlaces((prev) => prev.map((p) => p.id === placeId ? { ...p, is_saved: true } : p));
    } catch (e) { console.error(e); }
    finally { setSavingPlace((s) => ({ ...s, [placeId]: false })); }
  };

  const handleUnsavePlace = async (placeId: string) => {
    setSavingPlace((s) => ({ ...s, [placeId]: true }));
    try {
      await unsavePlace(placeId);
      setPlaces((prev) => prev.map((p) => p.id === placeId ? { ...p, is_saved: false } : p));
    } catch (e) { console.error(e); }
    finally { setSavingPlace((s) => ({ ...s, [placeId]: false })); }
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

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon key={i} name={i <= Math.round(rating) ? 'star-filled' : 'star'} size={12} color={i <= Math.round(rating) ? colors.gold : colors.textMuted} />,
      );
    }
    return stars;
  };

  // ── Renderers ──────────────────────────────────────────
  const renderSearchUser = ({ item }: { item: UserWithStatus }) => {
    const name = item.display_name ?? item.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    const isMe = item.id === userId;
    return (
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={[styles.avatar, { backgroundColor: colors.avatarBg, borderColor: colors.goldBorderS }, item.is_first_light && { borderColor: colors.goldBorder }]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.goldDeep }]}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, { color: colors.textH }]} numberOfLines={1}>{name}</Text>
            {item.is_first_light && (
              <View style={[styles.firstLightBadge, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
                <Text style={[styles.firstLightBadgeText, { color: colors.goldDeep }]}>FIRST LIGHT</Text>
              </View>
            )}
          </View>
          {item.username && <Text style={[styles.cardHandle, { color: colors.textSec }]}>@{item.username}</Text>}
          {item.bio && <Text style={[styles.cardBio, { color: colors.textMuted }]} numberOfLines={1}>{item.bio}</Text>}
        </View>
        {!isMe && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.goldBorder }, item.connectionStatus === 'connected' && { borderColor: `${colors.success}44`, backgroundColor: `${colors.success}14` }, item.connectionStatus === 'pending_outgoing' && { borderColor: colors.goldBorderS }]}
            onPress={() => item.connectionStatus === 'none' && handleConnect(item)}
            disabled={item.connectionStatus !== 'none'}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: colors.goldDeep }, item.connectionStatus !== 'none' && { color: colors.textMuted }]}>
              {getStatusLabel(item.connectionStatus)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderNearbyUser = ({ item }: { item: NearbyUser }) => {
    const name = item.display_name ?? item.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    return (
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={[styles.avatar, { backgroundColor: colors.avatarBg, borderColor: colors.goldBorderS }, item.is_first_light && { borderColor: colors.goldBorder }]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.goldDeep }]}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, { color: colors.textH }]} numberOfLines={1}>{name}</Text>
            {item.is_first_light && (
              <View style={[styles.firstLightBadge, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
                <Text style={[styles.firstLightBadgeText, { color: colors.goldDeep }]}>FIRST LIGHT</Text>
              </View>
            )}
          </View>
          {item.username && <Text style={[styles.cardHandle, { color: colors.textSec }]}>@{item.username}</Text>}
          {item.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Icon name="map-pin" size={11} color={colors.textMuted} />
              <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.location}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEvent = ({ item }: { item: SoEvent }) => {
    const creatorName = item.creator?.display_name ?? item.creator?.username ?? 'Anonym';
    const isCreator = userId === item.creator_id;
    const isFull = item.max_participants != null && item.participants_count >= item.max_participants;
    const isJoining = joiningEvent[item.id];
    return (
      <View style={[styles.eventCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={styles.eventHeader}>
          <View style={[styles.categoryBadge, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
            <Text style={[styles.categoryText, { color: colors.goldDeep }]}>{item.category === 'course' ? 'KURS' : 'MEETUP'}</Text>
          </View>
          <Text style={[styles.eventDate, { color: colors.textMuted }]}>{formatEventDate(item.starts_at)}</Text>
        </View>
        <Text style={[styles.eventTitle, { color: colors.textH }]}>{item.title}</Text>
        {item.description && <Text style={[styles.eventDesc, { color: colors.textSec }]} numberOfLines={2}>{item.description}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          <Icon name="map-pin" size={11} color={colors.textMuted} />
          <Text style={[styles.eventLocation, { color: colors.textMuted }]}>{item.location_name}</Text>
        </View>
        <View style={[styles.eventFooter, { borderTopColor: colors.divider }]}>
          <View style={styles.eventCreator}>
            <Text style={[styles.eventCreatorName, { color: colors.textSec }]}>{creatorName}</Text>
            <Text style={{ fontSize: 11, color: colors.divider }}>·</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {item.participants_count}{item.max_participants ? `/${item.max_participants}` : ''} Teilnehmer
            </Text>
          </View>
          {userId && !isCreator && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.goldBorder }, item.has_joined && { borderColor: colors.goldBorderS }, isFull && !item.has_joined && { borderColor: colors.goldBorderS, backgroundColor: colors.goldBg }]}
              onPress={() => item.has_joined ? handleLeaveEvent(item.id) : handleJoinEvent(item.id)}
              disabled={isJoining || (isFull && !item.has_joined)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: colors.goldDeep }, item.has_joined && { color: colors.textMuted }]}>
                {isJoining ? '...' : item.has_joined ? 'VERLASSEN' : isFull ? 'VOLL' : 'TEILNEHMEN'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPlace = ({ item }: { item: Place }) => {
    const saving = savingPlace[item.id];
    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
        onPress={() => router.push(`/places/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {item.cover_url && <Image source={{ uri: item.cover_url }} style={styles.placeCover} />}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tagBadge, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}>
                <Text style={[styles.tagText, { color: colors.goldDeep }]}>{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && <Text style={[styles.tagMore, { color: colors.textMuted }]}>+{item.tags.length - 3}</Text>}
          </View>
        )}
        <Text style={[styles.eventTitle, { color: colors.textH }]}>{item.name}</Text>
        <View style={styles.ratingRow}>
          {renderStars(item.avg_rating)}
          <Text style={[styles.ratingText, { color: colors.textSec }]}>{item.avg_rating > 0 ? item.avg_rating.toFixed(1) : '—'}</Text>
          <Text style={[styles.ratingCount, { color: colors.textMuted }]}>({item.reviews_count})</Text>
        </View>
        {(item.address || item.city) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <Icon name="map-pin" size={11} color={colors.textMuted} />
            <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{item.address ?? item.city}</Text>
          </View>
        )}
        <View style={[styles.placeFooter, { borderTopColor: colors.divider }]}>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.saves_count} gespeichert</Text>
          <TouchableOpacity onPress={() => item.is_saved ? handleUnsavePlace(item.id) : handleSavePlace(item.id)} disabled={saving} activeOpacity={0.7}>
            <Icon name={item.is_saved ? 'bookmark-filled' : 'bookmark'} size={18} color={item.is_saved ? colors.gold : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Segment Config ─────────────────────────────────────
  const SEGMENTS: { key: Segment; label: string; icon: 'map' | 'users' | 'compass' | 'building' }[] = [
    { key: 'alle', label: 'Alle', icon: 'map' },
    { key: 'mitglieder', label: 'Mitglieder', icon: 'users' },
    { key: 'events', label: 'Events', icon: 'compass' },
    { key: 'orte', label: 'Orte', icon: 'building' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bgGradientStart }]}>
      {/* Fullscreen Karten-Platzhalter */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.mapFull, { backgroundColor: colors.bgGradientEnd }]}>
          <Icon name="map" size={48} color={colors.textMuted} />
          <Text style={[styles.mapPlaceholderText, { color: colors.textMuted }]}>Karte verfuegbar im Development Build</Text>
        </View>
      </View>

      {/* Floating Header */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 12, backgroundColor: `${colors.bgGradientStart}DD` }]}>
        <View style={styles.headerRow}>
          <Icon name="compass" size={22} color={colors.goldDeep} />
          <Text style={[styles.headerTitle, { color: colors.goldDeep }]}>DISCOVER</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.glass, borderColor: colors.glassBorder, color: colors.textH }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Souls suchen ..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Segment Toggle */}
        {!isSearchActive && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
            {SEGMENTS.map((seg) => (
              <TouchableOpacity
                key={seg.key}
                style={[styles.segmentBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }, segment === seg.key && { backgroundColor: colors.goldBg, borderColor: colors.goldBorder }]}
                onPress={() => setSegment(seg.key)}
                activeOpacity={0.7}
              >
                <Icon name={seg.icon} size={12} color={segment === seg.key ? colors.goldDeep : colors.textMuted} />
                <Text style={[styles.segmentText, { color: colors.textMuted }, segment === seg.key && { color: colors.goldDeep }]}>
                  {seg.label}
                  {seg.key === 'mitglieder' && nearbyUsers.length > 0 ? ` (${nearbyUsers.length})` : ''}
                  {seg.key === 'events' && events.length > 0 ? ` (${events.length})` : ''}
                  {seg.key === 'orte' && places.length > 0 ? ` (${places.length})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Tag Filter */}
        {!isSearchActive && (segment === 'orte' || segment === 'alle') && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsFilterRow}>
            {PLACE_TAGS.slice(0, 15).map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagFilterBtn, { borderColor: colors.divider }, activeTags.includes(tag) && { backgroundColor: colors.goldBg, borderColor: colors.goldBorder }]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagFilterText, { color: colors.textMuted }, activeTags.includes(tag) && { color: colors.goldDeep }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Suche */}
      {isSearchActive ? (
        <View style={[styles.searchOverlay, { paddingTop: insets.top + 100, backgroundColor: colors.bgGradientStart }]}>
          {searching ? (
            <View style={styles.center}><ActivityIndicator color={colors.goldText} /></View>
          ) : searchResults.length === 0 && searched ? (
            <View style={styles.center}>
              <Text style={[styles.hintTitle, { color: colors.goldDeep }]}>Keine Ergebnisse</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Versuche einen anderen Suchbegriff.</Text>
            </View>
          ) : (
            <FlatList data={searchResults} keyExtractor={(item) => item.id} renderItem={renderSearchUser} contentContainerStyle={styles.listContent} />
          )}
        </View>
      ) : segment === 'alle' ? null : (
        <View style={[styles.bottomPanel, { backgroundColor: `${colors.bgGradientStart}EE` }]}>
          {segment === 'mitglieder' && (
            loadingNearby ? <View style={styles.centerSmall}><ActivityIndicator color={colors.goldText} /></View>
            : nearbyUsers.length === 0 ? (
              <View style={styles.centerSmall}>
                <Text style={[styles.hintTitle, { color: colors.goldDeep }]}>Keine Souls in der Naehe</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Setze deinen Standort im Profil.</Text>
              </View>
            ) : <FlatList data={nearbyUsers} keyExtractor={(item) => item.id} renderItem={renderNearbyUser} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
          )}
          {segment === 'events' && (
            loadingEvents ? <View style={styles.centerSmall}><ActivityIndicator color={colors.goldText} /></View>
            : events.length === 0 ? (
              <View style={styles.centerSmall}>
                <Text style={[styles.hintTitle, { color: colors.goldDeep }]}>Keine Events in der Naehe</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Erstelle ein Meetup oder Kurs.</Text>
              </View>
            ) : <FlatList data={events} keyExtractor={(item) => item.id} renderItem={renderEvent} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
          )}
          {segment === 'orte' && (
            loadingPlaces ? <View style={styles.centerSmall}><ActivityIndicator color={colors.goldText} /></View>
            : places.length === 0 ? (
              <View style={styles.centerSmall}>
                <Text style={[styles.hintTitle, { color: colors.goldDeep }]}>Keine Soul Places</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>In dieser Gegend gibt es noch keine Orte.</Text>
              </View>
            ) : <FlatList data={places} keyExtractor={(item) => item.id} renderItem={renderPlace} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
          )}
        </View>
      )}

      {/* FAB – Place erstellen (nur bei Orte-Segment) */}
      {userId && segment === 'orte' && !isSearchActive && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreatePlace(true)}
          activeOpacity={0.8}
        >
          <Icon name="map-pin" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* CreatePlaceModal */}
      <CreatePlaceModal
        visible={showCreatePlace}
        onClose={() => setShowCreatePlace(false)}
        onCreated={() => {
          setShowCreatePlace(false);
          loadDiscoverData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  centerSmall: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mapFull: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapPlaceholderText: { fontSize: 12, letterSpacing: 1 },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 11, letterSpacing: 4 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  searchOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '55%',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, zIndex: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  segmentRow: { paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  segmentText: { fontSize: 10, letterSpacing: 0.8 },
  tagsFilterRow: { paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  tagFilterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  tagFilterText: { fontSize: 9, letterSpacing: 0.5 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  hintTitle: { fontSize: 20, fontWeight: '400', marginBottom: 8, letterSpacing: 1 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 17, fontWeight: '400' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 14, fontWeight: '500' },
  cardHandle: { fontSize: 12, marginTop: 1 },
  cardBio: { fontSize: 12, marginTop: 2 },
  cardMeta: { fontSize: 11, marginTop: 2 },
  firstLightBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 99, borderWidth: 1 },
  firstLightBadgeText: { fontSize: 7, letterSpacing: 2 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  actionBtnText: { fontSize: 8, letterSpacing: 2 },
  eventCard: {
    borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, borderWidth: 1 },
  categoryText: { fontSize: 7, letterSpacing: 2 },
  eventDate: { fontSize: 11 },
  eventTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  eventDesc: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  eventLocation: { fontSize: 11 },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  eventCreator: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  eventCreatorName: { fontSize: 11 },
  placeCover: { width: '100%', height: 120, borderRadius: 12, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, borderWidth: 1 },
  tagText: { fontSize: 8, letterSpacing: 1 },
  tagMore: { fontSize: 9, marginLeft: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  ratingText: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
  ratingCount: { fontSize: 10 },
  placeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  fab: {
    position: 'absolute', bottom: 24, right: 16, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#A8894E', alignItems: 'center', justifyContent: 'center', zIndex: 20,
    shadowColor: '#C8A96E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
