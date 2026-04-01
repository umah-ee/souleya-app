/**
 * WisdomCard – Tageszitat mit Hintergrundbild
 * Individuelles Zitat pro User (userId + dayOfYear Hash)
 * Share als Bild (ViewShot) oder Text-Fallback
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ImageBackground, Share, Alert,
  StyleSheet, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';
import { QUOTES, getDailyQuote, getQuoteBackground } from '../../../lib/wisdomQuotes';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  userId?: string;
}

export default function WisdomCard({ userId }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  const quote = useMemo(() => getDailyQuote(userId), [userId]);
  const bgImage = useMemo(() => getQuoteBackground(quote), [quote]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      // Versuche Bild-Share via ViewShot
      if (viewShotRef.current?.capture && await Sharing.isAvailableAsync()) {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Tagesimpuls teilen',
          UTI: 'public.png',
        });
        setSharing(false);
        return;
      }
    } catch {
      // Fallback auf Text-Share
    }

    // Text-Fallback
    try {
      const quoteIndex = QUOTES.findIndex((q) => q.text === quote.text && q.author === quote.author);
      const wisdomUrl = `souleya.com/wisdom/${quoteIndex >= 0 ? quoteIndex : 0}`;
      await Share.share({
        message: `\u201E${quote.text}\u201C\n\u2014 ${quote.author}\n\n${wisdomUrl}`,
      });
    } catch {}

    setSharing(false);
  }, [quote]);

  return (
    <View style={styles.outerWrap}>
      {/* Aeusserer Clip fuer abgerundete Ecken (nur Display) */}
      <View style={styles.cardClip}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          style={styles.viewShot}
        >
          <ImageBackground
            source={{ uri: bgImage }}
            style={styles.card}
            resizeMode="cover"
            imageStyle={styles.bgImageStyle}
            fadeDuration={0}
          >
          {/* Dunkler Gradient-Overlay */}
          <View style={styles.gradientOverlay} />

          {/* Souleya Branding oben */}
          <View style={styles.brandingBar}>
            <Svg width={22} height={22} viewBox="0 0 100 100">
              <Defs>
                <LinearGradient id="wc-enso" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#A8894E" />
                  <Stop offset="100%" stopColor="#D4BC8B" />
                </LinearGradient>
              </Defs>
              <Circle
                cx="50" cy="50" r="36" fill="none"
                stroke="url(#wc-enso)" strokeWidth={9} strokeLinecap="round"
                strokeDasharray="196 30" strokeDashoffset="15"
              />
            </Svg>
            <Text style={styles.brandingText}>SOULEYA</Text>
          </View>

          {/* Inhalt unten */}
          <View style={styles.content}>
            {/* Tradition Label */}
            <Text style={styles.tradition}>
              {quote.tradition.toUpperCase()}
            </Text>

            {/* Zitat */}
            <Text style={styles.quote}>
              {'\u201E'}{quote.text}{'\u201C'}
            </Text>

            {/* Autor */}
            <Text style={styles.author}>
              {quote.author}
            </Text>
          </View>
        </ImageBackground>
        </ViewShot>
      </View>

      {/* Share Button (ausserhalb ViewShot, damit er nicht im Screenshot ist) */}
      <View style={styles.shareRow}>
        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: colors.divider }]}
          onPress={handleShare}
          activeOpacity={0.7}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <>
              <Icon name="share" size={14} color={colors.textMuted} />
              <Text style={[styles.shareBtnText, { color: colors.textMuted }]}>Teilen</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    width: '100%',
    gap: 8,
  },
  cardClip: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewShot: {
    width: '100%',
    backgroundColor: '#1a1a1a', // Verhindert schwarze/transparente Raender beim Screenshot
  },
  card: {
    width: '100%',
    aspectRatio: 4 / 5,
    justifyContent: 'space-between',
  },
  bgImageStyle: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  brandingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  brandingText: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: 15,
    letterSpacing: 4,
    color: '#C8A96E',
  },
  content: {
    padding: 20,
    paddingBottom: 24,
    gap: 8,
  },
  tradition: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#C8A96E',
  },
  quote: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
    fontSize: 20,
    lineHeight: 30,
    color: '#FFFFFF',
  },
  author: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
