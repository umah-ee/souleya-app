import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { searchUsers, type UserSearchResult } from '../../lib/users';
import { sendConnectionRequest, getConnectionStatus } from '../../lib/circles';
import type { ConnectionStatus } from '../../types/circles';

interface UserWithStatus extends UserSearchResult {
  connectionStatus: ConnectionStatus;
  connectionId: string | null;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await searchUsers(q);
      // Status fuer jeden User laden
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
      setResults(withStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const handleConnect = async (user: UserWithStatus) => {
    try {
      await sendConnectionRequest(user.id);
      setResults((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, connectionStatus: 'pending_outgoing' } : u),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'Verbunden';
      case 'pending_outgoing': return 'Angefragt';
      case 'pending_incoming': return 'Antworten';
      default: return 'Verbinden';
    }
  };

  const renderUser = ({ item }: { item: UserWithStatus }) => {
    const name = item.display_name ?? item.username ?? 'Anonym';
    const initial = name.slice(0, 1).toUpperCase();
    const isMe = item.id === session?.user.id;

    return (
      <View style={styles.userCard}>
        <View style={[styles.avatar, item.is_origin_soul && styles.avatarOrigin]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{name}</Text>
            {item.is_origin_soul && (
              <View style={styles.originBadge}>
                <Text style={styles.originBadgeText}>ORIGIN</Text>
              </View>
            )}
          </View>
          {item.username && (
            <Text style={styles.userHandle}>@{item.username}</Text>
          )}
          {item.bio && (
            <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
          )}
        </View>
        {!isMe && (
          <TouchableOpacity
            style={[
              styles.connectBtn,
              item.connectionStatus === 'connected' && styles.connectedBtn,
              item.connectionStatus === 'pending_outgoing' && styles.pendingBtn,
            ]}
            onPress={() => item.connectionStatus === 'none' && handleConnect(item)}
            disabled={item.connectionStatus !== 'none'}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.connectBtnText,
              item.connectionStatus !== 'none' && styles.connectBtnTextMuted,
            ]}>
              {getStatusLabel(item.connectionStatus)}
            </Text>
          </TouchableOpacity>
        )}
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

      {/* Ergebnisse */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C8A96E" />
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Text style={styles.hintTitle}>Entdecke die Community</Text>
          <Text style={styles.hintText}>Suche nach Seelen, um dich zu verbinden.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Keine Ergebnisse fuer "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
        />
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
  hintTitle: { fontSize: 20, fontWeight: '300', color: '#A8894E', marginBottom: 8, letterSpacing: 1 },
  hintText: { fontSize: 13, color: '#5A5450', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#5A5450', textAlign: 'center' },
  listContent: { padding: 16 },
  userCard: {
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
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontSize: 14, color: '#F0EDE8', fontWeight: '500' },
  userHandle: { fontSize: 12, color: '#5A5450', marginTop: 1 },
  userBio: { fontSize: 12, color: '#9A9080', marginTop: 2 },
  originBadge: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(168,137,78,0.3)',
    backgroundColor: 'rgba(168,137,78,0.1)',
  },
  originBadgeText: { fontSize: 7, letterSpacing: 2, color: '#A8894E' },
  connectBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.3)',
  },
  connectedBtn: { borderColor: 'rgba(82,183,136,0.3)', backgroundColor: 'rgba(82,183,136,0.08)' },
  pendingBtn: { borderColor: 'rgba(200,169,110,0.15)' },
  connectBtnText: { fontSize: 9, letterSpacing: 2, color: '#C8A96E' },
  connectBtnTextMuted: { color: '#5A5450' },
});
