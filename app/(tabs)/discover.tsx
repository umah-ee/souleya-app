import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { searchUsers, type UserSearchResult } from '../../lib/users';
import { sendConnectionRequest, getConnectionStatus } from '../../lib/circles';
import { fetchNearbyUsers, fetchEvents, joinEvent, leaveEvent } from '../../lib/events';
import type { ConnectionStatus } from '../../types/circles';
import type { SoEvent } from '../../types/events';
import { Icon } from '../../components/Icon';

type DiscoverTab = 'nearby' | 'events';

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
  const { session } = useAuthStore();
  const userId = session?.user.id;

  // ── Suche ──────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserWithStatus[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Discover (Nearby + Events) ─────────────────────────
  const [tab, setTab] = useState<DiscoverTab>('nearby');
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [events, setEvents] = useState<SoEvent[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [joiningEvent, setJoiningEvent] = useState<Record<string, boolean>>({});

  const isSearchActive = query.trim().length >= 2;

  // ── Discover-Daten laden ───────────────────────────────
  const loadDiscoverData = useCallback(async () => {
    setLoadingNearby(true);
    setLoadingEvents(true);
    try {
      const [nearbyRes, eventsRes] = await Promise.all([
        fetchNearbyUsers(DEFAULT_LAT, DEFAULT_LNG),
        fetchEvents({ lat: DEFAULT_LAT, lng: DEFAULT_LNG }),
      ]);
      setNearbyUsers(nearbyRes.data);
      setEvents(eventsRes.data);
    } catch (e) {
      console.error('Discover laden fehlgeschlagen:', e);
    } finally {
      setLoadingNearby(false);
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadDiscoverData();
  }, [loadDiscoverData]);

  // ── User-Suche (Debounced) ────────────────────────────
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

  // ── Verbinden ─────────────────────────────────────────
  const handleConnect = async (user: UserWithStatus) => {
    try {
      await sendConnectionRequest(user.id);
      setSearchResults((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, connectionStatus: 'pending_outgoing' } : u),
      );
    } catch (e) {
      console.error(e);
    }
  };

  // ── Event beitreten/verlassen ──────────────────────────
  const handleJoinEvent = async (eventId: string) => {
    setJoiningEvent((s) => ({ ...s, [eventId]: true }));
    try {
      const res = await joinEvent(eventId);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, has_joined: true, participants_count: res.participants_count } : e,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setJoiningEvent((s) => ({ ...s, [eventId]: false }));
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    setJoiningEvent((s) => ({ ...s, [eventId]: true }));
    try {
      const res = await leaveEvent(eventId);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, has_joined: false, participants_count: res.participants_count } : e,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setJoiningEvent((s) => ({ ...s, [eventId]: false }));
    }
  };

  // ── Status Label ──────────────────────────────────────
  const getStatusLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'Verbunden';
      case 'pending_outgoing': return 'Angefragt';
      case 'pending_incoming': return 'Antworten';
      default: return 'Verbinden';
    }
  };

  // ── Datum formatieren ─────────────────────────────────
  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
  };

  // ── Suchergebnis rendern ──────────────────────────────
  const renderSearchUser = ({ item }: { item: UserWithStatus }) => {
    const name = item.display_name ?? item.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    const isMe = item.id === userId;
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, item.is_first_light && styles.avatarFirstLight]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            {item.is_first_light && (
              <View style={styles.firstLightBadge}><Text style={styles.firstLightBadgeText}>FIRST LIGHT</Text></View>
            )}
          </View>
          {item.username && <Text style={styles.cardHandle}>@{item.username}</Text>}
          {item.bio && <Text style={styles.cardBio} numberOfLines={1}>{item.bio}</Text>}
        </View>
        {!isMe && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              item.connectionStatus === 'connected' && styles.connectedBtn,
              item.connectionStatus === 'pending_outgoing' && styles.pendingBtn,
            ]}
            onPress={() => item.connectionStatus === 'none' && handleConnect(item)}
            disabled={item.connectionStatus !== 'none'}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, item.connectionStatus !== 'none' && styles.actionBtnTextMuted]}>
              {getStatusLabel(item.connectionStatus)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Nearby User rendern ───────────────────────────────
  const renderNearbyUser = ({ item }: { item: NearbyUser }) => {
    const name = item.display_name ?? item.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, item.is_first_light && styles.avatarFirstLight]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            {item.is_first_light && (
              <View style={styles.firstLightBadge}><Text style={styles.firstLightBadgeText}>FIRST LIGHT</Text></View>
            )}
          </View>
          {item.username && <Text style={styles.cardHandle}>@{item.username}</Text>}
          {item.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Icon name="map-pin" size={11} color={COLORS.textMuted} />
              <Text style={styles.cardMeta}>{item.location}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Event rendern ─────────────────────────────────────
  const renderEvent = ({ item }: { item: SoEvent }) => {
    const creatorName = item.creator?.display_name ?? item.creator?.username ?? 'Anonym';
    const isCreator = userId === item.creator_id;
    const isFull = item.max_participants != null && item.participants_count >= item.max_participants;
    const isJoining = joiningEvent[item.id];

    return (
      <View style={styles.eventCard}>
        {/* Kategorie + Datum */}
        <View style={styles.eventHeader}>
          <View style={[styles.categoryBadge, item.category === 'course' && styles.courseBadge]}>
            <Text style={[styles.categoryText, item.category === 'course' && styles.courseText]}>
              {item.category === 'course' ? 'KURS' : 'MEETUP'}
            </Text>
          </View>
          <Text style={styles.eventDate}>{formatEventDate(item.starts_at)}</Text>
        </View>

        {/* Titel + Beschreibung */}
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
        )}

        {/* Ort */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          <Icon name="map-pin" size={11} color={COLORS.textMuted} />
          <Text style={[styles.eventLocation, { marginBottom: 0 }]}>{item.location_name}</Text>
        </View>

        {/* Footer */}
        <View style={styles.eventFooter}>
          <View style={styles.eventCreator}>
            <Text style={styles.eventCreatorName}>{creatorName}</Text>
            <Text style={styles.eventDot}>·</Text>
            <Text style={styles.eventParticipants}>
              {item.participants_count}{item.max_participants ? `/${item.max_participants}` : ''} Teilnehmer
            </Text>
          </View>
          {userId && !isCreator && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                item.has_joined && styles.leaveBtn,
                isFull && !item.has_joined && styles.fullBtn,
              ]}
              onPress={() => item.has_joined ? handleLeaveEvent(item.id) : handleJoinEvent(item.id)}
              disabled={isJoining || (isFull && !item.has_joined)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, item.has_joined && styles.actionBtnTextMuted]}>
                {isJoining ? '…' : item.has_joined ? 'VERLASSEN' : isFull ? 'VOLL' : 'TEILNEHMEN'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── FULLSCREEN KARTEN-PLATZHALTER (Hintergrund) ──── */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.mapFull}>
          <Icon name="map" size={48} color={COLORS.textMuted} />
          <Text style={styles.mapPlaceholderText}>Karte verfuegbar im Development Build</Text>
        </View>
      </View>

      {/* ── FLOATING HEADER + SUCHE ────────────────────────── */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Icon name="compass" size={22} color={COLORS.goldDeep} />
          <Text style={styles.headerTitle}>DISCOVER</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Souls suchen ..."
            placeholderTextColor="#9A8870"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* ── SUCHE AKTIV → Liste ────────────────────────────── */}
      {isSearchActive ? (
        <View style={[styles.searchOverlay, { paddingTop: insets.top + 100 }]}>
          {searching ? (
            <View style={styles.center}>
              <ActivityIndicator color="#9A7218" />
            </View>
          ) : searchResults.length === 0 && searched ? (
            <View style={styles.center}>
              <Text style={styles.hintTitle}>Keine Ergebnisse</Text>
              <Text style={styles.emptyText}>Versuche einen anderen Suchbegriff.</Text>
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
      ) : (
        /* ── DISCOVER-MODUS: Floating Bottom Cards ─────────── */
        <View style={styles.bottomPanel}>
          {/* Segment Toggle */}
          <View style={styles.segmentRow}>
            {(['nearby', 'events'] as DiscoverTab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.segmentBtn, tab === t && styles.segmentBtnActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>
                  {t === 'nearby' ? `In der Naehe (${nearbyUsers.length})` : `Events (${events.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab: Nearby */}
          {tab === 'nearby' && (
            loadingNearby ? (
              <View style={styles.centerSmall}>
                <ActivityIndicator color="#9A7218" />
              </View>
            ) : nearbyUsers.length === 0 ? (
              <View style={styles.centerSmall}>
                <Text style={styles.hintTitle}>Keine Souls in der Naehe</Text>
                <Text style={styles.emptyText}>
                  Setze deinen Standort im Profil, um Souls in deiner Naehe zu finden.
                </Text>
              </View>
            ) : (
              <FlatList
                data={nearbyUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderNearbyUser}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )
          )}

          {/* Tab: Events */}
          {tab === 'events' && (
            loadingEvents ? (
              <View style={styles.centerSmall}>
                <ActivityIndicator color="#9A7218" />
              </View>
            ) : events.length === 0 ? (
              <View style={styles.centerSmall}>
                <Text style={styles.hintTitle}>Keine Events in der Naehe</Text>
                <Text style={styles.emptyText}>
                  Erstelle ein Meetup oder Kurs, um die Community zu vernetzen.
                </Text>
              </View>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={renderEvent}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )
          )}
        </View>
      )}
    </View>
  );
}

// ── HELLES DESIGN-SYSTEM ──────────────────────────────────
const COLORS = {
  bg:        '#F5EFE6',
  bgCard:    '#EDE4D3',
  card:      'rgba(255,255,255,0.85)',
  cardBorder:'rgba(200,169,110,0.25)',
  gold:      '#C8A96E',
  goldText:  '#9A7218',
  goldDeep:  '#7A6014',
  goldBg:    'rgba(200,169,110,0.12)',
  textH:     '#1E180C',
  textBody:  '#3E3020',
  textSec:   '#7A6040',
  textMuted: '#9A8870',
  avatarBg:  'rgba(200,169,110,0.15)',
  divider:   'rgba(139,105,20,0.12)',
  glass:     'rgba(255,255,255,0.72)',
  success:   '#2D8A56',
  successBg: 'rgba(45,138,86,0.10)',
  purple:    '#7A5FA0',
  purpleBg:  'rgba(122,95,160,0.10)',
  purpleBorder: 'rgba(122,95,160,0.30)',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  centerSmall: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  // ── Fullscreen Karten-Platzhalter ──────────────────────
  mapFull: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  mapPlaceholderText: { fontSize: 12, color: COLORS.textMuted, letterSpacing: 1 },

  // ── Floating Header ────────────────────────────────────
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(245,239,230,0.88)',
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 8,
  },
  headerIcon: { fontSize: 22, color: COLORS.goldDeep },
  headerTitle: { fontSize: 11, letterSpacing: 4, color: COLORS.goldDeep },

  // ── Suche ──────────────────────────────────────────────
  searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: COLORS.glass,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    color: COLORS.textH, fontSize: 14,
  },

  // ── Such-Overlay (deckt Karte ab) ──────────────────────
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
    zIndex: 5,
  },

  // ── Bottom Panel (schwebt ueber Karte) ─────────────────
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: '55%',
    backgroundColor: 'rgba(245,239,230,0.92)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    zIndex: 5,
    // Schatten
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Segment Toggle ─────────────────────────────────────
  segmentRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, marginBottom: 12,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.goldBg,
    borderColor: 'rgba(200,169,110,0.45)',
  },
  segmentText: { fontSize: 10, letterSpacing: 1, color: COLORS.textMuted },
  segmentTextActive: { color: COLORS.goldDeep },

  // ── Listen ─────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  hintTitle: { fontSize: 20, fontWeight: '300', color: COLORS.goldDeep, marginBottom: 8, letterSpacing: 1 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  // ── Karten (User + Nearby) ─────────────────────────────
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder,
    // Leichter Schatten
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.avatarBg,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.3)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarFirstLight: { borderColor: 'rgba(200,169,110,0.6)' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 17, color: COLORS.goldDeep, fontWeight: '300' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 14, color: COLORS.textH, fontWeight: '500' },
  cardHandle: { fontSize: 12, color: COLORS.textSec, marginTop: 1 },
  cardBio: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  firstLightBadge: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.4)', backgroundColor: COLORS.goldBg,
  },
  firstLightBadgeText: { fontSize: 7, letterSpacing: 2, color: COLORS.goldDeep },

  // ── Action Buttons ─────────────────────────────────────
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.4)',
  },
  connectedBtn: { borderColor: 'rgba(45,138,86,0.3)', backgroundColor: 'rgba(45,138,86,0.08)' },
  pendingBtn: { borderColor: 'rgba(200,169,110,0.25)' },
  leaveBtn: { borderColor: 'rgba(139,105,20,0.2)' },
  fullBtn: { borderColor: 'rgba(139,105,20,0.15)', backgroundColor: 'rgba(139,105,20,0.05)' },
  actionBtnText: { fontSize: 8, letterSpacing: 2, color: COLORS.goldDeep },
  actionBtnTextMuted: { color: COLORS.textMuted },

  // ── Event Cards ────────────────────────────────────────
  eventCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.4)',
    backgroundColor: COLORS.goldBg,
  },
  courseBadge: {
    borderColor: COLORS.purpleBorder,
    backgroundColor: COLORS.purpleBg,
  },
  categoryText: { fontSize: 7, letterSpacing: 2, color: COLORS.goldDeep },
  courseText: { color: COLORS.purple },
  eventDate: { fontSize: 11, color: COLORS.textMuted },
  eventTitle: { fontSize: 14, color: COLORS.textH, fontWeight: '500', marginBottom: 4 },
  eventDesc: { fontSize: 12, color: COLORS.textSec, lineHeight: 18, marginBottom: 8 },
  eventLocation: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10 },
  eventFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  eventCreator: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  eventCreatorName: { fontSize: 11, color: COLORS.textSec },
  eventDot: { fontSize: 11, color: COLORS.divider },
  eventParticipants: { fontSize: 11, color: COLORS.textMuted },
});
