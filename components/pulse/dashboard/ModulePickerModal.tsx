import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, StyleSheet, Platform, TouchableWithoutFeedback } from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { Icon, type IconName } from '../../Icon';

export interface ModuleDefinition {
  key: string;
  icon: IconName;
  name: string;
  description: string;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  { key: 'breath', icon: 'droplet', name: 'Atemuebung', description: 'Box-Atmung, 4-7-8 oder Wim Hof' },
  { key: 'meditation', icon: 'clock', name: 'Meditation', description: 'Timer fuer stille Meditation' },
  { key: 'gratitude', icon: 'heart', name: 'Dankbarkeit', description: 'Drei Dinge, fuer die du dankbar bist' },
  { key: 'intention', icon: 'navigation', name: 'Tagesintention', description: 'Setze deinen Fokus fuer den Tag' },
  { key: 'journal', icon: 'pencil', name: 'Micro-Journal', description: 'Taegliche Reflexionsfrage' },
  { key: 'checkin', icon: 'face-smile', name: 'Check-in', description: 'Wie fuehlt sich dein Tag an?' },
  { key: 'oracle', icon: 'sparkles', name: 'Tagesimpuls', description: 'Ziehe eine Weisheitskarte' },
  { key: 'movement', icon: 'heart', name: 'Bewegung', description: 'Dehnen, Yoga oder Spaziergang' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeModules: string[];
  onAdd: (key: string) => void;
}

export default function ModulePickerModal({ isOpen, onClose, activeModules, onAdd }: Props) {
  const colors = useThemeStore((s) => s.colors);

  if (!isOpen) return null;

  const renderItem = ({ item }: { item: ModuleDefinition }) => {
    const isActive = activeModules.includes(item.key);
    return (
      <TouchableOpacity
        style={[styles.moduleRow, isActive && { opacity: 0.4 }]}
        onPress={() => { if (!isActive) { onAdd(item.key); onClose(); } }}
        disabled={isActive}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.gold + '18' }]}>
          <Icon name={item.icon} size={18} color={colors.gold} />
        </View>
        <View style={styles.moduleInfo}>
          <Text style={[styles.moduleName, { color: colors.textH }]}>{item.name}</Text>
          <Text style={[styles.moduleDesc, { color: colors.textMuted }]}>{item.description}</Text>
        </View>
        {isActive && (
          <View style={[styles.activeBadge, { backgroundColor: colors.gold + '20' }]}>
            <Text style={[styles.activeBadgeText, { color: colors.gold }]}>Aktiv</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={[styles.panel, { backgroundColor: colors.bgSolid, borderColor: colors.divider }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textH }]}>Modul hinzufuegen</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Icon name="x" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={MODULE_REGISTRY}
          keyExtractor={(m) => m.key}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: Platform.select({ ios: 34, android: 16 }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }) },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  moduleInfo: { flex: 1, gap: 2 },
  moduleName: { fontSize: 14, fontWeight: '600' },
  moduleDesc: { fontSize: 12, fontWeight: '500' },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeBadgeText: { fontSize: 10, fontWeight: '600' },
});
