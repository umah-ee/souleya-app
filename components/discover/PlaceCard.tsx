import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ScrollView, ActivityIndicator,
} from 'react-native';
import type { Place } from '../../types/places';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

interface Props {
  place: Place;
  onPress: (place: Place) => void;
  onSave: (placeId: string) => void;
  onUnsave: (placeId: string) => void;
  saving?: boolean;
}

function renderStars(rating: number, goldColor: string, mutedColor: string, size = 12) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Icon
        key={i}
        name={i <= Math.round(rating) ? 'star-filled' : 'star'}
        size={size}
        color={i <= Math.round(rating) ? goldColor : mutedColor}
      />,
    );
  }
  return stars;
}

export default function PlaceCard({ place, onPress, onSave, onUnsave, saving }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [saved, setSaved] = useState(place.is_saved ?? false);

  const handleSaveToggle = () => {
    if (saving) return;
    if (saved) {
      setSaved(false);
      onUnsave(place.id);
    } else {
      setSaved(true);
      onSave(place.id);
    }
  };

  const displayTags = (place.tags ?? []).slice(0, 3);
  const address = [place.city, place.country].filter(Boolean).join(', ');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
        },
      ]}
      onPress={() => onPress(place)}
      activeOpacity={0.8}
    >
      {/* Cover */}
      {place.cover_url ? (
        <Image
          source={{ uri: place.cover_url }}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.coverPlaceholder, { backgroundColor: colors.goldBg }]}>
          <Icon name="map-pin" size={28} color={colors.goldBorderS} />
        </View>
      )}

      {/* Save Button (oben rechts auf Cover) */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.glass }]}
        onPress={handleSaveToggle}
        disabled={saving}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.gold} />
        ) : (
          <Icon
            name={saved ? 'bookmark-filled' : 'bookmark'}
            size={16}
            color={colors.gold}
          />
        )}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Name */}
        <Text style={[styles.name, { color: colors.textH }]} numberOfLines={1}>
          {place.name}
        </Text>

        {/* Tags */}
        {displayTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsRow}
          >
            {displayTags.map((tag) => (
              <View key={tag} style={[styles.tagBadge, { backgroundColor: colors.goldBg }]}>
                <Text style={[styles.tagText, { color: colors.goldDeep }]}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Rating */}
        <View style={styles.ratingRow}>
          <View style={styles.stars}>
            {renderStars(place.avg_rating, colors.gold, colors.textMuted)}
          </View>
          <Text style={[styles.ratingValue, { color: colors.textBody }]}>
            {place.avg_rating > 0 ? place.avg_rating.toFixed(1) : '--'}
          </Text>
          <Text style={[styles.reviewsCount, { color: colors.textMuted }]}>
            ({place.reviews_count})
          </Text>
        </View>

        {/* Adresse */}
        {address ? (
          <View style={styles.addressRow}>
            <Icon name="map-pin" size={10} color={colors.textMuted} />
            <Text style={[styles.addressText, { color: colors.textMuted }]} numberOfLines={1}>
              {address}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cover: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  coverPlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  saveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  tagText: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  reviewsCount: {
    fontSize: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 11,
    flex: 1,
  },
});
