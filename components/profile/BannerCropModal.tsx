/**
 * BannerCropModal – Banner-Position per Drag anpassen
 * Speichert banner_pos_y (0–100) via PATCH /users/me
 * Erfordert Migration 056 (banner_pos_x, banner_pos_y Spalten)
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal, StyleSheet,
  Dimensions, PanResponder, Animated, Platform,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { updateProfile } from '../../lib/profile';
import { Icon } from '../Icon';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CROP_HEIGHT = 200; // Sichtbarer Bereich (wie ProfileBanner)
const IMAGE_HEIGHT = 500; // Geschaetzte Bildhoehe fuer Drag-Bereich

interface BannerCropModalProps {
  visible: boolean;
  onClose: () => void;
  bannerUrl: string;
  initialPosY?: number; // 0–100, default 50
  onSaved: (posY: number) => void;
}

export default function BannerCropModal({
  visible,
  onClose,
  bannerUrl,
  initialPosY = 50,
  onSaved,
}: BannerCropModalProps) {
  const colors = useThemeStore((s) => s.colors);
  const [saving, setSaving] = useState(false);

  // Position als 0–100 Wert
  const posY = useRef(initialPosY);
  const pan = useRef(new Animated.Value(0)).current;

  // Maximal verschiebbare Pixel
  const maxOffset = IMAGE_HEIGHT - CROP_HEIGHT;

  // Initial-Offset berechnen
  const getInitialTranslateY = () => -(posY.current / 100) * maxOffset;

  const translateY = useRef(new Animated.Value(getInitialTranslateY())).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Aktuelle Position als Offset merken
        translateY.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        // Vertikales Drag — Bild nach oben/unten verschieben
        let newVal = gestureState.dy;
        translateY.setValue(newVal);
      },
      onPanResponderRelease: () => {
        translateY.flattenOffset();

        // Aktuellen Wert auslesen und auf 0–100 clampen
        // @ts-ignore – Animated Value hat _value intern
        const currentVal = (translateY as any)._value ?? 0;
        const clamped = Math.max(-maxOffset, Math.min(0, currentVal));
        const newPosY = Math.round((-clamped / maxOffset) * 100);
        posY.current = Math.max(0, Math.min(100, newPosY));

        // Snap zum geclampten Wert
        Animated.spring(translateY, {
          toValue: clamped,
          useNativeDriver: true,
          tension: 40,
          friction: 7,
        }).start();
      },
    }),
  ).current;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ banner_pos_y: posY.current } as any);
      onSaved(posY.current);
      onClose();
    } catch {
      // Stille Fehlerbehandlung
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Icon name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Banner positionieren</Text>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.gold }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, { color: colors.textOnGold }]}>
              {saving ? 'Speichert …' : 'Speichern'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hinweis */}
        <Text style={styles.hint}>Ziehe das Bild nach oben oder unten</Text>

        {/* Crop-Fenster */}
        <View style={styles.cropContainer}>
          {/* Sichtbarer Ausschnitt */}
          <View style={styles.cropWindow} {...panResponder.panHandlers}>
            <Animated.Image
              source={{ uri: bannerUrl }}
              style={[
                styles.fullImage,
                { transform: [{ translateY }] },
              ]}
              resizeMode="cover"
            />
          </View>

          {/* Rahmen-Indikator */}
          <View style={[styles.cropBorder, { borderColor: colors.gold }]} pointerEvents="none" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 60, android: 40 }),
    paddingBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  cropContainer: {
    alignSelf: 'center',
    width: SCREEN_WIDTH,
    height: CROP_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  cropWindow: {
    width: SCREEN_WIDTH,
    height: CROP_HEIGHT,
    overflow: 'hidden',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  cropBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 0,
  },
});
