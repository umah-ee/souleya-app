import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  Image, TextInput, ActivityIndicator,
} from 'react-native';
import type { Pulse, PulseComment } from '../types/pulse';
import { toggleLike, deletePulse, fetchComments, addComment } from '../lib/pulse';
import { Icon } from './Icon';

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
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(pulse.comments_count);
  const [comments, setComments] = useState<PulseComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    Alert.alert('Pulse loeschen', 'Wirklich loeschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Loeschen', style: 'destructive',
        onPress: async () => {
          await deletePulse(pulse.id);
          onDelete?.(pulse.id);
        },
      },
    ]);
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      setShowComments(true);
      setCommentsLoading(true);
      try {
        const data = await fetchComments(pulse.id);
        setComments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setCommentsLoading(false);
      }
    } else {
      setShowComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting || !currentUserId) return;
    setSubmitting(true);
    try {
      const comment = await addComment(pulse.id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      setCommentsCount((c) => c + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = currentUserId === pulse.author.id;
  const authorName = pulse.author.display_name ?? pulse.author.username ?? 'Anonym';

  return (
    <View style={styles.card}>
      {/* Author */}
      <View style={styles.authorRow}>
        <View style={[styles.avatar, pulse.author.is_first_light && styles.avatarFirstLight]}>
          {pulse.author.avatar_url ? (
            <Image source={{ uri: pulse.author.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {authorName.slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>{authorName}</Text>
            {pulse.author.is_first_light && (
              <View style={styles.firstLightBadge}>
                <Text style={styles.firstLightBadgeText}>FIRST LIGHT</Text>
              </View>
            )}
          </View>
          <Text style={styles.timestamp}>{timeAgo(pulse.created_at)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Icon name="x" size={16} color="#5A5450" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <Text style={styles.content}>{pulse.content}</Text>

      {/* Image */}
      {pulse.image_url && (
        <Image
          source={{ uri: pulse.image_url }}
          style={styles.pulseImage}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleLike}
          disabled={!currentUserId}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Icon name={liked ? 'heart-filled' : 'heart'} size={16} color={liked ? '#C8A96E' : '#5A5450'} />
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
            {likesCount > 0 ? `${likesCount} ` : ''}LIKE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToggleComments}
          style={styles.actionBtn}
          activeOpacity={0.7}
        >
          <Icon name="message-circle" size={16} color={showComments ? '#C8A96E' : '#5A5450'} />
          <Text style={[styles.actionText, showComments && styles.actionTextLiked]}>
            {commentsCount > 0 ? `${commentsCount} ` : ''}KOMMENTARE
          </Text>
        </TouchableOpacity>
      </View>

      {/* Kommentare */}
      {showComments && (
        <View style={styles.commentsSection}>
          {commentsLoading ? (
            <ActivityIndicator color="#C8A96E" size="small" style={{ marginVertical: 12 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>Noch keine Kommentare. Sei der Erste!</Text>
          ) : (
            comments.map((c) => {
              const cName = c.author.display_name ?? c.author.username ?? 'Anonym';
              const cInitial = cName.slice(0, 1).toUpperCase();
              return (
                <View key={c.id} style={styles.commentRow}>
                  <View style={styles.commentAvatar}>
                    {c.author.avatar_url ? (
                      <Image source={{ uri: c.author.avatar_url }} style={styles.commentAvatarImg} />
                    ) : (
                      <Text style={styles.commentAvatarText}>{cInitial}</Text>
                    )}
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{cName}</Text>
                      <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.content}</Text>
                  </View>
                </View>
              );
            })
          )}

          {/* Neuer Kommentar */}
          {currentUserId && (
            <View style={styles.commentForm}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Kommentar schreiben …"
                placeholderTextColor="#5A5450"
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!newComment.trim() || submitting) && styles.commentSendBtnDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.commentSendText}>{submitting ? '…' : 'SENDEN'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
    overflow: 'hidden',
  },
  avatarFirstLight: {
    borderColor: 'rgba(200,169,110,0.5)',
  },
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  avatarText: {
    fontSize: 16,
    color: '#C8A96E',
    fontWeight: '300',
  },
  authorInfo: { flex: 1 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  authorName: { fontSize: 13, color: '#F0EDE8', fontWeight: '500' },
  firstLightBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(168,137,78,0.3)',
    backgroundColor: 'rgba(168,137,78,0.1)',
  },
  firstLightBadgeText: { fontSize: 7, letterSpacing: 2, color: '#A8894E' },
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
  pulseImage: {
    width: '100%', height: 200,
    borderRadius: 12, marginBottom: 12,
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

  // Kommentare
  commentsSection: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(200,169,110,0.06)',
  },
  noComments: { fontSize: 12, color: '#5A5450', paddingVertical: 8 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.15)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  commentAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  commentAvatarText: { fontSize: 11, color: '#C8A96E' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  commentAuthor: { fontSize: 12, color: '#F0EDE8', fontWeight: '500' },
  commentTime: { fontSize: 10, color: '#5A5450' },
  commentText: { fontSize: 12, color: '#c8c0b8', lineHeight: 18, fontWeight: '300', marginTop: 2 },
  commentForm: { flexDirection: 'row', gap: 8, marginTop: 8 },
  commentInput: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.1)',
    borderRadius: 8, color: '#F0EDE8', fontSize: 12,
  },
  commentSendBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, backgroundColor: 'rgba(200,169,110,0.2)',
  },
  commentSendBtnDisabled: { backgroundColor: 'rgba(200,169,110,0.08)' },
  commentSendText: { fontSize: 8, letterSpacing: 2, color: '#C8A96E' },
});
