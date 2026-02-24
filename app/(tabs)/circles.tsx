import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import {
  fetchCircleFeed, getConnections, getIncomingRequests, getOutgoingRequests,
  respondToRequest, cancelRequest, removeConnection,
} from '../../lib/circles';
import type { Connection } from '../../types/circles';
import type { Pulse } from '../../types/pulse';
import PulseCard from '../../components/PulseCard';
import { Icon } from '../../components/Icon';

type Tab = 'feed' | 'connections' | 'requests';

export default function CirclesScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const userId = session?.user.id;
  const [tab, setTab] = useState<Tab>('feed');

  // Feed
  const [feedPulses, setFeedPulses] = useState<Pulse[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);

  // Verbindungen
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connLoading, setConnLoading] = useState(true);

  // Anfragen
  const [incoming, setIncoming] = useState<Connection[]>([]);
  const [outgoing, setOutgoing] = useState<Connection[]>([]);
  const [reqLoading, setReqLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const { pulses } = await fetchCircleFeed();
      setFeedPulses(pulses);
    } catch (e) { console.error(e); }
    finally { setFeedLoading(false); }
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const { data } = await getConnections();
      setConnections(data);
    } catch (e) { console.error(e); }
    finally { setConnLoading(false); }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const [inc, out] = await Promise.all([getIncomingRequests(), getOutgoingRequests()]);
      setIncoming(inc.data);
      setOutgoing(out.data);
    } catch (e) { console.error(e); }
    finally { setReqLoading(false); }
  }, []);

  useEffect(() => {
    loadFeed();
    loadConnections();
    loadRequests();
  }, [loadFeed, loadConnections, loadRequests]);

  const handleRefreshFeed = async () => {
    setFeedRefreshing(true);
    await loadFeed();
    setFeedRefreshing(false);
  };

  const handleAccept = async (conn: Connection) => {
    try {
      await respondToRequest(conn.id, 'accepted');
      setIncoming((prev) => prev.filter((c) => c.id !== conn.id));
      loadConnections();
    } catch (e) { console.error(e); }
  };

  const handleDecline = async (conn: Connection) => {
    try {
      await respondToRequest(conn.id, 'declined');
      setIncoming((prev) => prev.filter((c) => c.id !== conn.id));
    } catch (e) { console.error(e); }
  };

  const handleCancelRequest = async (conn: Connection) => {
    try {
      await cancelRequest(conn.id);
      setOutgoing((prev) => prev.filter((c) => c.id !== conn.id));
    } catch (e) { console.error(e); }
  };

  const handleRemoveConnection = (conn: Connection) => {
    const name = conn.profile.display_name ?? conn.profile.username ?? 'diesen Kontakt';
    Alert.alert('Verbindung entfernen', `${name} wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen', style: 'destructive',
        onPress: async () => {
          try {
            await removeConnection(conn.id);
            setConnections((prev) => prev.filter((c) => c.id !== conn.id));
          } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  const handleDeletePulse = (id: string) => {
    setFeedPulses((prev) => prev.filter((p) => p.id !== id));
  };

  // Verbindungskarte
  const renderConnection = ({ item }: { item: Connection }) => {
    const name = item.profile.display_name ?? item.profile.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, item.profile.is_first_light && styles.avatarFirstLight]}>
          {item.profile.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{name}</Text>
          {item.profile.username && (
            <Text style={styles.cardHandle}>@{item.profile.username}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemoveConnection(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.removeBtnText}>ENTFERNEN</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Eingehende Anfrage
  const renderIncoming = ({ item }: { item: Connection }) => {
    const name = item.profile.display_name ?? item.profile.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, item.profile.is_first_light && styles.avatarFirstLight]}>
          {item.profile.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardMeta}>moechte sich verbinden</Text>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)} activeOpacity={0.7}>
            <Icon name="check" size={16} color="#52B788" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item)} activeOpacity={0.7}>
            <Icon name="x" size={14} color="#5A5450" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Ausgehende Anfrage
  const renderOutgoing = ({ item }: { item: Connection }) => {
    const name = item.profile.display_name ?? item.profile.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, item.profile.is_first_light && styles.avatarFirstLight]}>
          {item.profile.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardMeta}>Anfrage ausstehend</Text>
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelRequest(item)} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>ZURUECK</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="users" size={22} color="#C8A96E" />
        <Text style={styles.headerTitle}>KONTAKTE</Text>
      </View>

      {/* Tab-Leiste */}
      <View style={styles.tabs}>
        {(['feed', 'connections', 'requests'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'feed' ? 'Feed' : t === 'connections' ? 'Verbindungen' : 'Anfragen'}
            </Text>
            {t === 'requests' && incoming.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{incoming.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab-Inhalte */}
      {tab === 'feed' && (
        feedLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#C8A96E" />
          </View>
        ) : feedPulses.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Dein Circle ist noch leer</Text>
            <Text style={styles.emptyText}>Verbinde dich mit anderen, um ihren Pulse hier zu sehen.</Text>
          </View>
        ) : (
          <FlatList
            data={feedPulses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PulseCard pulse={item} currentUserId={userId} onDelete={handleDeletePulse} />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={feedRefreshing} onRefresh={handleRefreshFeed} tintColor="#C8A96E" />
            }
          />
        )
      )}

      {tab === 'connections' && (
        connLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#C8A96E" />
          </View>
        ) : connections.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Noch keine Verbindungen</Text>
          </View>
        ) : (
          <FlatList
            data={connections}
            keyExtractor={(item) => item.id}
            renderItem={renderConnection}
            contentContainerStyle={styles.listContent}
          />
        )
      )}

      {tab === 'requests' && (
        reqLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#C8A96E" />
          </View>
        ) : incoming.length === 0 && outgoing.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Keine offenen Anfragen</Text>
          </View>
        ) : (
          <FlatList
            data={[...incoming.map((c) => ({ ...c, _type: 'incoming' as const })), ...outgoing.map((c) => ({ ...c, _type: 'outgoing' as const }))]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              item._type === 'incoming' ? renderIncoming({ item }) : renderOutgoing({ item })
            }
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              incoming.length > 0 && outgoing.length > 0 ? (
                <Text style={styles.sectionHeader}>EINGEHEND</Text>
              ) : null
            }
          />
        )
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
  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(200,169,110,0.12)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)',
  },
  tabText: { fontSize: 11, letterSpacing: 1, color: '#5A5450' },
  tabTextActive: { color: '#C8A96E' },
  badge: {
    backgroundColor: '#C8A96E', borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 18,
    alignItems: 'center',
  },
  badgeText: { fontSize: 9, color: '#1E1C26', fontWeight: '600' },
  listContent: { padding: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '300', color: '#A8894E', marginBottom: 8, letterSpacing: 1 },
  emptyText: { fontSize: 13, color: '#5A5450', textAlign: 'center' },
  sectionHeader: {
    fontSize: 9, letterSpacing: 3, color: '#5A5450',
    marginBottom: 12, marginTop: 4,
  },
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
  avatarFirstLight: { borderColor: 'rgba(200,169,110,0.5)' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 17, color: '#C8A96E', fontWeight: '300' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, color: '#F0EDE8', fontWeight: '500' },
  cardHandle: { fontSize: 12, color: '#5A5450', marginTop: 1 },
  cardMeta: { fontSize: 11, color: '#9A9080', marginTop: 2 },
  removeBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1, borderColor: 'rgba(90,84,80,0.3)',
  },
  removeBtnText: { fontSize: 8, letterSpacing: 2, color: '#5A5450' },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(82,183,136,0.15)',
    borderWidth: 1, borderColor: 'rgba(82,183,136,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 16, color: '#52B788' },
  declineBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(90,84,80,0.15)',
    borderWidth: 1, borderColor: 'rgba(90,84,80,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { fontSize: 14, color: '#5A5450' },
  cancelBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)',
  },
  cancelBtnText: { fontSize: 8, letterSpacing: 2, color: '#5A5450' },
});
