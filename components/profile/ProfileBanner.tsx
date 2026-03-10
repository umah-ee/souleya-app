import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Icon } from '../Icon';
import type { ThemeColors } from '../../lib/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_HEIGHT = 200;

interface ProfileBannerProps {
  bannerUrl: string | null;
  colors: ThemeColors;
  onSettingsClick: () => void;
  onShareClick: () => void;
  onEditClick: () => void;
}

export default function ProfileBanner({
  bannerUrl,
  colors,
  onSettingsClick,
  onShareClick,
  onEditClick,
}: ProfileBannerProps) {
  return (
    <View style={styles.container}>
      {bannerUrl ? (
        <Image source={{ uri: bannerUrl }} style={styles.bannerImg} />
      ) : (
        <View style={[styles.bannerFallback, { backgroundColor: colors.goldBg }]} />
      )}

      {/* Gradient overlay bottom fade (View-based, opacity layers) */}
      <View style={[styles.gradient, { backgroundColor: colors.bgSolid, opacity: 0.8 }]} />

      {/* Action buttons row */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
          onPress={onShareClick}
          activeOpacity={0.7}
        >
          <Icon name="share" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
          onPress={onEditClick}
          activeOpacity={0.7}
        >
          <Icon name="edit" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
          onPress={onSettingsClick}
          activeOpacity={0.7}
        >
          <Icon name="settings" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerFallback: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  actions: {
    position: 'absolute',
    top: 52,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
