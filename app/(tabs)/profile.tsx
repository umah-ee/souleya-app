import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { supabase } from '../../lib/supabase';
import { fetchProfile, updateProfile, uploadAvatar } from '../../lib/profile';
import { geocodeLocation } from '../../lib/events';
import { router } from 'expo-router';
import type { Profile } from '../../types/profile';
import { SOUL_LEVEL_NAMES } from '../../types/profile';
import { Icon } from '../../components/Icon';

export default function ProfileScreen() {
  const { session } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit Form
  const [form, setForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
  });

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          display_name: p.display_name ?? '',
          username: p.username ?? '',
          bio: p.bio ?? '',
          location: p.location ?? '',
          location_lat: p.location_lat,
          location_lng: p.location_lng,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? '',
      username: profile.username ?? '',
      bio: profile.bio ?? '',
      location: profile.location ?? '',
      location_lat: profile.location_lat,
      location_lng: profile.location_lng,
    });
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
  };

  // GPS-Standort erkennen
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Standort-Berechtigung wurde verweigert');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const { latitude, longitude } = loc.coords;
      const res = await geocodeLocation(`${longitude},${latitude}`, 'reverse');
      if (res.results.length > 0) {
        const place = res.results[0];
        setForm((f) => ({
          ...f,
          location: place.place_name.split(',').slice(0, 2).join(',').trim(),
          location_lat: place.lat,
          location_lng: place.lng,
        }));
        setSuccess('Standort erkannt');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Standort konnte nicht aufgeloest werden');
      }
    } catch {
      setError('Standorterkennung fehlgeschlagen');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateProfile({
        display_name: form.display_name || undefined,
        username: form.username || undefined,
        bio: form.bio || undefined,
        location: form.location || undefined,
        location_lat: form.location_lat ?? undefined,
        location_lng: form.location_lng ?? undefined,
      });
      setProfile(updated);
      setEditing(false);
      setSuccess('Profil gespeichert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async () => {
    if (!editing || !profile) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      setError('Bild darf maximal 5 MB gross sein');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const avatarUrl = await uploadAvatar({
        uri: asset.uri,
        name: `avatar.${ext}`,
        type: asset.mimeType ?? `image/${ext}`,
      });
      const updated = await updateProfile({ avatar_url: avatarUrl });
      setProfile(updated);
      setSuccess('Avatar aktualisiert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Moechtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSolid }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Profil konnte nicht geladen werden.</Text>
      </View>
    );
  }

  const initials = (profile.display_name ?? profile.username ?? profile.email ?? '?').slice(0, 1).toUpperCase();
  const vipName = SOUL_LEVEL_NAMES[profile.soul_level] ?? `Level ${profile.soul_level}`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgSolid }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.goldDeep }]}>PROFIL</Text>
        {!editing && (
          <TouchableOpacity onPress={handleEdit} activeOpacity={0.7}>
            <Text style={[styles.editBtnText, { color: colors.gold }]}>BEARBEITEN</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {success ? (
        <View style={[styles.successBanner, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}44` }]}>
          <Text style={[styles.successText, { color: colors.success }]}>{success}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: `${colors.error}18`, borderColor: `${colors.error}44` }]}>
          <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      {/* Avatar + Name */}
      <View style={styles.profileTop}>
        <TouchableOpacity
          onPress={handleAvatarPick}
          disabled={!editing}
          activeOpacity={editing ? 0.7 : 1}
        >
          <View style={[
            styles.avatar,
            { backgroundColor: colors.avatarBg, borderColor: colors.goldBorderS },
            profile.is_first_light && { borderColor: colors.goldBorder, shadowColor: colors.gold, shadowOpacity: 0.2, shadowRadius: 15 },
          ]}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.gold }]}>{initials}</Text>
            )}
            {uploading && (
              <View style={[styles.avatarOverlay, { backgroundColor: `${colors.bgSolid}99` }]}>
                <ActivityIndicator color={colors.gold} size="small" />
              </View>
            )}
          </View>
          {editing && (
            <View style={[styles.editAvatarIcon, { backgroundColor: colors.gold }]}>
              <Icon name="edit" size={12} color={colors.textOnGold} />
            </View>
          )}
        </TouchableOpacity>

        {editing ? (
          <View style={styles.editFields}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
              value={form.display_name}
              onChangeText={(v) => setForm((f) => ({ ...f, display_name: v }))}
              placeholder="Anzeigename"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />
            <View style={[styles.inputWithIcon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Text style={[styles.atSign, { color: colors.textMuted }]}>@</Text>
              <TextInput
                style={[styles.inputInner, { color: colors.textH }]}
                value={form.username}
                onChangeText={(v) => setForm((f) => ({ ...f, username: v.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                placeholder="username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>
          </View>
        ) : (
          <View style={styles.nameSection}>
            <Text style={[styles.displayName, { color: colors.textH }]}>
              {profile.display_name ?? profile.email}
            </Text>
            {profile.username && (
              <Text style={[styles.username, { color: colors.textMuted }]}>@{profile.username}</Text>
            )}
            <View style={styles.badges}>
              <View style={[styles.vipBadge, { borderColor: colors.goldBorderS }]}>
                <Text style={[styles.vipBadgeText, { color: colors.goldDeep }]}>{vipName.toUpperCase()}</Text>
              </View>
              {profile.is_first_light && (
                <View style={[styles.firstLightBadge, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
                  <Text style={[styles.firstLightBadgeText, { color: colors.gold }]}>FIRST LIGHT</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Bio + Location */}
      {editing ? (
        <View style={styles.editBioSection}>
          <TextInput
            style={[styles.input, styles.bioInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textH }]}
            value={form.bio}
            onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
            placeholder="Ueber dich ..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={300}
          />
          <View style={[styles.inputWithIcon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Icon name="map-pin" size={14} color={colors.gold} />
            <TextInput
              style={[styles.inputInner, { color: colors.textH }]}
              value={form.location}
              onChangeText={(v) => setForm((f) => ({ ...f, location: v, location_lat: null, location_lng: null }))}
              placeholder="Ort (z.B. Muenchen – Schwabing)"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />
            <TouchableOpacity
              onPress={handleDetectLocation}
              disabled={detectingLocation}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              {detectingLocation ? (
                <ActivityIndicator color={colors.gold} size="small" />
              ) : (
                <Icon name="current-location" size={16} color={colors.gold} />
              )}
            </TouchableOpacity>
          </View>
          {form.location_lat && (
            <Text style={[styles.locationHint, { color: colors.textMuted }]}>Standort gesetzt (Stadtteil-Genauigkeit)</Text>
          )}
        </View>
      ) : (
        <>
          {profile.bio ? (
            <Text style={[styles.bio, { color: colors.textBody }]}>{profile.bio}</Text>
          ) : null}
          {profile.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              <Icon name="map-pin" size={13} color={colors.textMuted} />
              <Text style={[styles.location, { color: colors.textMuted, marginBottom: 0 }]}>{profile.location}</Text>
            </View>
          ) : null}
        </>
      )}

      {/* Edit Actions */}
      {editing && (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.gold }, saving && { backgroundColor: colors.goldBg }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.textOnGold} size="small" />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.textOnGold }]}>SPEICHERN</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.divider }]} onPress={handleCancel} activeOpacity={0.7}>
            <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>ABBRECHEN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={[styles.statRow, { borderBottomColor: colors.dividerL }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>SEEDS</Text>
          <Text style={[styles.statValueGold, { color: colors.gold }]}>{profile.seeds_balance}</Text>
        </View>
        <View style={[styles.statRow, { borderBottomColor: colors.dividerL }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>VERBINDUNGEN</Text>
          <Text style={[styles.statValue, { color: colors.textSec }]}>{profile.connections_count}</Text>
        </View>
        <View style={[styles.statRow, { borderBottomColor: colors.dividerL }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>MITGLIED SEIT</Text>
          <Text style={[styles.statValue, { color: colors.textSec }]}>
            {new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Referral */}
      <View style={[styles.referralCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <Text style={[styles.referralLabel, { color: colors.textMuted }]}>DEIN EINLADUNGSLINK</Text>
        <View style={styles.referralRow}>
          <Text style={[styles.referralCode, { color: colors.goldText, backgroundColor: colors.inputBg }]} numberOfLines={1}>
            souleya.com?ref={profile.referral_code}
          </Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.goldBorderS }]} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={[styles.logoutText, { color: colors.textMuted }]}>ABMELDEN</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 64 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 13 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { fontSize: 10, letterSpacing: 4 },
  editBtnText: { fontSize: 9, letterSpacing: 2 },

  successBanner: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, marginBottom: 16,
  },
  successText: { fontSize: 13, textAlign: 'center' },
  errorBanner: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, marginBottom: 16,
  },
  errorBannerText: { fontSize: 13, textAlign: 'center' },

  profileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: '400' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  editAvatarIcon: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  nameSection: { flex: 1, paddingTop: 4 },
  displayName: { fontSize: 18, fontWeight: '500' },
  username: { fontSize: 13, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  vipBadge: {
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1,
  },
  vipBadgeText: { fontSize: 8, letterSpacing: 2 },
  firstLightBadge: {
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1,
  },
  firstLightBadgeText: { fontSize: 8, letterSpacing: 2 },

  editFields: { flex: 1, gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 0,
  },
  inputInner: {
    flex: 1, fontSize: 14,
    paddingVertical: 10,
  },
  atSign: { fontSize: 14 },

  editBioSection: { gap: 10, marginBottom: 16 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },

  bio: {
    fontSize: 14, lineHeight: 22,
    fontWeight: '400', marginBottom: 8,
  },
  location: { fontSize: 13, marginBottom: 16 },

  editActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 999,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 10, letterSpacing: 3, fontWeight: '600' },
  cancelBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 999, borderWidth: 1,
  },
  cancelBtnText: { fontSize: 10, letterSpacing: 3 },

  statsCard: {
    borderRadius: 16, padding: 20,
    borderWidth: 1, marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statLabel: { fontSize: 9, letterSpacing: 3 },
  statValueGold: { fontSize: 15 },
  statValue: { fontSize: 14 },

  referralCard: {
    borderRadius: 16, padding: 20,
    borderWidth: 1, marginBottom: 24,
  },
  referralLabel: { fontSize: 9, letterSpacing: 3, marginBottom: 8 },
  referralRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  referralCode: {
    flex: 1, fontSize: 13,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, overflow: 'hidden',
  },

  logoutBtn: {
    alignSelf: 'center',
    paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 999, borderWidth: 1,
  },
  logoutText: { fontSize: 10, letterSpacing: 3 },

  locationHint: { fontSize: 11, marginLeft: 28 },
});
