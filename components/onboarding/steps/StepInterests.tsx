/**
 * StepInterests – Interessen auswaehlen (Akkordeon + Checkboxen, min 3, max 15)
 * Speichert sofort via PATCH /users/me
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { updateProfile } from '../../../lib/profile';
import { Icon } from '../../Icon';

const GOLD = '#C8A96E';
const MIN_INTERESTS = 3;
const MAX_INTERESTS = 15;

// ── Interest Categories (from web interestTags.ts) ──

const INTEREST_CATEGORIES: Array<{ category: string; icon: string; tags: string[] }> = [
  {
    category: 'Meditation & Achtsamkeit',
    icon: 'sparkles',
    tags: ['Gefuehrte Meditation', 'Stille Meditation', 'Body Scan', 'Gehmeditation', 'Transzendentale Meditation'],
  },
  {
    category: 'Yoga & Bewegung',
    icon: 'run',
    tags: ['Hatha Yoga', 'Vinyasa Flow', 'Yin Yoga', 'Kundalini Yoga', 'Pilates', 'Tai Chi', 'Qigong'],
  },
  {
    category: 'Breathwork',
    icon: 'droplet',
    tags: ['Holotropes Atmen', 'Wim Hof Methode', 'Box Breathing', 'Pranayama', 'Transformatives Atmen'],
  },
  {
    category: 'Ernaehrung & Gesundheit',
    icon: 'flame',
    tags: ['Ayurveda', 'TCM', 'Fasten', 'Pflanzenbasiert', 'Superfoods', 'Darmgesundheit'],
  },
  {
    category: 'Persoenlichkeitsentwicklung',
    icon: 'target',
    tags: ['Journaling', 'Zielsetzung', 'Gewohnheiten', 'Selbstliebe', 'Inneres Kind', 'Grenzen setzen'],
  },
  {
    category: 'Psychologie',
    icon: 'shield',
    tags: ['Achtsamkeitsbasierte Therapie', 'Positive Psychologie', 'Resilienz', 'Trauma-Arbeit', 'Emotionale Intelligenz'],
  },
  {
    category: 'Spiritualitaet',
    icon: 'star',
    tags: ['Chakra-Arbeit', 'Schamanismus', 'Energiearbeit', 'Rituale', 'Astrologie', 'Tarot', 'Kristalle'],
  },
];

const ALL_TAGS = INTEREST_CATEGORIES.flatMap((c) => c.tags);

interface Props {
  currentInterests?: string[];
  onComplete: () => void;
  onBack: () => void;
  isFirst: boolean;
}

export default function StepInterests({ currentInterests, onComplete, onBack, isFirst }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [selected, setSelected] = useState<string[]>(currentInterests ?? []);
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isFull = selected.length >= MAX_INTERESTS;
  const isValid = selected.length >= MIN_INTERESTS;

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return ALL_TAGS.filter((t) => t.toLowerCase().includes(q) && !selected.includes(t));
  }, [search, selected]);

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      setSelected((prev) => prev.filter((t) => t !== tag));
    } else if (!isFull) {
      setSelected((prev) => [...prev, tag]);
      setSearch('');
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile({ interests: selected });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {/* Selected Tags */}
      {selected.length > 0 && (
        <View style={styles.selectedWrap}>
          {selected.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.selectedTag, { backgroundColor: `${GOLD}20`, borderColor: `${GOLD}30` }]}
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectedTagText, { color: GOLD }]}>{tag}</Text>
              <Icon name="x" size={10} color={GOLD} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Counter */}
      <Text style={[styles.counter, { color: isValid ? colors.textMuted : '#E57373' }]}>
        {selected.length} / {MAX_INTERESTS} {selected.length < MIN_INTERESTS ? `(min. ${MIN_INTERESTS})` : ''}
      </Text>

      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Suchen …"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.searchInput,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.textBody,
          },
        ]}
      />

      {/* Search results */}
      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.slice(0, 5).map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.searchResultItem, { borderColor: colors.inputBorder }]}
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.searchResultText, { color: colors.textBody }]}>{tag}</Text>
              <Icon name="plus" size={12} color={GOLD} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Categories Accordion */}
      <ScrollView style={styles.categories} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {INTEREST_CATEGORIES.map((cat) => {
          const isExpanded = expandedCategory === cat.category;
          return (
            <View key={cat.category} style={[styles.catWrap, { borderColor: colors.inputBorder }]}>
              <TouchableOpacity
                style={styles.catHeader}
                onPress={() => setExpandedCategory(isExpanded ? null : cat.category)}
                activeOpacity={0.7}
              >
                <Icon name={cat.icon as any} size={16} color={GOLD} />
                <Text style={[styles.catTitle, { color: colors.textH }]}>{cat.category}</Text>
                <Icon name={isExpanded ? 'x' : 'chevron-right'} size={12} color={colors.textMuted} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.catTags}>
                  {cat.tags.map((tag) => {
                    const isSelected = selected.includes(tag);
                    const disabled = isFull && !isSelected;
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.catTag,
                          isSelected
                            ? { backgroundColor: `${GOLD}20`, borderColor: GOLD }
                            : { backgroundColor: 'transparent', borderColor: colors.inputBorder },
                          disabled && { opacity: 0.4 },
                        ]}
                        onPress={() => !disabled && toggleTag(tag)}
                        activeOpacity={0.7}
                        disabled={disabled}
                      >
                        {isSelected && <Icon name="check" size={10} color={GOLD} />}
                        <Text style={[styles.catTagText, { color: isSelected ? GOLD : colors.textBody }]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Buttons */}
      <View style={styles.buttons}>
        {!isFirst ? (
          <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
            <Text style={[styles.backText, { color: colors.textBody }]}>← Zurueck</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { opacity: isValid && !saving ? 1 : 0.4 }]}
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#1A1714" size="small" />
          ) : (
            <Text style={styles.nextBtnText}>Weiter →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  selectedTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  counter: {
    fontSize: 11,
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  searchResults: {
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchResultText: {
    fontSize: 13,
  },
  categories: {
    maxHeight: 240,
    marginBottom: 8,
  },
  catWrap: {
    borderBottomWidth: 1,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  catTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  catTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 12,
  },
  catTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  catTagText: {
    fontSize: 11.5,
  },
  error: {
    fontSize: 12,
    color: '#E57373',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  backText: {
    fontSize: 12.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#C8A96E',
  },
  nextBtnText: {
    color: '#1A1714',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
