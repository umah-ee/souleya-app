import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useThemeStore } from '../../store/theme';
import { Icon, type IconName } from '../Icon';
import BottomPanel from './BottomPanel';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubView = 'main' | 'appearance' | 'notifications' | 'privacy' | 'account';

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setColorScheme = useThemeStore((s) => s.setColorScheme);
  const [subView, setSubView] = useState<SubView>('main');

  const handleClose = () => {
    setSubView('main');
    onClose();
  };

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Moechtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          handleClose();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <BottomPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={subView === 'main' ? 'Einstellungen' : undefined}
    >
      {/* ── Main View ── */}
      {subView === 'main' && (
        <View style={styles.rows}>
          <SettingsRow icon="bell" label="Benachrichtigungen" colors={colors} onPress={() => setSubView('notifications')} />
          <SettingsRow icon="shield" label="Datenschutz" colors={colors} onPress={() => setSubView('privacy')} />
          <SettingsRow icon="palette" label="Darstellung" colors={colors} onPress={() => setSubView('appearance')} />
          <SettingsRow icon="user" label="Konto" colors={colors} onPress={() => setSubView('account')} />
        </View>
      )}

      {/* ── Darstellung ── */}
      {subView === 'appearance' && (
        <View>
          <BackButton colors={colors} onPress={() => setSubView('main')} />
          <Text style={[styles.subTitle, { color: colors.textH }]}>Darstellung</Text>

          {/* Theme Toggle */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MODUS</Text>
          <View style={styles.chipRow}>
            <ToggleChip label="Hell" active={mode === 'light'} colors={colors} onPress={() => setTheme('light')} />
            <ToggleChip label="Dunkel" active={mode === 'dark'} colors={colors} onPress={() => setTheme('dark')} />
          </View>

          {/* Color Scheme Toggle */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 20 }]}>FARBSCHEMA</Text>
          <View style={styles.chipRow}>
            <ToggleChip label="Gold" active={colorScheme === 'gold'} colors={colors} onPress={() => setColorScheme('gold')} dotColor="#C8A96E" />
            <ToggleChip label="Dusk" active={colorScheme === 'dusk'} colors={colors} onPress={() => setColorScheme('dusk')} dotColor="#A78BFA" />
          </View>
        </View>
      )}

      {/* ── Benachrichtigungen ── */}
      {subView === 'notifications' && (
        <View>
          <BackButton colors={colors} onPress={() => setSubView('main')} />
          <Text style={[styles.subTitle, { color: colors.textH }]}>Benachrichtigungen</Text>
          <Text style={[styles.placeholder, { color: colors.textSec }]}>Kommt bald.</Text>
        </View>
      )}

      {/* ── Datenschutz ── */}
      {subView === 'privacy' && (
        <View>
          <BackButton colors={colors} onPress={() => setSubView('main')} />
          <Text style={[styles.subTitle, { color: colors.textH }]}>Datenschutz</Text>
          <Text style={[styles.placeholder, { color: colors.textSec }]}>Kommt bald.</Text>
        </View>
      )}

      {/* ── Konto ── */}
      {subView === 'account' && (
        <View>
          <BackButton colors={colors} onPress={() => setSubView('main')} />
          <Text style={[styles.subTitle, { color: colors.textH }]}>Konto</Text>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: `${colors.error}14`, borderColor: `${colors.error}44` }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Icon name="logout" size={16} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Abmelden</Text>
          </TouchableOpacity>
        </View>
      )}
    </BottomPanel>
  );
}

// ── Helper Components ──

function BackButton({ colors, onPress }: { colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backBtn} onPress={onPress} activeOpacity={0.7}>
      <Icon name="chevron-left" size={16} color={colors.gold} />
      <Text style={[styles.backText, { color: colors.gold }]}>Zurueck</Text>
    </TouchableOpacity>
  );
}

function SettingsRow({ icon, label, colors, onPress }: { icon: IconName; label: string; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <Icon name={icon} size={18} color={colors.textSec} />
      <Text style={[styles.rowLabel, { color: colors.textH }]}>{label}</Text>
      <Icon name="chevron-right" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function ToggleChip({
  label,
  active,
  colors,
  onPress,
  dotColor,
}: {
  label: string;
  active: boolean;
  colors: any;
  onPress: () => void;
  dotColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.toggleChip,
        {
          backgroundColor: active ? colors.goldBg : 'transparent',
          borderColor: active ? colors.goldBorder : colors.divider,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {dotColor && (
        <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
      )}
      <Text style={[styles.chipText, { color: active ? colors.gold : colors.textSec }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    fontSize: 13,
    fontWeight: '500',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  placeholder: {
    fontSize: 13,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
