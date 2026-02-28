import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Icon, type IconName } from '../../components/Icon';
import { useChatStore } from '../../store/chat';
import { useThemeStore } from '../../store/theme';

function TabBarIcon({ name, color }: { name: IconName; color: string }) {
  return <Icon name={name} size={20} color={color} />;
}

const MEHR_ITEMS: { route: string; icon: IconName; label: string }[] = [
  { route: '/profile', icon: 'user', label: 'Profil' },
  { route: '/places', icon: 'map-pin', label: 'Soul Places' },
  { route: '/studio', icon: 'compass', label: 'Studio' },
  { route: '/analytics', icon: 'chart-bar', label: 'Analytics' },
];

export default function TabsLayout() {
  const totalUnread = useChatStore((s) => s.totalUnread);
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [showMehr, setShowMehr] = useState(false);
  const router = useRouter();

  const handleMehrItem = (route: string) => {
    setShowMehr(false);
    router.push(route as never);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            paddingBottom: 8,
            height: 64,
          },
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarLabelStyle: {
            fontSize: 9,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: -4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Pulse',
            tabBarIcon: ({ color }) => <TabBarIcon name="sparkles" color={color} />,
          }}
        />
        <Tabs.Screen
          name="circles"
          options={{
            title: 'Circle',
            tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => <TabBarIcon name="message-circle" color={color} />,
            tabBarBadge: totalUnread > 0 ? (totalUnread > 99 ? '99+' : totalUnread) : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.gold,
              color: colors.textOnGold,
              fontSize: 9,
              fontWeight: '700',
              minWidth: 16,
              height: 16,
              lineHeight: 16,
            },
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="mehr"
          options={{
            title: 'Mehr',
            tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowMehr(true);
            },
          }}
        />
        {/* Profile bleibt als Route erreichbar, aber nicht im Tab-Bar */}
        <Tabs.Screen
          name="profile"
          options={{ href: null }}
        />
      </Tabs>

      {/* Mehr-Modal */}
      <Modal visible={showMehr} transparent animationType="fade" onRequestClose={() => setShowMehr(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowMehr(false)}>
          <Pressable style={[styles.menuContainer, { backgroundColor: colors.glassNav, borderColor: colors.glassNavB }]}>
            {/* Gold-Leiste */}
            <View style={[styles.goldLine, { backgroundColor: colors.goldBorder }]} />

            {MEHR_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.menuItem,
                  i < MEHR_ITEMS.length && styles.menuItemBorder,
                  { borderBottomColor: colors.dividerL },
                ]}
                onPress={() => handleMehrItem(item.route)}
                activeOpacity={0.7}
              >
                <Icon name={item.icon} size={18} color={colors.gold} />
                <Text style={[styles.menuItemText, { color: colors.textH }]}>{item.label}</Text>
                <Icon name="chevron-right" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}

            {/* Theme Toggle */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={colors.gold} />
              <Text style={[styles.menuItemText, { color: colors.textH }]}>
                {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Text>
              <View style={[styles.themeIndicator, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}>
                <Text style={[styles.themeIndicatorText, { color: colors.goldText }]}>
                  {mode === 'dark' ? 'DARK' : 'LIGHT'}
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
  menuContainer: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  goldLine: {
    height: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  themeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  themeIndicatorText: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '600',
  },
});
