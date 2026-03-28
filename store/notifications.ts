import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteReadNotifications,
  type AppNotification,
} from '../lib/notifications';

const POLL_INTERVAL = 30_000; // 30s

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  init: (userId: string) => void;
  cleanup: () => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeOne: (id: string) => Promise<void>;
  removeRead: () => Promise<void>;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let realtimeSub: ReturnType<typeof supabase.channel> | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  init: (userId: string) => {
    // Initial fetch
    get().refresh();

    // Polling
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => get().refresh(), POLL_INTERVAL);

    // Realtime
    if (realtimeSub) {
      supabase.removeChannel(realtimeSub);
    }
    realtimeSub = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          get().refresh();
        },
      )
      .subscribe();
  },

  cleanup: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (realtimeSub) {
      supabase.removeChannel(realtimeSub);
      realtimeSub = null;
    }
    set({ notifications: [], unreadCount: 0 });
  },

  refresh: async () => {
    try {
      const [notifs, count] = await Promise.all([
        fetchNotifications(1, 20),
        fetchUnreadCount(),
      ]);
      const safeNotifs = Array.isArray(notifs) ? notifs : [];
      const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
      console.log(`[Notifications] Refresh: ${safeNotifs.length} Eintraege, ${safeCount} ungelesen`);
      set({
        notifications: safeNotifs,
        unreadCount: safeCount,
        isLoading: false,
      });
    } catch (err) {
      console.warn('[Notifications] Refresh fehlgeschlagen:', err);
      set({ isLoading: false });
    }
  },

  markRead: async (id: string) => {
    try {
      await markNotificationRead(id);
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {}
  },

  markAllRead: async () => {
    try {
      await markAllNotificationsRead();
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {}
  },

  removeOne: async (id: string) => {
    const notif = get().notifications.find((n) => n.id === id);
    try {
      await deleteNotification(id);
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: notif && !notif.is_read ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      }));
    } catch {}
  },

  removeRead: async () => {
    try {
      await deleteReadNotifications();
      set((s) => ({
        notifications: s.notifications.filter((n) => !n.is_read),
      }));
    } catch {}
  },
}));
