import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { searchUsers, type UserSearchResult } from '../../lib/users';
import { sendConnectionRequest, getConnectionStatus } from '../../lib/circles';
import { fetchNearbyUsers, fetchEvents, joinEvent, leaveEvent } from '../../lib/events';
import type { ConnectionStatus } from '../../types/circles';
import type { SoEvent } from '../../types/events';

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
  vip_level: number;
  is_origin_soul: boolean;
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
        <View style={[styles.avatar, item.is_origin_soul && styles.avatarOrigin]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            {item.is_origin_soul && (
              <View style={styles.originBadge}><Text style={styles.originBadgeText}>ORIGIN</Text></View>
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
        <View style={[styles.avatar, item.is_origin_soul && styles.avatarOrigin]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            {item.is_origin_soul && (
              <View style={styles.originBadge}><Text style={styles.originBadgeText}>ORIGIN</Text></View>
            )}
          </View>
          {item.username && <Text style={styles.cardHandle}>@{item.username}</Text>}
          {item.location && <Text style={styles.cardMeta}>📍 {item.location}</Text>}
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
        <Text style={styles.eventLocation}>📍 {item.location_name}</Text>

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>◈</Text>
        <Text style={styles.headerTitle}>DISCOVER</Text>
      </View>

      {/* Suche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Suche nach Namen oder @username …"
          placeholderTextColor="#5A5450"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* ── SUCHE AKTIV ─────────────────────────────────── */}
      {isSearchActive ? (
        searching ? (
          <View style={styles.center}>
            <ActivityIndicator color="#C8A96E" />
          </View>
        ) : searchResults.length === 0 && searched ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Keine Ergebnisse</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderSearchUser}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : (
        /* ── DISCOVER-MODUS ─────────────────────────────── */
        <>
          {/* Karten-Platzhalter (fuer @rnmapbox/maps im Dev-Build) */}
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
            <Text style={styles.mapPlaceholderText}>Karte verfuegbar im Development Build</Text>
          </View>

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
              <View style={styles.center}>
                <ActivityIndicator color="#C8A96E" />
              </View>
            ) : nearbyUsers.length === 0 ? (
              <View style={styles.center}>
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
              />
            )
          )}

          {/* Tab: Events */}
          {tab === 'events' && (
            loadingEvents ? (
              <View style={styles.center}>
                <ActivityIndicator color="#C8A96E" />
              </View>
            ) : events.length === 0 ? (
              <View style={styles.center}>
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
              />
            )
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#18161F' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.08)',
  },
  headerIcon: { fontSize: 22, color: '#C8A96E' },
  headerTitle: { fontSize: 11, letterSpacing: 4, color: '#C8A96E' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    color: '#F0EDE8', fontSize: 14,
  },

  // Karten-Platzhalter
  mapPlaceholder: {
    marginHorizontal: 16, marginBottom: 12, height: 160,
    backgroundColor: '#2C2A35', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  mapPlaceholderIcon: { fontSize: 32, marginBottom: 8 },
  mapPlaceholderText: { fontSize: 11, color: '#5A5450', letterSpacing: 1 },

  // Segment Toggle
  segmentRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, marginBottom: 12,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#2C2A35', borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(200,169,110,0.12)',
    borderColor: 'rgba(200,169,110,0.25)',
  },
  segmentText: { fontSize: 10, letterSpacing: 1, color: '#5A5450' },
  segmentTextActive: { color: '#C8A96E' },

  // Listen
  listContent: { padding: 16 },
  hintTitle: { fontSize: 20, fontWeight: '300', color: '#A8894E', marginBottom: 8, letterSpacing: 1 },
  emptyText: { fontSize: 13, color: '#5A5450', textAlign: 'center' },

  // Karten (User + Nearby)
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#2C2A35', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(200,169,110,0.12)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarOrigin: { borderColor: 'rgba(200,169,110,0.5)' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 17, color: '#C8A96E', fontWeight: '300' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 14, color: '#F0EDE8', fontWeight: '500' },
  cardHandle: { fontSize: 12, color: '#5A5450', marginTop: 1 },
  cardBio: { fontSize: 12, color: '#9A9080', marginTop: 2 },
  cardMeta: { fontSize: 11, color: '#9A9080', marginTop: 2 },
  originBadge: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(168,137,78,0.3)', backgroundColor: 'rgba(168,137,78,0.1)',
  },
  originBadgeText: { fontSize: 7, letterSpacing: 2, color: '#A8894E' },

  // Action Buttons
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.3)',
  },
  connectedBtn: { borderColor: 'rgba(82,183,136,0.3)', backgroundColor: 'rgba(82,183,136,0.08)' },
  pendingBtn: { borderColor: 'rgba(200,169,110,0.15)' },
  leaveBtn: { borderColor: 'rgba(90,84,80,0.3)' },
  fullBtn: { borderColor: 'rgba(90,84,80,0.15)', backgroundColor: 'rgba(90,84,80,0.08)' },
  actionBtnText: { fontSize: 8, letterSpacing: 2, color: '#C8A96E' },
  actionBtnTextMuted: { color: '#5A5450' },

  // Event Cards
  eventCard: {
    backgroundColor: '#2C2A35', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
  },
  eventHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.3)',
    backgroundColor: 'rgba(200,169,110,0.1)',
  },
  courseBadge: {
    borderColor: 'rgba(155,114,207,0.3)',
    backgroundColor: 'rgba(155,114,207,0.1)',
  },
  categoryText: { fontSize: 7, letterSpacing: 2, color: '#C8A96E' },
  courseText: { color: '#9B72CF' },
  eventDate: { fontSize: 11, color: '#5A5450' },
  eventTitle: { fontSize: 14, color: '#F0EDE8', fontWeight: '500', marginBottom: 4 },
  eventDesc: { fontSize: 12, color: '#5A5450', lineHeight: 18, marginBottom: 8 },
  eventLocation: { fontSize: 11, color: '#9A9080', marginBottom: 10 },
  eventFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.06)',
  },
  eventCreator: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  eventCreatorName: { fontSize: 11, color: '#5A5450' },
  eventDot: { fontSize: 11, color: 'rgba(90,84,80,0.5)' },
  eventParticipants: { fontSize: 11, color: '#5A5450' },
});
