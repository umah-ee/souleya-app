import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Image, Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { supabase } from '../../lib/supabase';
import { fetchProfile, updateProfile, uploadAvatar, uploadBanner } from '../../lib/profile';
import { geocodeLocation } from '../../lib/events';
import { router } from 'expo-router';
import type { Profile } from '../../types/profile';
import { SOUL_LEVEL_NAMES } from '../../types/profile';
import { Icon } from '../../components/Icon';

const SCREEN_WIDTH = Dimensions.get('window').width;

// 20 vordefinierte Interessen (identisch mit Web)
const INTEREST_SUGGESTIONS = [
  'Achtsamkeit', 'Yoga', 'Meditation', 'Breathwork', 'Kakao-Zeremonie',
  'Sound Healing', 'Naturverbindung', 'Tantra', 'Ayurveda', 'Schamanismus',
  'Astrologie', 'Tarot', 'Reiki', 'Qigong', 'Pilates',
  'Ernaehrung', 'Journaling', 'Kreativitaet', 'Tanz', 'Philosophie',
];

const MAX_INTERESTS = 10;

export default function ProfileScreen() {
  const { session } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Edit Form
  const [form, setForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    interests: [] as string[],
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
          interests: p.interests ?? [],
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
      interests: profile.interests ?? [],
    });
    setEditing(true);
    setError('');
    setSuccess('');
    setTagInput('');
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setTagInput('');
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
        interests: form.interests,
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

  const handleBannerPick = async () => {
    if (!editing || !profile) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      setError('Banner darf maximal 10 MB gross sein');
      return;
    }

    setUploadingBanner(true);
    setError('');
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const bannerUrl = await uploadBanner({
        uri: asset.uri,
        name: `banner.${ext}`,
        type: asset.mimeType ?? `image/${ext}`,
      });
      const updated = await updateProfile({ banner_url: bannerUrl });
      setProfile(updated);
      setSuccess('Banner aktualisiert');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
    } finally {
      setUploadingBanner(false);
    }
  };

  // ── Interest-Tags ────────────────────────────────────
  const addInterest = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || form.interests.length >= MAX_INTERESTS) return;
    if (form.interests.includes(trimmed)) return;
    setForm((f) => ({ ...f, interests: [...f.interests, trimmed] }));
    setTagInput('');
  };

  const removeInterest = (tag: string) => {
    setForm((f) => ({ ...f, interests: f.interests.filter((t) => t !== tag) }));
  };

  const unusedSuggestions = INTEREST_SUGGESTIONS.filter(
    (s) => !form.interests.includes(s),
  ).slice(0, 8);

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
      {/* Banner */}
      <TouchableOpacity
        onPress={handleBannerPick}
        disabled={!editing}
        activeOpacity={editing ? 0.7 : 1}
        style={styles.bannerContainer}
      >
        {profile.banner_url ? (
          <Image source={{ uri: profile.banner_url }} style={styles.bannerImg} />
        ) : (
          <View style={[styles.bannerFallback, { backgroundColor: colors.goldBg }]}>
            <View style={[styles.bannerGradientOverlay, { backgroundColor: colors.bgSolid }]} />
          </View>
        )}
        {/* Gradient-Overlay */}
        <View style={[styles.bannerGradient, { backgroundColor: colors.bgSolid }]} />
        {editing && (
          <View style={[styles.bannerEditOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            {uploadingBanner ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="camera" size={20} color="#fff" />
                <Text style={styles.bannerEditText}>Banner aendern</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

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
              {profile.is_admin && (
                <View style={[styles.adminBadge, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
                  <Icon name="shield" size={10} color={colors.gold} />
                  <Text style={[styles.adminBadgeText, { color: colors.gold }]}>ADMIN</Text>
                </View>
              )}
              {profile.is_mentor && (
                <View style={[styles.mentorBadge, { borderColor: '#4CAF5044', backgroundColor: '#4CAF5014' }]}>
                  <Text style={[styles.mentorBadgeText, { color: '#4CAF50' }]}>MENTOR</Text>
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

      {/* Interest-Tags */}
      {editing ? (
        <View style={styles.interestSection}>
          <Text style={[styles.interestLabel, { color: colors.textMuted }]}>
            INTERESSEN ({form.interests.length}/{MAX_INTERESTS})
          </Text>

          {/* Tag Input */}
          <View style={[styles.inputWithIcon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Icon name="tag" size={14} color={colors.gold} />
            <TextInput
              style={[styles.inputInner, { color: colors.textH }]}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Interesse eingeben ..."
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              onSubmitEditing={() => addInterest(tagInput)}
              returnKeyType="done"
            />
            {tagInput.trim().length > 0 && form.interests.length < MAX_INTERESTS && (
              <TouchableOpacity onPress={() => addInterest(tagInput)} activeOpacity={0.7} style={{ padding: 4 }}>
                <Icon name="plus" size={16} color={colors.gold} />
              </TouchableOpacity>
            )}
          </View>

          {/* Vorschlaege */}
          {unusedSuggestions.length > 0 && form.interests.length < MAX_INTERESTS && (
            <View style={styles.suggestionsRow}>
              {unusedSuggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.suggestionChip, { borderColor: colors.goldBorderS }]}
                  onPress={() => addInterest(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestionText, { color: colors.textSec }]}>{s}</Text>
                  <Icon name="plus" size={10} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Aktive Tags */}
          {form.interests.length > 0 && (
            <View style={styles.activeTags}>
              {form.interests.map((tag) => (
                <View key={tag} style={[styles.activeTag, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
                  <Text style={[styles.activeTagText, { color: colors.goldDeep }]}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeInterest(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Icon name="x" size={10} color={colors.goldDeep} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        /* View-Mode: Interest-Tags anzeigen */
        profile.interests && profile.interests.length > 0 ? (
          <View style={styles.interestViewSection}>
            <View style={styles.activeTags}>
              {profile.interests.map((tag) => (
                <View key={tag} style={[styles.activeTag, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}>
                  <Text style={[styles.activeTagText, { color: colors.goldDeep }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null
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

      {/* Coach Studio Link (nur fuer Mentoren) */}
      {profile.is_mentor && !editing && (
        <TouchableOpacity
          style={[styles.studioBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
          onPress={() => router.push('/studio' as any)}
          activeOpacity={0.7}
        >
          <Icon name="layout-dashboard" size={18} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.studioBtnTitle, { color: colors.textH }]}>Coach Studio</Text>
            <Text style={[styles.studioBtnDesc, { color: colors.textMuted }]}>Kurse, Kalender und Buchungen verwalten</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={[styles.statRow, { borderBottomColor: colors.dividerL }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>SEEDS</Text>
          <Text style={[styles.statValueGold, { color: colors.gold }]}>{profile.seeds_balance}</Text>
        </View>
        <View style={[styles.statRow, { borderBottomColor: colors.dividerL }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEITRAEGE</Text>
          <Text style={[styles.statValue, { color: colors.textSec }]}>{profile.pulses_count ?? 0}</Text>
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
  content: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 13 },

  // Banner
  bannerContainer: { width: SCREEN_WIDTH, height: 140, overflow: 'hidden' },
  bannerImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerFallback: { width: '100%', height: '100%' },
  bannerGradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, opacity: 0.7 },
  bannerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, opacity: 0.8 },
  bannerEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  bannerEditText: { fontSize: 11, color: '#fff', letterSpacing: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24, paddingHorizontal: 24, paddingTop: 16,
  },
  headerTitle: { fontSize: 10, letterSpacing: 4 },
  editBtnText: { fontSize: 9, letterSpacing: 2 },

  successBanner: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, marginBottom: 16, marginHorizontal: 24,
  },
  successText: { fontSize: 13, textAlign: 'center' },
  errorBanner: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, marginBottom: 16, marginHorizontal: 24,
  },
  errorBannerText: { fontSize: 13, textAlign: 'center' },

  profileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20, paddingHorizontal: 24 },
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
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1,
  },
  adminBadgeText: { fontSize: 8, letterSpacing: 2 },
  mentorBadge: {
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1,
  },
  mentorBadgeText: { fontSize: 8, letterSpacing: 2 },

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

  editBioSection: { gap: 10, marginBottom: 16, paddingHorizontal: 24 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },

  bio: {
    fontSize: 14, lineHeight: 22,
    fontWeight: '400', marginBottom: 8, paddingHorizontal: 24,
  },
  location: { fontSize: 13, marginBottom: 16, paddingHorizontal: 24 },

  // Interest-Tags
  interestSection: { paddingHorizontal: 24, marginBottom: 16, gap: 10 },
  interestLabel: { fontSize: 9, letterSpacing: 3 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  suggestionText: { fontSize: 11 },
  activeTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  activeTagText: { fontSize: 11 },
  interestViewSection: { paddingHorizontal: 24, marginBottom: 16 },

  // Coach Studio
  studioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, borderWidth: 1,
    marginBottom: 12, marginHorizontal: 24,
  },
  studioBtnTitle: { fontSize: 14, fontWeight: '500' },
  studioBtnDesc: { fontSize: 11, marginTop: 2 },

  editActions: { flexDirection: 'row', gap: 12, marginBottom: 20, paddingHorizontal: 24 },
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
    borderWidth: 1, marginBottom: 12, marginHorizontal: 24,
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
    borderWidth: 1, marginBottom: 24, marginHorizontal: 24,
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
