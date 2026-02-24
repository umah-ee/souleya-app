import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { fetchProfile, updateProfile, uploadAvatar } from '../../lib/profile';
import { geocodeLocation } from '../../lib/events';
import { router } from 'expo-router';
import type { Profile } from '../../types/profile';
import { SOUL_LEVEL_NAMES } from '../../types/profile';
import { Icon } from '../../components/Icon';

export default function ProfileScreen() {
  const { session } = useAuthStore();
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
        accuracy: Location.Accuracy.Low, // Stadtteil-Genauigkeit reicht
      });

      const { latitude, longitude } = loc.coords;
      // Reverse Geocoding → Stadtteil-Name
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
      <View style={styles.center}>
        <ActivityIndicator color="#C8A96E" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profil konnte nicht geladen werden.</Text>
      </View>
    );
  }

  const initials = (profile.display_name ?? profile.username ?? profile.email ?? '?').slice(0, 1).toUpperCase();
  const vipName = SOUL_LEVEL_NAMES[profile.soul_level] ?? `Level ${profile.soul_level}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFIL</Text>
        {!editing && (
          <TouchableOpacity onPress={handleEdit} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>BEARBEITEN</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {success ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
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
            profile.is_first_light && styles.avatarFirstLight,
          ]}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#C8A96E" size="small" />
              </View>
            )}
          </View>
          {editing && (
            <View style={styles.editAvatarIcon}>
              <Icon name="edit" size={12} color="#1E1C26" />
            </View>
          )}
        </TouchableOpacity>

        {editing ? (
          <View style={styles.editFields}>
            <TextInput
              style={styles.input}
              value={form.display_name}
              onChangeText={(v) => setForm((f) => ({ ...f, display_name: v }))}
              placeholder="Anzeigename"
              placeholderTextColor="#5A5450"
              maxLength={60}
            />
            <View style={styles.inputWithIcon}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={styles.inputInner}
                value={form.username}
                onChangeText={(v) => setForm((f) => ({ ...f, username: v.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                placeholder="username"
                placeholderTextColor="#5A5450"
                autoCapitalize="none"
                maxLength={30}
              />
            </View>
          </View>
        ) : (
          <View style={styles.nameSection}>
            <Text style={styles.displayName}>
              {profile.display_name ?? profile.email}
            </Text>
            {profile.username && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}
            <View style={styles.badges}>
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>{vipName.toUpperCase()}</Text>
              </View>
              {profile.is_first_light && (
                <View style={styles.firstLightBadge}>
                  <Text style={styles.firstLightBadgeText}>FIRST LIGHT</Text>
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
            style={[styles.input, styles.bioInput]}
            value={form.bio}
            onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
            placeholder="Ueber dich …"
            placeholderTextColor="#5A5450"
            multiline
            maxLength={300}
          />
          <View style={styles.inputWithIcon}>
            <Icon name="map-pin" size={14} color="#C8A96E" />
            <TextInput
              style={styles.inputInner}
              value={form.location}
              onChangeText={(v) => setForm((f) => ({ ...f, location: v, location_lat: null, location_lng: null }))}
              placeholder="Ort (z.B. Muenchen – Schwabing)"
              placeholderTextColor="#5A5450"
              maxLength={80}
            />
            <TouchableOpacity
              onPress={handleDetectLocation}
              disabled={detectingLocation}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              {detectingLocation ? (
                <ActivityIndicator color="#C8A96E" size="small" />
              ) : (
                <Icon name="current-location" size={16} color="#C8A96E" />
              )}
            </TouchableOpacity>
          </View>
          {form.location_lat && (
            <Text style={styles.locationHint}>Standort gesetzt (Stadtteil-Genauigkeit)</Text>
          )}
        </View>
      ) : (
        <>
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}
          {profile.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              <Icon name="map-pin" size={13} color="#5A5450" />
              <Text style={[styles.location, { marginBottom: 0 }]}>{profile.location}</Text>
            </View>
          ) : null}
        </>
      )}

      {/* Edit Actions */}
      {editing && (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#2C2A35" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>SPEICHERN</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>ABBRECHEN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>SEEDS</Text>
          <Text style={styles.statValueGold}>{profile.seeds_balance}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>VERBINDUNGEN</Text>
          <Text style={styles.statValue}>{profile.connections_count}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>MITGLIED SEIT</Text>
          <Text style={styles.statValue}>
            {new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Referral */}
      <View style={styles.referralCard}>
        <Text style={styles.referralLabel}>DEIN EINLADUNGSLINK</Text>
        <View style={styles.referralRow}>
          <Text style={styles.referralCode} numberOfLines={1}>
            souleya.com?ref={profile.referral_code}
          </Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>ABMELDEN</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#18161F' },
  content: { padding: 24, paddingTop: 64 },
  center: { flex: 1, backgroundColor: '#18161F', alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 13, color: '#5A5450' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { fontSize: 10, letterSpacing: 4, color: '#A8894E' },
  editBtnText: { fontSize: 9, letterSpacing: 2, color: '#C8A96E' },

  successBanner: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: 'rgba(82,183,136,0.1)', borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)', marginBottom: 16,
  },
  successText: { color: '#52B788', fontSize: 13, textAlign: 'center' },
  errorBanner: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: 'rgba(230,57,70,0.1)', borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)', marginBottom: 16,
  },
  errorBannerText: { color: '#E63946', fontSize: 13, textAlign: 'center' },

  profileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(200,169,110,0.12)',
    borderWidth: 2, borderColor: 'rgba(200,169,110,0.2)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarFirstLight: {
    borderColor: 'rgba(200,169,110,0.6)',
    shadowColor: '#C8A96E', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 15,
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, color: '#C8A96E', fontWeight: '300' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,22,31,0.6)', borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  editAvatarIcon: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#C8A96E',
    alignItems: 'center', justifyContent: 'center',
  },
  editAvatarIconText: { fontSize: 12, color: '#1E1C26' },

  nameSection: { flex: 1, paddingTop: 4 },
  displayName: { fontSize: 18, color: '#F0EDE8', fontWeight: '500' },
  username: { fontSize: 13, color: '#5A5450', marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  vipBadge: {
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(168,137,78,0.3)',
  },
  vipBadgeText: { fontSize: 8, letterSpacing: 2, color: '#A8894E' },
  firstLightBadge: {
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.4)',
    backgroundColor: 'rgba(200,169,110,0.1)',
  },
  firstLightBadgeText: { fontSize: 8, letterSpacing: 2, color: '#C8A96E' },

  editFields: { flex: 1, gap: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    color: '#F0EDE8', fontSize: 14,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.2)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 0,
  },
  inputInner: {
    flex: 1, color: '#F0EDE8', fontSize: 14,
    paddingVertical: 10,
  },
  atSign: { color: '#5A5450', fontSize: 14 },

  editBioSection: { gap: 10, marginBottom: 16 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },

  bio: {
    color: '#c8c0b8', fontSize: 14, lineHeight: 22,
    fontWeight: '300', marginBottom: 8,
  },
  location: { color: '#5A5450', fontSize: 13, marginBottom: 16 },

  editActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 999,
    backgroundColor: '#C8A96E', alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(200,169,110,0.3)' },
  saveBtnText: { fontSize: 10, letterSpacing: 3, color: '#1E1C26', fontWeight: '600' },
  cancelBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(90,84,80,0.3)',
  },
  cancelBtnText: { fontSize: 10, letterSpacing: 3, color: '#5A5450' },

  statsCard: {
    backgroundColor: '#2C2A35', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)', marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,169,110,0.06)',
  },
  statLabel: { fontSize: 9, letterSpacing: 3, color: '#5A5450' },
  statValueGold: { fontSize: 15, color: '#C8A96E' },
  statValue: { fontSize: 14, color: '#9A9080' },

  referralCard: {
    backgroundColor: '#2C2A35', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)', marginBottom: 24,
  },
  referralLabel: { fontSize: 9, letterSpacing: 3, color: '#5A5450', marginBottom: 8 },
  referralRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  referralCode: {
    flex: 1, fontSize: 13, color: '#D4BC8B',
    backgroundColor: '#18161F', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, overflow: 'hidden',
  },

  logoutBtn: {
    alignSelf: 'center',
    paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 999, borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
  },
  logoutText: { fontSize: 10, letterSpacing: 3, color: '#5A5450' },

  locationHint: { fontSize: 11, color: '#5A5450', marginLeft: 28 },
});
