import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Share } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';
import type { Profile } from '../../types/profile';
import BottomPanel from './BottomPanel';

interface VisitenkarteOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

export default function VisitenkarteOverlay({ isOpen, onClose, profile }: VisitenkarteOverlayProps) {
  const colors = useThemeStore((s) => s.colors);
  const initials = (profile.display_name ?? profile.username ?? profile.email ?? '?')
    .slice(0, 1)
    .toUpperCase();

  const handleShare = async () => {
    const url = `https://souleya.com/@${profile.username ?? profile.referral_code}`;
    await Share.share({
      message: `Schau dir mein Profil auf Souleya an: ${url}`,
      url,
    });
  };

  return (
    <BottomPanel isOpen={isOpen} onClose={onClose}>
      <View style={styles.card}>
        {/* Mini Banner */}
        <View style={[styles.miniBanner, { backgroundColor: colors.goldBg }]}>
          {profile.banner_url && (
            <Image source={{ uri: profile.banner_url }} style={styles.miniBannerImg} />
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.avatarRing, { borderColor: colors.ensoGradientStart, backgroundColor: colors.bgSolid }]}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.avatarBg }]}>
              <Text style={[styles.avatarInitials, { color: colors.gold }]}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Name + Handle */}
        <Text style={[styles.name, { color: colors.textH }]}>
          {profile.display_name ?? profile.email}
        </Text>
        {profile.username && (
          <Text style={[styles.handle, { color: colors.textMuted }]}>@{profile.username}</Text>
        )}

        {/* Bio */}
        {profile.bio && (
          <Text style={[styles.bio, { color: colors.textSec }]} numberOfLines={3}>
            {profile.bio}
          </Text>
        )}

        {/* Tags */}
        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.tagsRow}>
            {profile.interests.slice(0, 4).map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { borderColor: colors.goldBorder, backgroundColor: colors.goldBg }]}
              >
                <Text style={[styles.tagText, { color: colors.goldDeep }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.gold }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Icon name="share" size={16} color={colors.textOnGold} />
            <Text style={[styles.actionBtnText, { color: colors.textOnGold }]}>Teilen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: colors.divider }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnOutlineText, { color: colors.textSec }]}>Schliessen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomPanel>
  );
}

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  miniBanner: {
    width: '100%',
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: -36,
  },
  miniBannerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '500',
  },
  name: {
    fontSize: 22,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 2,
  },
  handle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  bio: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnOutline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
