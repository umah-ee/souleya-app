import React, { Component, useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal, Animated, Image,
  StyleSheet, Dimensions, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);

// ── Lokale Error Boundary ──

interface BellErrorState { hasError: boolean }

class NotificationBellBoundary extends Component<{ children: React.ReactNode }, BellErrorState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BellErrorState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[NotificationBell] Crash abgefangen:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 6 }}>
          <View style={{ width: 22, height: 22, opacity: 0.4 }} />
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Type → Icon Mapping ──

function typeIcon(type: string): string {
  switch (type) {
    case 'connection_request': return 'users';
    case 'connection_accepted': return 'check';
    case 'pulse_like': return 'heart';
    case 'pulse_comment': return 'message-circle';
    case 'chat_message': return 'send';
    case 'event_reminder': return 'calendar-event';
    case 'soul_level_up': return 'sparkles';
    default: return 'bell';
  }
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `${days} T.`;
  } catch { return ''; }
}

// ── Notification Daten lazy laden ──
// Store-Import wird lazy gemacht um moegliche Modul-Fehler zu isolieren

let _notifStore: any = null;
function getNotifStore() {
  if (!_notifStore) {
    try {
      _notifStore = require('../../store/notifications').useNotificationStore;
    } catch {
      _notifStore = null;
    }
  }
  return _notifStore;
}

// ── Inner Component ──

function NotificationBellInner() {
  const colors = useThemeStore((s) => s.colors);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(-1); // -1 = initialer Load, kein Pulse
  const initialLoadDone = useRef(false);

  // Lazy-load notification store — wenn der Import fehlschlaegt, zeigen wir nur die Glocke
  const store = getNotifStore();
  const notifications: any[] = store ? store((s: any) => s.notifications) ?? [] : [];
  const unreadCount: number = store ? store((s: any) => s.unreadCount) ?? 0 : 0;
  const markRead = store ? store((s: any) => s.markRead) : undefined;
  const markAllRead = store ? store((s: any) => s.markAllRead) : undefined;
  const removeOne = store ? store((s: any) => s.removeOne) : undefined;
  const removeRead = store ? store((s: any) => s.removeRead) : undefined;

  // Pulse animation — nur bei NEUEN Benachrichtigungen, nicht beim initialen Load
  useEffect(() => {
    if (!initialLoadDone.current) {
      // Erster Load: Count merken, kein Pulse
      prevCount.current = unreadCount;
      initialLoadDone.current = true;
      return;
    }
    if (unreadCount > prevCount.current && unreadCount > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  const hasRead = notifications.some((n: any) => n?.is_read);

  const handlePress = useCallback((notif: any) => {
    if (!notif.is_read && markRead) markRead(notif.id);
    setOpen(false);
    if (notif.link) router.push(notif.link as any);
  }, [markRead, router]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notifRow, !item.is_read && { backgroundColor: `${colors.gold}08` }]}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.gold }]} />}
      <View style={styles.avatarWrap}>
        {item.actor_avatar_url ? (
          <Image source={{ uri: item.actor_avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: `${colors.gold}18` }]}>
            <Icon name={typeIcon(item.type) as any} size={16} color={colors.gold} />
          </View>
        )}
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: colors.textH }]} numberOfLines={2}>{item.title}</Text>
        {item.body ? <Text style={[styles.notifBody, { color: colors.textSec }]} numberOfLines={1}>{item.body}</Text> : null}
        <Text style={[styles.notifTime, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => removeOne?.(item.id)} hitSlop={8}>
        <Icon name="x" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.bellBtn} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Icon name="bell" size={22} color={colors.textSec} />
        </Animated.View>
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: '#E53E3E' }]}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.panel, { backgroundColor: colors.bgSolid, borderColor: colors.divider }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.textH }]}>Benachrichtigungen</Text>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={() => markAllRead?.()} hitSlop={8}>
                  <Text style={[styles.headerAction, { color: colors.gold }]}>Alle gelesen</Text>
                </TouchableOpacity>
              )}
              {hasRead && (
                <TouchableOpacity onPress={() => removeRead?.()} hitSlop={8}>
                  <Text style={[styles.headerAction, { color: colors.textMuted }]}>Gelesene loeschen</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bell" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Noch keine Benachrichtigungen</Text>
            </View>
          ) : (
            <FlatList data={notifications} keyExtractor={(n) => n.id} renderItem={renderItem} showsVerticalScrollIndicator={false} style={styles.list} />
          )}
        </View>
      </Modal>
    </>
  );
}

// ── Export mit Error Boundary ──

export default function NotificationBell() {
  return (
    <NotificationBellBoundary>
      <NotificationBellInner />
    </NotificationBellBoundary>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  bellBtn: { position: 'relative', padding: 6 },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: { position: 'absolute', top: Platform.select({ ios: 54, android: 40 }), right: 12, width: PANEL_WIDTH, maxHeight: 460, borderRadius: 8, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  panelHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  panelTitle: { fontSize: 16, fontWeight: '600', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontStyle: 'italic', marginBottom: 6 },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerAction: { fontSize: 12, fontWeight: '500' },
  list: { maxHeight: 380 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  unreadDot: { position: 'absolute', left: 6, top: 20, width: 6, height: 6, borderRadius: 3 },
  avatarWrap: { width: 36, height: 36 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  notifBody: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  notifTime: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  deleteBtn: { padding: 4, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, fontWeight: '500' },
});
