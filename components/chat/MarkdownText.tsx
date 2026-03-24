import { Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';

interface Props {
  text: string;
  style?: object;
}

interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function parseMarkdown(input: string): Segment[] {
  const segments: Segment[] = [];
  // Regex: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      segments.push({ text: match[3], italic: true });
    } else if (match[4]) {
      segments.push({ text: match[4], code: true });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex) });
  }

  return segments;
}

export default function MarkdownText({ text, style }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const segments = parseMarkdown(text);

  return (
    <Text style={[styles.base, { color: colors.text }, style]}>
      {segments.map((seg, i) => {
        if (seg.bold) {
          return <Text key={i} style={styles.bold}>{seg.text}</Text>;
        }
        if (seg.italic) {
          return <Text key={i} style={styles.italic}>{seg.text}</Text>;
        }
        if (seg.code) {
          return (
            <Text
              key={i}
              style={[styles.code, { backgroundColor: `${colors.textMuted}20`, color: colors.text }]}
            >
              {seg.text}
            </Text>
          );
        }
        return <Text key={i}>{seg.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 15,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
