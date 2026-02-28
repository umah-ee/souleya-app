/**
 * ImageGrid – Multi-Image Raster fuer Pulse und Chat
 * Layouts:
 * - 1 Bild:  Vollbreite, Hoehe 200
 * - 2 Bilder: nebeneinander, je 50% Breite
 * - 3 Bilder: links 60%, rechts 2 gestapelt 40%
 * - 4+ Bilder: 2x2 Raster, letzte Zelle "+N" Overlay bei > 4
 */

import React from 'react';
import {
  View, Image, TouchableOpacity, Text,
  StyleSheet, Dimensions,
} from 'react-native';

const GAP = 2;

interface ImageGridProps {
  images: string[];
  onImagePress?: (index: number) => void;
  maxHeight?: number;
}

export default function ImageGrid({ images, onImagePress, maxHeight }: ImageGridProps) {
  const containerWidth = Dimensions.get('window').width - 64; // Padding aus Card/Bubble
  const count = images.length;

  if (count === 0) return null;

  const handlePress = (index: number) => {
    onImagePress?.(index);
  };

  // ── 1 Bild ────────────────────────────────────────────────
  if (count === 1) {
    return (
      <TouchableOpacity
        activeOpacity={onImagePress ? 0.85 : 1}
        onPress={() => handlePress(0)}
        disabled={!onImagePress}
      >
        <Image
          source={{ uri: images[0] }}
          style={[styles.singleImage, maxHeight ? { height: maxHeight } : undefined]}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  // ── 2 Bilder ──────────────────────────────────────────────
  if (count === 2) {
    const halfWidth = (containerWidth - GAP) / 2;
    return (
      <View style={styles.row}>
        {images.map((uri, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={onImagePress ? 0.85 : 1}
            onPress={() => handlePress(i)}
            disabled={!onImagePress}
          >
            <Image
              source={{ uri }}
              style={[styles.baseImage, { width: halfWidth, height: 180, borderRadius: 8 }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── 3 Bilder ──────────────────────────────────────────────
  if (count === 3) {
    const leftWidth = containerWidth * 0.6 - GAP / 2;
    const rightWidth = containerWidth * 0.4 - GAP / 2;
    const rightHeight = (200 - GAP) / 2;

    return (
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={onImagePress ? 0.85 : 1}
          onPress={() => handlePress(0)}
          disabled={!onImagePress}
        >
          <Image
            source={{ uri: images[0] }}
            style={[styles.baseImage, { width: leftWidth, height: 200, borderRadius: 8 }]}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <View style={styles.column}>
          {images.slice(1, 3).map((uri, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={onImagePress ? 0.85 : 1}
              onPress={() => handlePress(i + 1)}
              disabled={!onImagePress}
            >
              <Image
                source={{ uri }}
                style={[styles.baseImage, { width: rightWidth, height: rightHeight, borderRadius: 8 }]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── 4+ Bilder: 2x2 Raster ────────────────────────────────
  const cellWidth = (containerWidth - GAP) / 2;
  const cellHeight = (200 - GAP) / 2;
  const visibleImages = images.slice(0, 4);
  const remaining = count - 4;

  return (
    <View style={styles.grid}>
      {visibleImages.map((uri, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={onImagePress ? 0.85 : 1}
          onPress={() => handlePress(i)}
          disabled={!onImagePress}
          style={[{ width: cellWidth, height: cellHeight }]}
        >
          <Image
            source={{ uri }}
            style={[styles.baseImage, { width: cellWidth, height: cellHeight, borderRadius: 8 }]}
            resizeMode="cover"
          />
          {/* "+N" Overlay auf letzter Zelle */}
          {i === 3 && remaining > 0 && (
            <View style={[styles.overlay, { borderRadius: 8 }]}>
              <Text style={styles.overlayText}>+{remaining}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    gap: GAP,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  baseImage: {
    backgroundColor: 'rgba(200,169,110,0.08)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    color: '#F0E8D8',
    fontSize: 22,
    fontWeight: '600',
  },
});
