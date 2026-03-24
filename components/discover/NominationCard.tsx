import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { voteNomination } from '../../lib/progression';
import type { Nomination } from '../../lib/progression';

interface Props {
  nomination: Nomination;
  onVoted?: (updated: Nomination) => void;
}

export default function NominationCard({ nomination, onVoted }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [voting, setVoting] = useState(false);
  const [localVote, setLocalVote] = useState<boolean | null>(nomination.my_vote ?? null);

  const nominee = nomination.nominee;
  const totalVotes = nomination.votes_for + nomination.votes_against;
  const approvalPct = totalVotes > 0 ? Math.round((nomination.votes_for / totalVotes) * 100) : 0;
  const isActive = nomination.status === 'active';
  const daysLeft = Math.max(0, Math.ceil((new Date(nomination.voting_ends_at).getTime() - Date.now()) / 86400000));

  const handleVote = async (vote: boolean) => {
    if (!isActive || localVote !== null) return;
    setVoting(true);
    try {
      const updated = await voteNomination(nomination.id, vote);
      setLocalVote(vote);
      onVoted?.(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setVoting(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.dividerL }]}>
      {/* Nominee Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${colors.gold}15` }]}>
          {nominee?.avatar_url ? (
            <Image source={{ uri: nominee.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={{ fontSize: 16, color: colors.gold }}>
              {(nominee?.display_name ?? '?')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.textH }]}>
            {nominee?.display_name ?? nominee?.username ?? 'Unbekannt'}
          </Text>
          <Text style={[styles.question, { color: colors.gold }]}>Soll Soul Mentor werden?</Text>
        </View>
        {isActive && (
          <Text style={[styles.timer, { color: colors.textMuted }]}>
            {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'}
          </Text>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: `${colors.gold}15` }]}>
          <View style={[styles.progressFill, { width: `${approvalPct}%`, backgroundColor: colors.gold }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{totalVotes} Stimmen</Text>
          <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '600' }}>{approvalPct}% Zustimmung</Text>
        </View>
      </View>

      {/* Vote Buttons or Feedback */}
      {localVote !== null ? (
        <Text style={[styles.voteFeedback, { color: colors.textMuted }]}>
          Du hast mit „{localVote ? 'Ja' : 'Noch nicht'}" gestimmt
        </Text>
      ) : isActive ? (
        <View style={styles.voteRow}>
          <TouchableOpacity
            style={[styles.voteBtn, { backgroundColor: `${colors.gold}15`, borderColor: colors.gold }]}
            onPress={() => handleVote(true)}
            disabled={voting}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.gold, fontSize: 13, fontWeight: '600' }}>Ja, verdient</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voteBtn, { backgroundColor: `${colors.textMuted}10`, borderColor: colors.textMuted }]}
            onPress={() => handleVote(false)}
            disabled={voting}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>Noch nicht</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.voteFeedback, { color: colors.textMuted }]}>
          Abstimmung {nomination.status === 'approved' ? 'angenommen' : 'beendet'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
  },
  question: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  timer: {
    fontSize: 11,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  voteFeedback: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
