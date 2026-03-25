/**
 * LinkPreviewCard – Zeigt OpenGraph-Vorschau fuer Links in Chat-Nachrichten
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
}

interface Props {
  preview: LinkPreviewData;
  onPress?: () => void;
}

export default function LinkPreviewCard({ preview, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (preview.url) {
      Linking.openURL(preview.url).catch(() => {});
    }
  };

  // Domain aus URL extrahieren
  let domain = '';
  try {
    domain = new URL(preview.url).hostname.replace('www.', '');
  } catch {
    domain = preview.url;
  }

  if (!preview.title && !preview.description) return null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {preview.image && (
        <Image
          source={{ uri: preview.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <View style={styles.content}>
        <Text style={[styles.domain, { color: colors.gold }]} numberOfLines={1}>
          {preview.site_name || domain}
        </Text>
        {preview.title && (
          <Text style={[styles.title, { color: colors.textH }]} numberOfLines={2}>
            {preview.title}
          </Text>
        )}
        {preview.description && (
          <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
            {preview.description}
          </Text>
        )}
      </View>
      <View style={styles.linkIcon}>
        <Icon name="external-link" size={12} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: 10,
    gap: 2,
  },
  domain: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
  linkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    opacity: 0.5,
  },
});
