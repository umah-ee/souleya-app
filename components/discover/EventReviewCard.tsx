import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';
import type { EventReview } from '../../lib/progression';

interface Props {
  review: EventReview;
  currentUserId?: string;
  onDelete?: (reviewId: string) => void;
}

function StarDisplay({ rating }: { rating: number }) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={{ fontSize: 14, color: star <= rating ? colors.gold : `${colors.textMuted}40` }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export default function EventReviewCard({ review, currentUserId, onDelete }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const profile = review.profile;
  const isOwn = review.user_id === currentUserId;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.dividerL }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${colors.gold}15` }]}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={{ fontSize: 14, color: colors.gold }}>
              {(profile?.display_name ?? '?')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.textH }]}>
            {profile?.display_name ?? profile?.username ?? 'Anonym'}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {new Date(review.created_at).toLocaleDateString('de-DE')}
          </Text>
        </View>
        <StarDisplay rating={review.rating} />
      </View>
      {review.comment && (
        <Text style={[styles.comment, { color: colors.text }]}>{review.comment}</Text>
      )}
      {isOwn && onDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(review.id)}
          activeOpacity={0.7}
        >
          <Icon name="trash" size={14} color="#E05A5A" />
          <Text style={{ fontSize: 12, color: '#E05A5A' }}>Löschen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
  },
  date: {
    fontSize: 10,
  },
  comment: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 8,
    padding: 4,
  },
});
