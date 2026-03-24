/**
 * OnboardingWizard – Soul 1 → 2 (Fullscreen Overlay)
 * Alle Eingaben passieren direkt im Overlay — der User verlässt den Wizard nie.
 * Spiegelt die Web-Version (souleya-web) 1:1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useThemeStore } from '../../store/theme';
import { apiFetch } from '../../lib/api';
import { Icon } from '../Icon';
import type { Profile } from '../../types/profile';

import StepAvatar from './steps/StepAvatar';
import StepBio from './steps/StepBio';
import StepInterests from './steps/StepInterests';
import StepLocation from './steps/StepLocation';
import StepBirthday from './steps/StepBirthday';

// ── Types ──

interface ProgressionRequirement {
  key: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

interface ProgressionStatus {
  currentLevel: number;
  currentLevelName: string;
  nextLevel: number | null;
  nextLevelName: string | null;
  requirements: ProgressionRequirement[];
  overallProgress: number;
  unlocksAtNextLevel: string[];
}

interface OnboardingResult {
  leveled_up: boolean;
  new_level: number;
  new_level_name: string;
  message: string;
}

// ── Constants ──

const GOLD = '#C8A96E';
const GOLD_LIGHT = '#D4BC8B';
const GOLD_DARK = '#A8894E';

const LEVEL_DASHARRAY: Record<number, { dash: number; gap: number }> = {
  1: { dash: 45, gap: 181 },
  2: { dash: 83, gap: 143 },
  3: { dash: 120, gap: 106 },
  4: { dash: 158, gap: 68 },
  5: { dash: 196, gap: 30 },
};

const STEP_META: Record<string, { title: string; description: string; shortLabel: string; iconName: string }> = {
  avatar: {
    title: 'Zeig dich',
    description: 'Lade ein Profilbild hoch, damit andere dich erkennen.',
    shortLabel: 'Bild',
    iconName: 'user',
  },
  bio: {
    title: 'Erzaehl etwas ueber dich',
    description: 'Ein paar Worte helfen anderen, Gemeinsamkeiten zu entdecken.',
    shortLabel: 'Bio',
    iconName: 'pencil',
  },
  interests: {
    title: 'Was interessiert dich?',
    description: 'Waehle mindestens 3 Interessen fuer passende Empfehlungen.',
    shortLabel: 'Interessen',
    iconName: 'star',
  },
  location: {
    title: 'Wo bist du zuhause?',
    description: 'Fuer Events und Gleichgesinnte in deiner Naehe.',
    shortLabel: 'Ort',
    iconName: 'map-pin',
  },
  birthday: {
    title: 'Wann hast du Geburtstag?',
    description: 'Du bekommst dein Sternzeichen am Profil.',
    shortLabel: 'Geburtstag',
    iconName: 'calendar-event',
  },
};

const STEP_KEYS = ['avatar', 'bio', 'interests', 'location', 'birthday'];

// ── Props ──

interface Props {
  profile: Profile;
  onLevelUp: () => void;
}

// ── Component ──

export default function OnboardingWizard({ profile, onLevelUp }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<ProgressionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [activeStepKey, setActiveStepKey] = useState<string | null>(null);
  const [completedLevel, setCompletedLevel] = useState(2);
  const [completedLevelName, setCompletedLevelName] = useState('Awakened Soul');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(profile.avatar_url);

  // ── API ──

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch<ProgressionStatus>('/users/me/progression');
      setStatus(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleCheckOnboarding = useCallback(async () => {
    setChecking(true);
    try {
      const result = await apiFetch<OnboardingResult>('/users/me/onboarding', { method: 'POST' });
      if (result.leveled_up) {
        setCompletedLevel(result.new_level);
        setCompletedLevelName(result.new_level_name);
        setShowComplete(true);
      } else {
        await loadStatus();
      }
    } catch {
      // silent
    } finally {
      setChecking(false);
    }
  }, [loadStatus]);

  // Auto-check wenn alle Steps erledigt
  useEffect(() => {
    if (status && status.requirements.every((r) => r.completed) && !showComplete && !checking) {
      handleCheckOnboarding();
    }
  }, [status, showComplete, checking, handleCheckOnboarding]);

  const handleCompleteClose = () => {
    onLevelUp();
    setShowComplete(false);
    setHidden(true);
  };

  const handleStepComplete = useCallback(async (updatedAvatarUrl?: string) => {
    if (updatedAvatarUrl) setCurrentAvatarUrl(updatedAvatarUrl);
    await loadStatus();
    setActiveStepKey(null);
  }, [loadStatus]);

  const handleStepBack = useCallback(() => {
    if (!status) return;
    const keys = status.requirements.map((r) => r.key);
    const currentKey = activeStepKey ?? status.requirements.find((r) => !r.completed)?.key;
    const currentIdx = keys.indexOf(currentKey ?? '');
    if (currentIdx > 0) {
      setActiveStepKey(keys[currentIdx - 1]);
    }
  }, [status, activeStepKey]);

  // ── Render Guards ──

  if (loading) {
    return (
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  if (!status) return null;

  const completedCount = status.requirements.filter((r) => r.completed).length;
  const totalCount = status.requirements.length;
  const allCompleted = completedCount === totalCount;
  const remaining = totalCount - completedCount;

  const nextStep = status.requirements.find((r) => !r.completed);
  const activeKey = activeStepKey ?? nextStep?.key ?? null;
  const activeStepMeta = activeKey ? STEP_META[activeKey] : null;
  const activeStepIdx = activeKey ? STEP_KEYS.indexOf(activeKey) : -1;

  // ── Floating Button (hidden state) ──

  if (hidden && !showComplete) {
    return (
      <TouchableOpacity
        style={[styles.floatingBtn, { bottom: insets.bottom + 80 }]}
        onPress={() => setHidden(false)}
        activeOpacity={0.8}
      >
        <Svg viewBox="0 0 100 100" width={16} height={16}>
          <Circle
            cx="50" cy="50" r="36" fill="none"
            stroke="#1A1714" strokeWidth={10} strokeLinecap="round"
            strokeDasharray="83 143" strokeDashoffset={15}
          />
        </Svg>
        <Text style={styles.floatingBtnText}>Weiter mit Onboarding</Text>
        <View style={styles.floatingBadge}>
          <Text style={styles.floatingBadgeText}>{completedCount}/{totalCount}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Completion State ──

  if (showComplete) {
    const lvl = LEVEL_DASHARRAY[completedLevel] ?? LEVEL_DASHARRAY[2];
    return (
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        <View style={[styles.card, { backgroundColor: colors.bgSolid, borderColor: colors.glassBorder }]}>
          {/* Enso-Ring with Avatar */}
          <View style={styles.completeEnsoWrap}>
            <Svg viewBox="0 0 100 100" width={120} height={120}>
              <Defs>
                <LinearGradient id="cgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={GOLD_DARK} />
                  <Stop offset="100%" stopColor={GOLD_LIGHT} />
                </LinearGradient>
              </Defs>
              <Circle
                cx="50" cy="50" r="36" fill="none"
                stroke="url(#cgrad)" strokeWidth={8} strokeLinecap="round"
                strokeDasharray={`${lvl.dash} ${lvl.gap}`} strokeDashoffset={15}
              />
              {profile.is_first_light && (
                <>
                  <Circle cx="82.8" cy="35.2" r="10" fill={GOLD_LIGHT} opacity={0.35} />
                  <Circle cx="82.8" cy="35.2" r="5" fill={GOLD_LIGHT} opacity={0.9} />
                </>
              )}
            </Svg>
            <View style={[styles.completeAvatarWrap, { backgroundColor: colors.bgSolid, borderColor: colors.glassBorder }]}>
              {currentAvatarUrl ? (
                <Image source={{ uri: currentAvatarUrl }} style={styles.completeAvatar} />
              ) : (
                <Text style={[styles.completeAvatarPlaceholder, { color: colors.textMuted }]}>?</Text>
              )}
            </View>
          </View>

          <Text style={[styles.completeTitle, { color: colors.textH }]}>
            Du bist {completedLevelName === 'Harmony Keeper' ? 'ein' : 'eine'} {completedLevelName}
          </Text>
          <Text style={[styles.completeLevel, { color: GOLD }]}>
            Soul Level {completedLevel}{profile.is_first_light ? ' · First Light' : ''}
          </Text>
          <Text style={[styles.completeBody, { color: colors.textBody }]}>
            Dein Profil ist komplett. Willkommen in der Souleya-Gemeinschaft.
          </Text>

          <TouchableOpacity style={styles.goldBtn} onPress={handleCompleteClose} activeOpacity={0.8}>
            <Text style={styles.goldBtnText}>Los geht's</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Wizard ──

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />

      <ScrollView
        style={[styles.card, { backgroundColor: colors.bgSolid, borderColor: colors.glassBorder, maxHeight: Dimensions.get('window').height - insets.top - insets.bottom - 40 }]}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Welcome (first visit) */}
        {completedCount === 0 && (
          <View style={styles.welcomeWrap}>
            <Svg viewBox="0 0 100 100" width={48} height={48} style={{ opacity: 0.8 }}>
              <Defs>
                <LinearGradient id="wgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={GOLD_DARK} />
                  <Stop offset="100%" stopColor={GOLD_LIGHT} />
                </LinearGradient>
              </Defs>
              <Circle
                cx="50" cy="50" r="36" fill="none"
                stroke="url(#wgrad)" strokeWidth={8} strokeLinecap="round"
                strokeDasharray="45 181" strokeDashoffset={15}
              />
            </Svg>
            <Text style={[styles.welcomeTitle, { color: colors.textH }]}>Willkommen bei Souleya</Text>
            <Text style={[styles.welcomeBody, { color: colors.textBody }]}>
              Mach dein Profil komplett und werde zur Awakened Soul. Es dauert nur einen Moment.
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textH }]}>Deine Reise</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {allCompleted
                ? 'Alle Schritte erledigt'
                : `Noch ${remaining} ${remaining === 1 ? 'Schritt' : 'Schritte'} bis Awakened Soul`}
            </Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: `${GOLD}18` }]}>
            <Text style={[styles.counterBadgeText, { color: GOLD }]}>
              {completedCount} / {totalCount}
            </Text>
          </View>
        </View>

        {/* Journey Bar */}
        <View style={styles.journeyBar}>
          <Text style={[styles.journeyLabel, { color: colors.textMuted }]}>Start</Text>
          <View style={styles.journeyTrack}>
            {/* Track BG */}
            <View style={[styles.journeyTrackBg, { backgroundColor: colors.textMuted, opacity: 0.2 }]} />
            {/* Track Fill */}
            <View
              style={[
                styles.journeyTrackFill,
                {
                  width: totalCount > 1
                    ? `${Math.min(Math.round((completedCount / (totalCount - 1)) * 100), 100)}%`
                    : '0%',
                  backgroundColor: GOLD,
                },
              ]}
            />
            {/* Nodes */}
            <View style={styles.journeyNodes}>
              {status.requirements.map((req) => {
                const isActive = activeKey === req.key;
                return (
                  <TouchableOpacity
                    key={req.key}
                    onPress={() => setActiveStepKey(req.key)}
                    style={[
                      styles.journeyNode,
                      req.completed
                        ? { backgroundColor: GOLD, borderWidth: 0 }
                        : {
                            backgroundColor: colors.bgSolid,
                            borderWidth: 2,
                            borderColor: isActive ? GOLD : colors.textMuted,
                          },
                    ]}
                    activeOpacity={0.7}
                  >
                    {req.completed && (
                      <Icon name="check" size={10} color="#1A1714" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.journeyGoal}>
            <Svg viewBox="0 0 100 100" width={16} height={16}>
              <Circle
                cx="50" cy="50" r="36" fill="none"
                stroke={GOLD} strokeWidth={10} strokeLinecap="round"
                strokeDasharray="83 143" strokeDashoffset={15}
              />
            </Svg>
            <Text style={[styles.journeyLabel, { color: GOLD }]}>Ziel</Text>
          </View>
        </View>

        {/* Active Step Form */}
        {activeStepMeta && !allCompleted && (
          <View style={[styles.stepCard, { borderColor: `${GOLD}30` }]}>
            {/* Step Header */}
            <View style={styles.stepHeader}>
              <View style={[styles.stepIcon, { backgroundColor: `${GOLD}18` }]}>
                <Icon name={activeStepMeta.iconName as any} size={20} color={GOLD} />
              </View>
              <View style={styles.stepHeaderText}>
                <Text style={[styles.stepTitle, { color: colors.textH }]}>{activeStepMeta.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.textBody }]}>{activeStepMeta.description}</Text>
              </View>
            </View>

            {/* Step Content */}
            {activeKey === 'avatar' && (
              <StepAvatar
                currentAvatarUrl={profile.avatar_url}
                onComplete={handleStepComplete}
                onBack={handleStepBack}
                isFirst={activeStepIdx === 0}
              />
            )}
            {activeKey === 'bio' && (
              <StepBio
                currentBio={profile.bio}
                onComplete={handleStepComplete}
                onBack={handleStepBack}
                isFirst={activeStepIdx === 0}
              />
            )}
            {activeKey === 'interests' && (
              <StepInterests
                currentInterests={profile.interests}
                onComplete={handleStepComplete}
                onBack={handleStepBack}
                isFirst={activeStepIdx === 0}
              />
            )}
            {activeKey === 'location' && (
              <StepLocation
                currentLocation={profile.location}
                onComplete={handleStepComplete}
                onBack={handleStepBack}
                isFirst={activeStepIdx === 0}
              />
            )}
            {activeKey === 'birthday' && (
              <StepBirthday
                onComplete={handleStepComplete}
                onBack={handleStepBack}
                isFirst={activeStepIdx === 0}
              />
            )}
          </View>
        )}

        {/* CTA: All completed */}
        {allCompleted && (
          <TouchableOpacity
            style={[styles.goldBtn, { marginTop: 20, opacity: checking ? 0.7 : 1 }]}
            onPress={handleCheckOnboarding}
            disabled={checking}
            activeOpacity={0.8}
          >
            <Text style={styles.goldBtnText}>
              {checking ? 'Wird geprueft …' : 'Awakened Soul freischalten'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Later button */}
        {!allCompleted && (
          <TouchableOpacity
            style={styles.laterBtn}
            onPress={() => setHidden(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.laterBtnText, { color: colors.textBody }]}>Spaeter weitermachen</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ──

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1,
  },
  cardContent: {
    paddingBottom: 24,
  },

  // Welcome
  welcomeWrap: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 4,
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 26,
    fontWeight: '400',
    marginTop: 12,
    textAlign: 'center',
  },
  welcomeBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerTitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 18,
    fontWeight: '400',
  },
  headerSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  counterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  // Journey bar
  journeyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  journeyLabel: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  journeyTrack: {
    flex: 1,
    height: 22,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  journeyTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  journeyTrackFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 1,
  },
  journeyNodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Step Card
  stepCard: {
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 14,
    padding: 20,
    backgroundColor: 'rgba(200,169,110,0.06)',
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepHeaderText: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Gold Button
  goldBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  goldBtnText: {
    color: '#1A1714',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Later button
  laterBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
  },
  laterBtnText: {
    fontSize: 12.5,
  },

  // Floating button
  floatingBtn: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingBtnText: {
    color: '#1A1714',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  floatingBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  floatingBadgeText: {
    color: '#1A1714',
    fontSize: 9,
    fontWeight: '600',
  },

  // Completion
  completeEnsoWrap: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeAvatarWrap: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  completeAvatarPlaceholder: {
    fontSize: 28,
  },
  completeTitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 26,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 4,
  },
  completeLevel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  completeBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
});
