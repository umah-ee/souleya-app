import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { fetchProfile } from '../../lib/profile';
import type { Profile } from '../../types/profile';

// ── Profile Components ──
import ProfileBanner from '../../components/profile/ProfileBanner';
import ProfileIdentity from '../../components/profile/ProfileIdentity';
import ProfileBio from '../../components/profile/ProfileBio';
import ProfileStudioCard from '../../components/profile/ProfileStudioCard';
import ProfileInterests from '../../components/profile/ProfileInterests';
import ProfileStats from '../../components/profile/ProfileStats';
import ProfilePrivateRow from '../../components/profile/ProfilePrivateRow';

// ── Panels ──
import SettingsPanel from '../../components/profile/SettingsPanel';
import SeedsPanel from '../../components/profile/SeedsPanel';
import ReferralPanel from '../../components/profile/ReferralPanel';
import EditProfilePanel from '../../components/profile/EditProfilePanel';
import VisitenkarteOverlay from '../../components/profile/VisitenkarteOverlay';

type PanelType = 'settings' | 'seeds' | 'referral' | 'edit' | 'visitenkarte' | null;

export default function ProfileScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  // ── Profil laden ──
  useEffect(() => {
    fetchProfile()
      .then((p) => setProfile(p))
      .catch((err) => {
        console.error('[ProfileScreen]', err);
        setError('Profil konnte nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Panel Handlers ──
  const openPanel = (panel: PanelType) => setActivePanel(panel);
  const closePanel = () => setActivePanel(null);

  const handleProfileUpdated = (updated: Profile) => {
    setProfile(updated);
  };

  // ── Loading State ──
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
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Profil konnte nicht geladen werden.
        </Text>
        {error ? (
          <Text style={[styles.errorDetail, { color: colors.error }]}>{error}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSolid }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════
            PROFIL-REDESIGN v2 (Style Guide v2.1)
            Banner → Identity → Bio → Studio →
            Interests → Stats → Private Row
        ═══════════════════════════════════════════ */}

        {/* ─── Banner (200px) ─── */}
        <ProfileBanner
          bannerUrl={profile.banner_url}
          colors={colors}
          onSettingsClick={() => openPanel('settings')}
          onShareClick={() => openPanel('visitenkarte')}
          onEditClick={() => openPanel('edit')}
        />

        {/* ─── Identity (Avatar 112px + Name 32px) ─── */}
        <ProfileIdentity profile={profile} colors={colors} />

        {/* ─── Bio + Location + Member-Since ─── */}
        <ProfileBio profile={profile} colors={colors} />

        {/* ─── Coach Studio Card (nur Mentoren) ─── */}
        <ProfileStudioCard profile={profile} colors={colors} />

        {/* ─── Interest Tags ─── */}
        <ProfileInterests profile={profile} colors={colors} />

        {/* ─── Stats (Beitraege/Kontakte/Circles) ─── */}
        <ProfileStats profile={profile} colors={colors} />

        {/* ─── Seeds + Einladungen Chips ─── */}
        <ProfilePrivateRow
          profile={profile}
          colors={colors}
          onSeedsClick={() => openPanel('seeds')}
          onReferralClick={() => openPanel('referral')}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══════════════════════════════════════════
          PANELS
      ═══════════════════════════════════════════ */}

      <SettingsPanel
        isOpen={activePanel === 'settings'}
        onClose={closePanel}
      />

      <SeedsPanel
        isOpen={activePanel === 'seeds'}
        onClose={closePanel}
        profile={profile}
      />

      <ReferralPanel
        isOpen={activePanel === 'referral'}
        onClose={closePanel}
        profile={profile}
      />

      <EditProfilePanel
        isOpen={activePanel === 'edit'}
        onClose={closePanel}
        profile={profile}
        onProfileUpdated={handleProfileUpdated}
      />

      <VisitenkarteOverlay
        isOpen={activePanel === 'visitenkarte'}
        onClose={closePanel}
        profile={profile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorDetail: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
});
