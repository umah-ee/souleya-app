import { ScrollView, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import PulseDashboard from '../../components/pulse/dashboard/PulseDashboard';

export default function PulseScreen() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgSolid }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PulseDashboard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});
