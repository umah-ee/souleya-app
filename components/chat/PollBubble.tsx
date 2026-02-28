import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import type { Message, PollResult } from '../../types/chat';
import { getPollResults, votePoll } from '../../lib/chat';
import { Icon } from '../Icon';

interface Props {
  message: Message;
  currentUserId: string;
  /** Wird von aussen getriggert wenn ein poll_votes Realtime-Event kommt */
  refreshTrigger?: number;
}

export default function PollBubble({ message, currentUserId, refreshTrigger }: Props) {
  const [result, setResult] = useState<PollResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const pollId = message.metadata?.poll_id as string | undefined;
  const hasVoted = result?.options.some((o) => o.has_voted) ?? false;

  const loadResults = useCallback(async () => {
    if (!pollId) return;
    try {
      const data = await getPollResults(pollId);
      setResult(data);
    } catch (e) {
      console.error('Poll laden fehlgeschlagen:', e);
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Re-fetch bei Realtime-Trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadResults();
    }
  }, [refreshTrigger, loadResults]);

  const handleVote = async (optionId: string) => {
    if (!pollId || voting || result?.is_expired) return;
    setVoting(true);
    try {
      const updated = await votePoll(pollId, optionId);
      setResult(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#C8A96E" />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.container}>
        <Text style={styles.unavailable}>Abstimmung nicht verfuegbar</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Frage */}
      <Text style={styles.question}>{result.question}</Text>

      {/* Info-Badges */}
      <View style={styles.badgesRow}>
        {result.multiple_choice && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Mehrfachauswahl</Text>
          </View>
        )}
        {result.is_expired && (
          <View style={[styles.badge, styles.badgeExpired]}>
            <Text style={[styles.badgeText, { color: '#5A5450' }]}>Beendet</Text>
          </View>
        )}
      </View>

      {/* Optionen */}
      {result.options.map((option) => (
        <View key={option.id} style={{ marginBottom: 6 }}>
          {!hasVoted && !result.is_expired ? (
            /* Noch nicht abgestimmt: klickbare Buttons */
            <TouchableOpacity
              onPress={() => handleVote(option.id)}
              disabled={voting}
              style={[styles.optionBtn, voting && { opacity: 0.6 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.optionBtnText}>{option.label}</Text>
            </TouchableOpacity>
          ) : (
            /* Ergebnis-Ansicht */
            <View style={styles.resultRow}>
              {/* Prozentbalken */}
              <View
                style={[
                  styles.resultBar,
                  {
                    width: `${option.percentage}%` as unknown as number,
                    backgroundColor: option.has_voted
                      ? 'rgba(200,169,110,0.2)'
                      : 'rgba(255,255,255,0.03)',
                  },
                ]}
              />
              <View style={styles.resultContent}>
                <View style={styles.resultLabelRow}>
                  {option.has_voted && (
                    <Icon name="check" size={12} color="#C8A96E" />
                  )}
                  <Text style={styles.resultLabel}>{option.label}</Text>
                </View>
                <Text style={styles.resultPercent}>{option.percentage}%</Text>
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Stimmen-Count */}
      <Text style={styles.voteCount}>
        {result.total_votes} {result.total_votes === 1 ? 'Stimme' : 'Stimmen'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    minWidth: 200,
  },
  unavailable: {
    fontSize: 11,
    color: '#5A5450',
  },
  question: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F0EDE8',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(200,169,110,0.12)',
  },
  badgeExpired: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#C8A96E',
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionBtnText: {
    fontSize: 13,
    color: '#c8c0b8',
  },
  resultRow: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  resultBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 10,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    color: '#c8c0b8',
  },
  resultPercent: {
    fontSize: 11,
    color: '#5A5450',
    marginLeft: 8,
  },
  voteCount: {
    fontSize: 10,
    color: '#5A5450',
    marginTop: 4,
  },
});
