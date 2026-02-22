import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import type { Pulse } from '../types/pulse';
import { toggleLike, deletePulse } from '../lib/pulse';

interface Props {
  pulse: Pulse;
  currentUserId?: string;
  onDelete?: (id: string) => void;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'gerade eben';
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min.`;
  if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)} Std.`;
  return `vor ${Math.floor(seconds / 86400)} Tagen`;
}

export default function PulseCard({ pulse, currentUserId, onDelete }: Props) {
  const [liked, setLiked] = useState(pulse.has_liked ?? false);
  const [likesCount, setLikesCount] = useState(pulse.likes_count);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    if (!currentUserId || liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => c + (newLiked ? 1 : -1));
    try {
      await toggleLike(pulse.id, liked);
    } catch {
      setLiked(liked);
      setLikesCount((c) => c + (newLiked ? -1 : 1));
    }
    setLiking(false);
  };

  const handleDelete = () => {
    Alert.alert('Pulse löschen', 'Wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await deletePulse(pulse.id);
          onDelete?.(pulse.id);
        },
      },
    ]);
  };

  const isOwner = currentUserId === pulse.author.id;
  const authorName = pulse.author.display_name ?? pulse.author.username ?? 'Anonym';

  return (
    <View style={styles.card}>
      {/* Author */}
      <View style={styles.authorRow}>
        <View style={[styles.avatar, pulse.author.is_origin_soul && styles.avatarOrigin]}>
          <Text style={styles.avatarText}>
            {authorName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>{authorName}</Text>
            {pulse.author.is_origin_soul && (
              <View style={styles.originBadge}>
                <Text style={styles.originBadgeText}>ORIGIN SOUL</Text>
              </View>
            )}
          </View>
          <Text style={styles.timestamp}>{timeAgo(pulse.created_at)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <Text style={styles.content}>{pulse.content}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleLike}
          disabled={!currentUserId}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionIcon, liked && styles.actionIconLiked]}>
            {liked ? '♥' : '♡'}
          </Text>
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
            {likesCount > 0 ? `${likesCount} ` : ''}LIKE
          </Text>
        </TouchableOpacity>

        <View style={styles.actionBtn}>
          <Text style={styles.actionIcon}>○</Text>
          <Text style={styles.actionText}>
            {pulse.comments_count > 0 ? `${pulse.comments_count} ` : ''}KOMMENTARE
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2A35',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(200,169,110,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOrigin: {
    borderColor: 'rgba(200,169,110,0.5)',
  },
  avatarText: {
    fontSize: 16,
    color: '#C8A96E',
    fontWeight: '300',
  },
  authorInfo: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  authorName: { fontSize: 13, color: '#F0EDE8', fontWeight: '500' },
  originBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(168,137,78,0.3)',
    backgroundColor: 'rgba(168,137,78,0.1)',
  },
  originBadgeText: { fontSize: 7, letterSpacing: 2, color: '#A8894E' },
  timestamp: { fontSize: 11, color: '#5A5450', marginTop: 1 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: '#5A5450', fontSize: 18, lineHeight: 20 },
  content: {
    color: '#c8c0b8',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '300',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,169,110,0.06)',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionIcon: { fontSize: 14, color: '#5A5450' },
  actionIconLiked: { color: '#C8A96E' },
  actionText: { fontSize: 9, letterSpacing: 2, color: '#5A5450' },
  actionTextLiked: { color: '#C8A96E' },
});
