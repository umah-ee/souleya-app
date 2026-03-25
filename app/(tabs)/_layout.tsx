import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Icon, type IconName } from '../../components/Icon';
import { useAuthStore } from '../../store/auth';
import { useChatStore } from '../../store/chat';
import { useThemeStore } from '../../store/theme';
import { fetchProfile } from '../../lib/profile';
import type { Profile } from '../../types/profile';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';
import UserMenu from '../../components/layout/UserMenu';
import { usePushNotifications } from '../../hooks/usePushNotifications';

function TabBarIcon({ name, color }: { name: IconName; color: string }) {
  return <Icon name={name} size={24} color={color} />;
}

/** Enso Logo fuer den Header (28px, Gold-Gradient) */
function EnsoLogo() {
  return (
    <Svg width={28} height={28} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="header-enso" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#A8894E" />
          <Stop offset="100%" stopColor="#D4BC8B" />
        </LinearGradient>
      </Defs>
      <Circle
        cx="50" cy="50" r="36" fill="none"
        stroke="url(#header-enso)" strokeWidth={9} strokeLinecap="round"
        strokeDasharray="196 30" strokeDashoffset="15"
      />
    </Svg>
  );
}

// Profil entfernt — Zugang ueber UserMenu EnsoRing oben rechts
const BASE_mehrItems: { route: string; icon: IconName; label: string; mentorOnly?: boolean }[] = [
  { route: '/studio', icon: 'layout-dashboard', label: 'Studio', mentorOnly: true },
];

export default function TabsLayout() {
  const totalUnread = useChatStore((s) => s.totalUnread);
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [showMehr, setShowMehr] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const router = useRouter();

  // Push Notifications registrieren mit Auth-User-ID (sofort verfuegbar)
  const session = useAuthStore((s) => s.session);
  usePushNotifications(session?.user?.id);

  const loadProfile = useCallback(() => {
    fetchProfile().then((p) => {
      setProfile(p);
      if ((p as { is_mentor?: boolean }).is_mentor) setIsMentor(true);
      setShowWizard(p.soul_level === 1);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLevelUp = useCallback(() => {
    setShowWizard(false);
    loadProfile();
  }, [loadProfile]);

  const mehrItems = useMemo(
    () => BASE_mehrItems.filter((item) => !item.mentorOnly || isMentor),
    [isMentor],
  );

  const handleMehrItem = (route: string) => {
    setShowMehr(false);
    router.push(route as never);
  };

  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.tabBarBg,
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
            fontStyle: 'italic',
            fontWeight: '600',
            fontSize: 17,
            color: colors.textH,
          },
          headerLeft: () => (
            <View style={{ marginLeft: 14 }}>
              <EnsoLogo />
            </View>
          ),
          headerRight: () => (
            <View style={{ marginRight: 12 }}>
              <UserMenu />
            </View>
          ),
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            paddingBottom: 14,
            paddingTop: 6,
            height: 82,
          },
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarLabelStyle: {
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginTop: 2,
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

            {mehrItems.map((item, i) => (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.menuItem,
                  i < mehrItems.length && styles.menuItemBorder,
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

      {/* Onboarding Wizard (Soul Level 1) */}
      {showWizard && profile && (
        <OnboardingWizard profile={profile} onLevelUp={handleLevelUp} />
      )}
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
