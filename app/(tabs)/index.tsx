import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme';
import PulseDashboard from '../../components/pulse/dashboard/PulseDashboard';
import CreatePulseModal from '../../components/CreatePulseModal';
import { Icon } from '../../components/Icon';

export default function PulseScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [showCreatePulse, setShowCreatePulse] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSolid }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PulseDashboard />
      </ScrollView>

      {/* FAB – Post erstellen */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.gold }]}
        onPress={() => setShowCreatePulse(true)}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={22} color="#fff" />
      </TouchableOpacity>

      <CreatePulseModal
        visible={showCreatePulse}
        onClose={() => setShowCreatePulse(false)}
        onCreated={() => setShowCreatePulse(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 96 },
  fab: {
    position: 'absolute', bottom: 24, right: 16,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },
});
