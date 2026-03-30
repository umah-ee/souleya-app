import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, StyleSheet, Platform, ActivityIndicator } from 'react-native';
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
  const setTheme = useThemeStore((s) => s.setTheme);
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
        <AccountSubView colors={colors} onBack={() => setSubView('main')} onLogout={handleLogout} />
      )}
    </BottomPanel>
  );
}

// ── Account Sub-View ──

function AccountSubView({ colors, onBack, onLogout }: { colors: any; onBack: () => void; onLogout: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const isValid = password.length >= 8 && password === confirmPassword;

  const handleSetPassword = async () => {
    if (!isValid) return;

    if (password.length < 8) {
      Alert.alert('Zu kurz', 'Dein Passwort sollte mindestens 8 Zeichen haben.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Stimmt nicht ueberein', 'Die Passwoerter stimmen nicht ueberein. Probier es nochmal.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      Alert.alert('Alles klar', 'Dein Passwort wurde gesetzt. Du kannst dich jetzt auch damit einloggen.');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      Alert.alert('Das hat leider nicht geklappt', err?.message || 'Versuch es gerne nochmal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <BackButton colors={colors} onPress={onBack} />
      <Text style={[styles.subTitle, { color: colors.textH }]}>Konto</Text>

      {/* ── Passwort setzen ── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PASSWORT</Text>
      <Text style={[styles.passwordHint, { color: colors.textSec }]}>
        Setze ein Passwort, um dich alternativ mit E-Mail und Passwort einzuloggen.
      </Text>

      {/* Neues Passwort */}
      <View style={[styles.inputWrap, { borderColor: colors.divider, backgroundColor: colors.bgElevated }]}>
        <TextInput
          style={[styles.input, { color: colors.textH }]}
          placeholder="Neues Passwort"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
          <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Passwort bestätigen */}
      <View style={[styles.inputWrap, { borderColor: colors.divider, backgroundColor: colors.bgElevated, marginTop: 10 }]}>
        <TextInput
          style={[styles.input, { color: colors.textH }]}
          placeholder="Passwort wiederholen"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showConfirm}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
          <Icon name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Validierungshinweise */}
      {password.length > 0 && password.length < 8 && (
        <Text style={[styles.validationHint, { color: colors.error }]}>Mindestens 8 Zeichen</Text>
      )}
      {confirmPassword.length > 0 && password !== confirmPassword && (
        <Text style={[styles.validationHint, { color: colors.error }]}>Passwoerter stimmen nicht ueberein</Text>
      )}

      {/* Speichern-Button */}
      <TouchableOpacity
        style={[
          styles.savePasswordBtn,
          {
            backgroundColor: isValid ? colors.gold : colors.divider,
            opacity: isValid && !saving ? 1 : 0.5,
          },
        ]}
        onPress={handleSetPassword}
        disabled={!isValid || saving}
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.bgSolid} />
        ) : (
          <Text style={[styles.savePasswordText, { color: isValid ? colors.bgSolid : colors.textMuted }]}>
            {success ? 'Gespeichert' : 'Passwort setzen'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {/* ── Abmelden ── */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: `${colors.error}14`, borderColor: `${colors.error}44` }]}
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <Icon name="logout" size={16} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Abmelden</Text>
      </TouchableOpacity>
    </View>
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
  passwordHint: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 14,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  validationHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4,
  },
  savePasswordBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
