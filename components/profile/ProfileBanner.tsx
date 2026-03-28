import { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Icon } from '../Icon';
import type { ThemeColors } from '../../lib/theme';
import BannerCropModal from './BannerCropModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_HEIGHT = 200;

interface ProfileBannerProps {
  bannerUrl: string | null;
  bannerPosY?: number; // 0–100, default 50
  colors: ThemeColors;
  onSettingsClick: () => void;
  onShareClick: () => void;
  onEditClick: () => void;
  onBannerPositionSaved?: (posY: number) => void;
}

export default function ProfileBanner({
  bannerUrl,
  bannerPosY = 50,
  colors,
  onSettingsClick,
  onShareClick,
  onEditClick,
  onBannerPositionSaved,
}: ProfileBannerProps) {
  const [showCrop, setShowCrop] = useState(false);
  const [posY, setPosY] = useState(bannerPosY);

  const handleCropSaved = (newPosY: number) => {
    setPosY(newPosY);
    onBannerPositionSaved?.(newPosY);
  };

  return (
    <View style={styles.container}>
      {bannerUrl ? (
        <Image
          source={{ uri: bannerUrl }}
          style={[
            styles.bannerImg,
            // Banner-Position: object-position Equivalent via top-Offset
            // posY 0 = Bild ganz oben, 50 = zentriert, 100 = ganz unten
            { top: `${-posY + 50}%` as any },
          ]}
        />
      ) : (
        <View style={[styles.bannerFallback, { backgroundColor: colors.goldBg }]} />
      )}

      {/* Gradient overlay bottom fade */}
      <View style={[styles.gradient, { backgroundColor: colors.bgSolid, opacity: 0.8 }]} />

      {/* Action buttons */}
      <View style={styles.actions}>
        {bannerUrl && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
            onPress={() => setShowCrop(true)}
            activeOpacity={0.7}
          >
            <Icon name="photo" size={16} color="#fff" />
          </TouchableOpacity>
        )}
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

      {/* Crop Modal */}
      {bannerUrl && (
        <BannerCropModal
          visible={showCrop}
          onClose={() => setShowCrop(false)}
          bannerUrl={bannerUrl}
          initialPosY={posY}
          onSaved={handleCropSaved}
        />
      )}
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
    height: '150%',
    resizeMode: 'cover',
    position: 'absolute',
    left: 0,
    right: 0,
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
