import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../../store/theme';
import { Icon } from '../../Icon';
import ModulePickerModal from './ModulePickerModal';

// Module-Imports
import BreathModule from '../modules/BreathModule';
import MeditationModule from '../modules/MeditationModule';
import GratitudeModule from '../modules/GratitudeModule';
import IntentionModule from '../modules/IntentionModule';
import JournalModule from '../modules/JournalModule';
import CheckinModule from '../modules/CheckinModule';
import OracleModule from '../modules/OracleModule';
import MovementModule from '../modules/MovementModule';

const STORAGE_KEY = 'souleya_toolkit_modules';
const DEFAULT_MODULES = ['breath', 'gratitude'];

const MODULE_COMPONENTS: Record<string, ComponentType<{ onRemove: () => void }>> = {
  breath: BreathModule,
  meditation: MeditationModule,
  gratitude: GratitudeModule,
  intention: IntentionModule,
  journal: JournalModule,
  checkin: CheckinModule,
  oracle: OracleModule,
  movement: MovementModule,
};

function getTimeLabel(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Dein Morgen';
  if (h >= 12 && h < 17) return 'Dein Nachmittag';
  if (h >= 17 && h < 21) return 'Dein Abend';
  return 'Deine Nacht';
}

export default function ToolkitSection() {
  const colors = useThemeStore((s) => s.colors);
  const [activeModules, setActiveModules] = useState<string[]>(DEFAULT_MODULES);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) setActiveModules(parsed);
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((modules: string[]) => {
    setActiveModules(modules);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(modules)).catch(() => {});
  }, []);

  const handleAdd = useCallback((key: string) => {
    persist([...activeModules, key]);
  }, [activeModules, persist]);

  const handleRemove = useCallback((key: string) => {
    persist(activeModules.filter((k) => k !== key));
  }, [activeModules, persist]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.label, { color: colors.textH }]}>{getTimeLabel()}</Text>
          <Text style={[styles.sublabel, { color: colors.textMuted }]}>
            Stelle dir dein Ritual zusammen
          </Text>
        </View>
      </View>

      {/* Module Grid */}
      <View style={styles.grid}>
        {activeModules.map((key) => {
          const Component = MODULE_COMPONENTS[key];
          if (!Component) return null;
          return <Component key={key} onRemove={() => handleRemove(key)} />;
        })}

        {/* Add Card */}
        <TouchableOpacity
          style={[styles.addCard, { borderColor: colors.gold + '40' }]}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.addIconCircle, { backgroundColor: colors.gold + '18' }]}>
            <Icon name="plus" size={20} color={colors.gold} />
          </View>
          <Text style={[styles.addLabel, { color: colors.textMuted }]}>Modul hinzufuegen</Text>
        </TouchableOpacity>
      </View>

      <ModulePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        activeModules={activeModules}
        onAdd={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 18, fontWeight: '600', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }) },
  sublabel: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  grid: { gap: 10 },
  addCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addLabel: { fontSize: 13, fontWeight: '500' },
});
