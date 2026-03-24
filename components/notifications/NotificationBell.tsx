import React, { Component, useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal, Animated, Image,
  StyleSheet, Dimensions, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme';
import { useNotificationStore } from '../../store/notifications';
import { Icon } from '../Icon';
import type { AppNotification } from '../../lib/notifications';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);

// ── Lokale Error Boundary ──
// Faengt Fehler nur in NotificationBell ab, verhindert App-Crash

interface BellErrorState {
  hasError: boolean;
}

class NotificationBellBoundary extends Component<{ children: React.ReactNode }, BellErrorState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BellErrorState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[NotificationBell] Crash abgefangen:', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Stille Fallback-Glocke ohne Funktionalitaet
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
    case 'incoming_call':
    case 'missed_call':
    case 'f2f_call_started': return 'video';
    case 'f2f_booking_request': return 'calendar-event';
    default: return 'bell';
  }
}

// ── Relative Time ──

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} T.`;
    const weeks = Math.floor(days / 7);
    return `${weeks} W.`;
  } catch {
    return '';
  }
}

// ── Inner Component (all hooks here) ──

function NotificationBellInner() {
  // Alle Store-Zugriffe einzeln + defensive Checks
  let colors: any;
  let notifications: AppNotification[] = [];
  let unreadCount = 0;
  let markRead: ((id: string) => void) | undefined;
  let markAllRead: (() => void) | undefined;
  let removeOne: ((id: string) => void) | undefined;
  let removeRead: (() => void) | undefined;

  try {
    colors = useThemeStore((s) => s.colors);
  } catch {
    colors = null;
  }

  try {
    notifications = useNotificationStore((s) => s.notifications) ?? [];
    unreadCount = useNotificationStore((s) => s.unreadCount) ?? 0;
    markRead = useNotificationStore((s) => s.markRead);
    markAllRead = useNotificationStore((s) => s.markAllRead);
    removeOne = useNotificationStore((s) => s.removeOne);
    removeRead = useNotificationStore((s) => s.removeRead);
  } catch {
    // Store nicht verfuegbar — Glocke ohne Badge anzeigen
  }

  const [open, setOpen] = useState(false);

  let router: any;
  try {
    router = useRouter();
  } catch {
    router = null;
  }

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(unreadCount);

  // Fallback-Farben wenn Theme nicht geladen
  const c = colors ?? {
    textSec: '#999',
    textH: '#F0E8D8',
    textMuted: '#666',
    gold: '#C8A96E',
    bgSolid: '#282828',
    divider: '#333',
  };

  // Pulse animation when new notification arrives
  useEffect(() => {
    try {
      if (unreadCount > prevCount.current && unreadCount > 0) {
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
      }
    } catch {}
    prevCount.current = unreadCount;
  }, [unreadCount]);

  const hasRead = notifications.some((n) => n?.is_read);

  const handlePress = (notif: AppNotification) => {
    try {
      if (!notif.is_read && markRead) markRead(notif.id);
      setOpen(false);
      if (notif.link && router) {
        router.push(notif.link as any);
      }
    } catch {}
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notifRow, !item.is_read && { backgroundColor: `${c.gold}08` }]}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      {/* Unread dot */}
      {!item.is_read && (
        <View style={[styles.unreadDot, { backgroundColor: c.gold }]} />
      )}

      {/* Avatar or icon */}
      <View style={styles.avatarWrap}>
        {item.actor_avatar_url ? (
          <Image source={{ uri: item.actor_avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: `${c.gold}18` }]}>
            <Icon name={typeIcon(item.type) as any} size={16} color={c.gold} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, { color: c.textH }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={[styles.notifBody, { color: c.textSec }]} numberOfLines={1}>
            {item.body}
          </Text>
        ) : null}
        <Text style={[styles.notifTime, { color: c.textMuted }]}>
          {timeAgo(item.created_at)}
        </Text>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => { try { removeOne?.(item.id); } catch {} }}
        hitSlop={8}
      >
        <Icon name="x" size={14} color={c.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Bell Button */}
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.bellBtn} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Icon name="bell" size={22} color={c.textSec} />
        </Animated.View>
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: '#E53E3E' }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Panel Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.panel, {
          backgroundColor: c.bgSolid,
          borderColor: c.divider,
        }]}>
          {/* Header */}
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: c.textH }]}>Benachrichtigungen</Text>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={() => { try { markAllRead?.(); } catch {} }} hitSlop={8}>
                  <Text style={[styles.headerAction, { color: c.gold }]}>Alle gelesen</Text>
                </TouchableOpacity>
              )}
              {hasRead && (
                <TouchableOpacity onPress={() => { try { removeRead?.(); } catch {} }} hitSlop={8}>
                  <Text style={[styles.headerAction, { color: c.textMuted }]}>Gelesene loeschen</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List */}
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bell" size={32} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>
                Noch keine Benachrichtigungen
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(n) => n.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

// ── Exportierte Komponente mit Error Boundary ──

export default function NotificationBell() {
  return (
    <NotificationBellBoundary>
      <NotificationBellInner />
    </NotificationBellBoundary>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  bellBtn: {
    position: 'relative',
    padding: 6,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    top: Platform.select({ ios: 54, android: 40 }),
    right: 12,
    width: PANEL_WIDTH,
    maxHeight: 460,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerAction: {
    fontSize: 12,
    fontWeight: '500',
  },
  list: {
    maxHeight: 380,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: 20,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  avatarWrap: {
    width: 36,
    height: 36,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  notifBody: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
