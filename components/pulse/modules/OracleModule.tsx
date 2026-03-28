import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';

interface WisdomQuote {
  text: string;
  author: string;
  tradition: string;
}

const ORACLE_QUOTES: WisdomQuote[] = [
  { text: 'Der Weg entsteht, indem man ihn geht.', author: 'Antonio Machado', tradition: 'Poesie' },
  { text: 'In der Stille liegt die Kraft.', author: 'Lao Tzu', tradition: 'Taoismus' },
  { text: 'Die einzige Reise ist die nach innen.', author: 'Rainer Maria Rilke', tradition: 'Poesie' },
  { text: 'Wenn du atmest, bist du lebendig. Wenn du bewusst atmest, bist du wach.', author: 'Thich Nhat Hanh', tradition: 'Buddhismus' },
  { text: 'Wer nach aussen schaut, traeumt. Wer nach innen schaut, erwacht.', author: 'Carl Jung', tradition: 'Psychologie' },
  { text: 'Es gibt keinen Weg zum Glueck. Gluecklichsein ist der Weg.', author: 'Buddha', tradition: 'Buddhismus' },
  { text: 'Was du suchst, sucht auch dich.', author: 'Rumi', tradition: 'Sufismus' },
];

function getDailyQuote(): WisdomQuote {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return ORACLE_QUOTES[dayOfYear % ORACLE_QUOTES.length];
}

interface Props { onRemove: () => void }

export default function OracleModule({ onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [quote, setQuote] = useState<WisdomQuote>(getDailyQuote);
  const [drawing, setDrawing] = useState(false);

  const drawNew = useCallback(() => {
    setDrawing(true);
    setTimeout(() => {
      const idx = Math.floor(Math.random() * ORACLE_QUOTES.length);
      setQuote(ORACLE_QUOTES[idx]);
      setDrawing(false);
    }, 400);
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Icon name="sparkles" size={16} color={colors.gold} />
        <Text style={[styles.title, { color: colors.textH }]}>Tagesimpuls</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="x" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[styles.quoteCard, { borderColor: colors.gold + '40', opacity: drawing ? 0.3 : 1 }]}>
        <Text style={[styles.tradition, { color: colors.gold }]}>
          {quote.tradition.toUpperCase()}
        </Text>
        <Text style={[styles.quoteText, { color: colors.textH }]}>
          „{quote.text}"
        </Text>
        <Text style={[styles.author, { color: colors.textMuted }]}>
          — {quote.author}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.drawBtn, { borderColor: colors.divider }]}
        onPress={drawNew}
        disabled={drawing}
        activeOpacity={0.7}
      >
        <Text style={[styles.drawBtnText, { color: colors.textMuted }]}>
          Neue Karte ziehen
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  quoteCard: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 6 },
  tradition: { fontSize: 8, fontWeight: '600', letterSpacing: 2 },
  quoteText: { fontSize: 15, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontStyle: 'italic', lineHeight: 22 },
  author: { fontSize: 11, fontWeight: '500' },
  drawBtn: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  drawBtnText: { fontSize: 12, fontWeight: '500' },
});
