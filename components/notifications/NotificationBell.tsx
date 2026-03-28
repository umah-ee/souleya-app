import React, { Component, useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal, Animated, Image,
  StyleSheet, Dimensions, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme';
import { useNotificationStore } from '../../store/notifications';
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
      // Fallback: Glocke ohne Badge anzeigen (statt unsichtbar)
      return (
        <View style={{ padding: 6 }}>
          <FallbackBellIcon />
        </View>
      );
    }
    return this.props.children;
  }
}

/** Statische Glocke ohne Store-Abhaengigkeit (Fallback bei Crash) */
function FallbackBellIcon() {
  try {
    const colors = useThemeStore((s) => s.colors);
    return <Icon name="bell" size={22} color={colors?.textSec ?? '#8A8480'} />;
  } catch {
    return <Icon name="bell" size={22} color="#8A8480" />;
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
    case 'incoming_call': return 'phone';
    case 'missed_call': return 'phone-off';
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

// ── Inner Component ──

function NotificationBellInner() {
  // Alle Store-Zugriffe defensiv mit Fallback-Werten
  let colors: any;
  try { colors = useThemeStore((s) => s.colors); } catch { colors = null; }
  if (!colors) colors = { textSec: '#8A8480', gold: '#C8A96E', textH: '#F0E8D8', textMuted: '#5A5450', bgSolid: '#1A1A1A', divider: '#333' };

  const [open, setOpen] = useState(false);

  let router: any;
  try { router = useRouter(); } catch { router = null; }

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(-1);
  const initialLoadDone = useRef(false);

  // Store-Zugriffe einzeln mit Fallback
  let rawNotifications: any;
  let unreadCount = 0;
  let markRead: ((id: string) => Promise<void>) | undefined;
  let markAllRead: (() => Promise<void>) | undefined;
  let removeOne: ((id: string) => Promise<void>) | undefined;
  let removeRead: (() => Promise<void>) | undefined;

  try {
    rawNotifications = useNotificationStore((s) => s.notifications);
    unreadCount = useNotificationStore((s) => s.unreadCount) ?? 0;
    markRead = useNotificationStore((s) => s.markRead);
    markAllRead = useNotificationStore((s) => s.markAllRead);
    removeOne = useNotificationStore((s) => s.removeOne);
    removeRead = useNotificationStore((s) => s.removeRead);
  } catch (err) {
    console.warn('[NotificationBell] Store-Zugriff fehlgeschlagen:', err);
  }

  // Sicherstellen dass notifications immer ein Array ist
  const notifications = Array.isArray(rawNotifications) ? rawNotifications : [];
  if (typeof unreadCount !== 'number' || isNaN(unreadCount)) unreadCount = 0;

  // Pulse animation — nur bei NEUEN Benachrichtigungen, nicht beim initialen Load
  useEffect(() => {
    try {
      if (!initialLoadDone.current) {
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
    } catch {}
  }, [unreadCount]);

  const hasRead = notifications.some((n: any) => n?.is_read === true);

  const handlePress = useCallback((notif: any) => {
    try {
      if (!notif?.is_read && markRead) markRead(notif.id);
      setOpen(false);
      if (notif?.link && router) router.push(notif.link as any);
    } catch {}
  }, [markRead, router]);

  const renderItem = ({ item }: { item: any }) => {
    if (!item) return null;
    return (
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
          <Text style={[styles.notifTitle, { color: colors.textH }]} numberOfLines={2}>{item.title ?? ''}</Text>
          {item.body ? <Text style={[styles.notifBody, { color: colors.textSec }]} numberOfLines={1}>{item.body}</Text> : null}
          <Text style={[styles.notifTime, { color: colors.textMuted }]}>{timeAgo(item.created_at ?? '')}</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => { try { removeOne?.(item.id); } catch {} }} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
                <TouchableOpacity onPress={() => { try { markAllRead?.(); } catch {} }} hitSlop={8}>
                  <Text style={[styles.headerAction, { color: colors.gold }]}>Alle gelesen</Text>
                </TouchableOpacity>
              )}
              {hasRead && (
                <TouchableOpacity onPress={() => { try { removeRead?.(); } catch {} }} hitSlop={8}>
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
            <FlatList data={notifications} keyExtractor={(n) => n?.id ?? Math.random().toString()} renderItem={renderItem} showsVerticalScrollIndicator={false} style={styles.list} />
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
