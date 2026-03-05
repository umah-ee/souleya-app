import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../../components/Icon';
import { fetchAnnouncements, fetchReviews } from '../../lib/studio';
import type { Announcement, Review } from '../../types/studio';

type Tab = 'announcements' | 'reviews';

export default function MessagesScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [tab, setTab] = useState<Tab>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'announcements') {
      fetchAnnouncements()
        .then((res) => setAnnouncements(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetchReviews()
        .then((res) => setReviews(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        name={i < rating ? 'star-filled' : 'star'}
        size={12}
        color={i < rating ? colors.gold : colors.textMuted}
      />
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSolid }]}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['announcements', 'reviews'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tabBtn,
              tab === t && { borderBottomColor: colors.gold, borderBottomWidth: 2 },
            ]}
            onPress={() => setTab(t)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: tab === t ? colors.gold : colors.textMuted },
            ]}>
              {t === 'announcements' ? 'ANKUENDIGUNGEN' : 'BEWERTUNGEN'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {tab === 'announcements' ? (
            announcements.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="message-circle" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keine Ankuendigungen</Text>
              </View>
            ) : (
              announcements.map((ann) => (
                <View key={ann.id} style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                  <Text style={[styles.cardTitle, { color: colors.textH }]}>{ann.title}</Text>
                  <Text style={[styles.cardBody, { color: colors.textBody }]} numberOfLines={3}>
                    {ann.body}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {new Date(ann.sent_at).toLocaleDateString('de-DE')}
                    </Text>
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {ann.recipient_count} Empfaenger
                    </Text>
                  </View>
                </View>
              ))
            )
          ) : (
            reviews.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="star" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keine Bewertungen</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                  <View style={styles.starsRow}>
                    {renderStars(review.rating)}
                  </View>
                  <Text style={[styles.cardBody, { color: colors.textBody }]} numberOfLines={4}>
                    {review.comment}
                  </Text>
                  {review.reply_text && (
                    <View style={[styles.replyBox, { backgroundColor: colors.goldBg, borderColor: colors.goldBorderS }]}>
                      <Text style={[styles.replyLabel, { color: colors.goldDeep }]}>DEINE ANTWORT</Text>
                      <Text style={[styles.replyText, { color: colors.textBody }]}>{review.reply_text}</Text>
                    </View>
                  )}
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {new Date(review.created_at).toLocaleDateString('de-DE')}
                  </Text>
                </View>
              ))
            )
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 12 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 9, letterSpacing: 2.5 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '500' },
  cardBody: { fontSize: 13, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 11 },

  starsRow: { flexDirection: 'row', gap: 2 },

  replyBox: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  replyLabel: { fontSize: 8, letterSpacing: 2 },
  replyText: { fontSize: 12, lineHeight: 18 },

  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyText: { fontSize: 13 },
});
