import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, TextInput, ActivityIndicator,
  Dimensions, Alert, Linking, RefreshControl, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import {
  fetchPlace, fetchPlaceReviews, createPlaceReview, updatePlaceReview,
  deletePlaceReview, savePlace, unsavePlace, fetchPlacePhotos,
} from '../../lib/places';
import type { Place, PlaceReview, PlacePhoto } from '../../types/places';
import { Icon } from '../../components/Icon';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_GAP = 4;
const PHOTO_COLS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - 32 - PHOTO_GAP * (PHOTO_COLS - 1)) / PHOTO_COLS;

function renderStars(
  rating: number,
  goldColor: string,
  mutedColor: string,
  size = 16,
) {
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const colors = useThemeStore((s) => s.colors);
  const userId = session?.user?.id;

  // ── State ───────────────────────────────────────────────
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  // Bewertung schreiben
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // ── Daten laden ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [placeData, reviewsData, photosData] = await Promise.all([
        fetchPlace(id, userId),
        fetchPlaceReviews(id),
        fetchPlacePhotos(id),
      ]);
      setPlace(placeData);
      setReviews(reviewsData.data);
      setPhotos(photosData);
      setSaved(placeData.is_saved ?? false);

      // Eigene Bewertung vorbelegen
      if (placeData.user_review) {
        setReviewRating(placeData.user_review.rating);
        setHasExistingReview(true);
      }
    } catch (e) {
      console.error('Place laden fehlgeschlagen:', e);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Speichern / Entsichern ──────────────────────────────
  const handleSaveToggle = async () => {
    if (!id || savingBookmark) return;
    setSavingBookmark(true);
    try {
      if (saved) {
        await unsavePlace(id);
        setSaved(false);
      } else {
        await savePlace(id);
        setSaved(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingBookmark(false);
    }
  };

  // ── Teilen ──────────────────────────────────────────────
  const handleShare = async () => {
    if (!place) return;
    try {
      await Share.share({
        message: `${place.name} auf Souleya entdecken!`,
        url: `https://circle.souleya.com/places/${place.slug ?? place.id}`,
      });
    } catch {
      // Abgebrochen
    }
  };

  // ── Route planen ────────────────────────────────────────
  const handleNavigate = () => {
    if (!place) return;
    const { location_lat: lat, location_lng: lng } = place;
    const label = encodeURIComponent(place.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}&ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  // ── Bewertung senden ────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!id || reviewRating === 0 || submittingReview) return;
    setSubmittingReview(true);
    try {
      const data = { rating: reviewRating, content: reviewContent.trim() || undefined };
      let review: PlaceReview;
      if (hasExistingReview) {
        review = await updatePlaceReview(id, data);
        setReviews((prev) => prev.map((r) => (r.user_id === userId ? review : r)));
      } else {
        review = await createPlaceReview(id, data);
        setReviews((prev) => [review, ...prev]);
        setHasExistingReview(true);
      }
      setReviewContent('');
      // Place-Daten aktualisieren (avg_rating etc.)
      const updatedPlace = await fetchPlace(id, userId);
      setPlace(updatedPlace);
    } catch (e) {
      Alert.alert('Fehler', 'Bewertung konnte nicht gespeichert werden.');
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Bewertung loeschen ──────────────────────────────────
  const handleDeleteReview = () => {
    if (!id) return;
    Alert.alert('Bewertung loeschen', 'Moechtest du deine Bewertung wirklich loeschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Loeschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlaceReview(id);
            setReviews((prev) => prev.filter((r) => r.user_id !== userId));
            setReviewRating(0);
            setReviewContent('');
            setHasExistingReview(false);
            const updatedPlace = await fetchPlace(id, userId);
            setPlace(updatedPlace);
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!place) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Ort nicht gefunden.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.gold, fontSize: 14 }}>Zurueck</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayTags = place.tags ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSolid }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
        }
      >
        {/* ── Cover ──────────────────────────────────────────── */}
        <View style={styles.coverContainer}>
          {place.cover_url ? (
            <Image source={{ uri: place.cover_url }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.goldBg }]}>
              <Icon name="map-pin" size={48} color={colors.goldBorderS} />
            </View>
          )}

          {/* Zurueck-Button */}
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.glass }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={20} color={colors.textH} />
          </TouchableOpacity>
        </View>

        {/* ── Info Card ──────────────────────────────────────── */}
        <View style={[styles.infoCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          {/* Name */}
          <Text style={[styles.placeName, { color: colors.textH }]}>{place.name}</Text>

          {/* Description */}
          {place.description ? (
            <Text style={[styles.description, { color: colors.textBody }]}>{place.description}</Text>
          ) : null}

          {/* Tags */}
          {displayTags.length > 0 && (
            <View style={styles.tagsRow}>
              {displayTags.map((tag) => (
                <View key={tag} style={[styles.tagBadge, { backgroundColor: colors.goldBg }]}>
                  <Text style={[styles.tagText, { color: colors.goldDeep }]}>{tag.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Adresse */}
          {place.address && (
            <View style={styles.addressRow}>
              <Icon name="map-pin" size={12} color={colors.textMuted} />
              <Text style={[styles.addressText, { color: colors.textSec }]}>
                {[place.address, place.city, place.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {/* ── Aktionszeile ─────────────────────────────────── */}
          <View style={styles.actionsRow}>
            {/* Speichern */}
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.goldBorderS }]}
              onPress={handleSaveToggle}
              disabled={savingBookmark}
              activeOpacity={0.7}
            >
              {savingBookmark ? (
                <ActivityIndicator size="small" color={colors.gold} />
              ) : (
                <Icon name={saved ? 'bookmark-filled' : 'bookmark'} size={16} color={colors.gold} />
              )}
              <Text style={[styles.actionBtnText, { color: colors.gold }]}>
                {saved ? 'Gespeichert' : 'Speichern'}
              </Text>
            </TouchableOpacity>

            {/* Teilen */}
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.goldBorderS }]}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Icon name="share" size={16} color={colors.gold} />
              <Text style={[styles.actionBtnText, { color: colors.gold }]}>Teilen</Text>
            </TouchableOpacity>

            {/* Route planen */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.gold, borderColor: colors.gold }]}
              onPress={handleNavigate}
              activeOpacity={0.7}
            >
              <Icon name="navigation" size={16} color={colors.textOnGold} />
              <Text style={[styles.actionBtnText, { color: colors.textOnGold }]}>Route planen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Bewertungen Zusammenfassung ─────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textH }]}>Bewertungen</Text>

          <View style={styles.ratingSummary}>
            <Text style={[styles.ratingBig, { color: colors.gold }]}>
              {place.avg_rating > 0 ? place.avg_rating.toFixed(1) : '--'}
            </Text>
            <View style={styles.ratingMeta}>
              <View style={styles.starsRow}>
                {renderStars(place.avg_rating, colors.gold, colors.textMuted, 18)}
              </View>
              <Text style={[styles.ratingCountText, { color: colors.textMuted }]}>
                {place.reviews_count} {place.reviews_count === 1 ? 'Bewertung' : 'Bewertungen'}
              </Text>
            </View>
          </View>

          {/* ── Bestehende Reviews ────────────────────────────── */}
          {reviews.length > 0 && (
            <View style={[styles.reviewsList, { borderTopColor: colors.divider }]}>
              {reviews.map((review) => {
                const isOwnReview = review.user_id === userId;
                const reviewerName =
                  review.profile?.display_name ?? review.profile?.username ?? 'Anonym';
                const initial = reviewerName.slice(0, 1).toUpperCase();

                return (
                  <View key={review.id} style={[styles.reviewItem, { borderBottomColor: colors.dividerL }]}>
                    <View style={styles.reviewHeader}>
                      {/* Avatar */}
                      <View style={[styles.reviewAvatar, { backgroundColor: colors.avatarBg, borderColor: colors.goldBorderS }]}>
                        {review.profile?.avatar_url ? (
                          <Image source={{ uri: review.profile.avatar_url }} style={styles.reviewAvatarImg} />
                        ) : (
                          <Text style={[styles.reviewAvatarText, { color: colors.gold }]}>{initial}</Text>
                        )}
                      </View>
                      <View style={styles.reviewHeaderInfo}>
                        <Text style={[styles.reviewAuthor, { color: colors.textH }]}>{reviewerName}</Text>
                        <View style={styles.reviewStarsRow}>
                          {renderStars(review.rating, colors.gold, colors.textMuted, 12)}
                          <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                            {formatDate(review.created_at)}
                          </Text>
                        </View>
                      </View>
                      {isOwnReview && (
                        <TouchableOpacity onPress={handleDeleteReview} style={{ padding: 4 }}>
                          <Icon name="trash" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {review.content ? (
                      <Text style={[styles.reviewContent, { color: colors.textBody }]}>{review.content}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Bewertung schreiben ──────────────────────────── */}
          {userId && (
            <View style={[styles.reviewForm, { borderTopColor: colors.divider }]}>
              <Text style={[styles.reviewFormTitle, { color: colors.textSec }]}>
                {hasExistingReview ? 'Bewertung bearbeiten' : 'Bewertung schreiben'}
              </Text>

              {/* Sterne auswaehlen */}
              <View style={styles.reviewStarsInput}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Icon
                      name={star <= reviewRating ? 'star-filled' : 'star'}
                      size={28}
                      color={star <= reviewRating ? colors.gold : colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Kommentar */}
              <TextInput
                style={[
                  styles.reviewInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.textH,
                  },
                ]}
                value={reviewContent}
                onChangeText={setReviewContent}
                placeholder="Beschreibe deine Erfahrung ... (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />

              {/* Absenden */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.gold },
                  (reviewRating === 0 || submittingReview) && { opacity: 0.5 },
                ]}
                onPress={handleSubmitReview}
                disabled={reviewRating === 0 || submittingReview}
                activeOpacity={0.7}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color={colors.textOnGold} />
                ) : (
                  <Text style={[styles.submitBtnText, { color: colors.textOnGold }]}>
                    {hasExistingReview ? 'Aktualisieren' : 'Bewertung senden'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Fotos ──────────────────────────────────────────── */}
        {photos.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <View style={styles.sectionHeader}>
              <Icon name="camera" size={14} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textH }]}>Fotos</Text>
              <Text style={[styles.photoCount, { color: colors.textMuted }]}>({photos.length})</Text>
            </View>

            <View style={styles.photosGrid}>
              {photos.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.url ?? photo.storage_path }}
                  style={[
                    styles.photoThumb,
                    {
                      width: PHOTO_SIZE,
                      height: PHOTO_SIZE,
                    },
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // ── Cover ─────────────────────────────────────────────
  coverContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 240,
  },
  coverPlaceholder: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Info Card ──────────────────────────────────────────
  infoCard: {
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  tagText: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 12,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Section ────────────────────────────────────────────
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Rating Summary ─────────────────────────────────────
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  ratingBig: {
    fontSize: 36,
    fontWeight: '600',
  },
  ratingMeta: {
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingCountText: {
    fontSize: 12,
  },

  // ── Reviews List ───────────────────────────────────────
  reviewsList: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  reviewItem: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reviewAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewAvatarText: {
    fontSize: 13,
    fontWeight: '400',
  },
  reviewHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewDate: {
    fontSize: 10,
    marginLeft: 4,
  },
  reviewContent: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginLeft: 42,
    fontWeight: '400',
  },

  // ── Review Form ────────────────────────────────────────
  reviewForm: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  reviewFormTitle: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reviewStarsInput: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 80,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // ── Photos Grid ────────────────────────────────────────
  photoCount: {
    fontSize: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GAP,
  },
  photoThumb: {
    borderRadius: 8,
  },
});
