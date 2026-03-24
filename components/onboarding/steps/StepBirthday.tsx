/**
 * StepBirthday – Geburtstag eingeben + Sternzeichen-Vorschau
 * Nutzt 3 einfache TextInputs (Tag/Monat/Jahr) statt Native Date Picker.
 * Speichert sofort via PATCH /users/me
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../../store/theme';
import { updateProfile } from '../../../lib/profile';

const GOLD = '#C8A96E';

// ── Zodiac Calculation (mirror of web zodiac.ts) ──

interface ZodiacSign {
  sign: string;
  symbol: string;
}

const ZODIAC_SIGNS: Array<ZodiacSign & { fromMonth: number; fromDay: number; toMonth: number; toDay: number }> = [
  { sign: 'Steinbock', symbol: '\u2651', fromMonth: 12, fromDay: 22, toMonth: 1, toDay: 19 },
  { sign: 'Wassermann', symbol: '\u2652', fromMonth: 1, fromDay: 20, toMonth: 2, toDay: 18 },
  { sign: 'Fische', symbol: '\u2653', fromMonth: 2, fromDay: 19, toMonth: 3, toDay: 20 },
  { sign: 'Widder', symbol: '\u2648', fromMonth: 3, fromDay: 21, toMonth: 4, toDay: 19 },
  { sign: 'Stier', symbol: '\u2649', fromMonth: 4, fromDay: 20, toMonth: 5, toDay: 20 },
  { sign: 'Zwillinge', symbol: '\u264A', fromMonth: 5, fromDay: 21, toMonth: 6, toDay: 20 },
  { sign: 'Krebs', symbol: '\u264B', fromMonth: 6, fromDay: 21, toMonth: 7, toDay: 22 },
  { sign: 'Loewe', symbol: '\u264C', fromMonth: 7, fromDay: 23, toMonth: 8, toDay: 22 },
  { sign: 'Jungfrau', symbol: '\u264D', fromMonth: 8, fromDay: 23, toMonth: 9, toDay: 22 },
  { sign: 'Waage', symbol: '\u264E', fromMonth: 9, fromDay: 23, toMonth: 10, toDay: 22 },
  { sign: 'Skorpion', symbol: '\u264F', fromMonth: 10, fromDay: 23, toMonth: 11, toDay: 21 },
  { sign: 'Schuetze', symbol: '\u2650', fromMonth: 11, fromDay: 22, toMonth: 12, toDay: 21 },
];

function getZodiacSign(month: number, day: number): ZodiacSign | null {
  for (const s of ZODIAC_SIGNS) {
    if (s.fromMonth > s.toMonth) {
      if ((month === s.fromMonth && day >= s.fromDay) || (month === s.toMonth && day <= s.toDay)) {
        return { sign: s.sign, symbol: s.symbol };
      }
    } else {
      if ((month === s.fromMonth && day >= s.fromDay) || (month === s.toMonth && day <= s.toDay)) {
        return { sign: s.sign, symbol: s.symbol };
      }
    }
  }
  return null;
}

// ── Component ──

interface Props {
  onComplete: () => void;
  onBack: () => void;
  isFirst: boolean;
}

export default function StepBirthday({ onComplete, onBack, isFirst }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  const isValidDate = useMemo(() => {
    if (!day || !month || !year) return false;
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return false;
    if (monthNum < 1 || monthNum > 12) return false;
    if (dayNum < 1 || dayNum > 31) return false;
    if (yearNum < 1920 || yearNum > new Date().getFullYear()) return false;
    // Simple date validation
    const d = new Date(yearNum, monthNum - 1, dayNum);
    return d.getFullYear() === yearNum && d.getMonth() === monthNum - 1 && d.getDate() === dayNum;
  }, [day, month, year, dayNum, monthNum, yearNum]);

  const zodiac = useMemo(() => {
    if (!isValidDate) return null;
    return getZodiacSign(monthNum, dayNum);
  }, [isValidDate, monthNum, dayNum]);

  const handleDayChange = (t: string) => {
    const clean = t.replace(/\D/g, '').slice(0, 2);
    setDay(clean);
    if (clean.length === 2) monthRef.current?.focus();
  };

  const handleMonthChange = (t: string) => {
    const clean = t.replace(/\D/g, '').slice(0, 2);
    setMonth(clean);
    if (clean.length === 2) yearRef.current?.focus();
  };

  const handleYearChange = (t: string) => {
    setYear(t.replace(/\D/g, '').slice(0, 4));
  };

  const handleSave = async () => {
    if (!isValidDate) return;
    setSaving(true);
    setError('');
    try {
      const isoDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      await updateProfile({ birthday: isoDate } as any);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {/* Date Inputs: DD / MM / YYYY */}
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>Tag</Text>
          <TextInput
            value={day}
            onChangeText={handleDayChange}
            placeholder="TT"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.dateInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textBody }]}
            textAlign="center"
          />
        </View>
        <Text style={[styles.dateSep, { color: colors.textMuted }]}>.</Text>
        <View style={styles.dateField}>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>Monat</Text>
          <TextInput
            ref={monthRef}
            value={month}
            onChangeText={handleMonthChange}
            placeholder="MM"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.dateInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textBody }]}
            textAlign="center"
          />
        </View>
        <Text style={[styles.dateSep, { color: colors.textMuted }]}>.</Text>
        <View style={[styles.dateField, { flex: 1.5 }]}>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>Jahr</Text>
          <TextInput
            ref={yearRef}
            value={year}
            onChangeText={handleYearChange}
            placeholder="JJJJ"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            style={[styles.dateInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textBody }]}
            textAlign="center"
          />
        </View>
      </View>

      {/* Zodiac Preview */}
      {zodiac && (
        <View style={[styles.zodiacWrap, { backgroundColor: `${GOLD}12`, borderColor: `${GOLD}18` }]}>
          <Text style={styles.zodiacSymbol}>{zodiac.symbol}</Text>
          <View>
            <Text style={[styles.zodiacName, { color: GOLD }]}>{zodiac.sign}</Text>
            <Text style={[styles.zodiacHint, { color: colors.textMuted }]}>
              Dein Sternzeichen wird auf deinem Profil angezeigt
            </Text>
          </View>
        </View>
      )}

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
          style={[styles.nextBtn, { opacity: isValidDate && !saving ? 1 : 0.4 }]}
          onPress={handleSave}
          disabled={!isValidDate || saving}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  dateSep: {
    fontSize: 18,
    paddingBottom: 12,
  },
  zodiacWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  zodiacSymbol: {
    fontSize: 22,
  },
  zodiacName: {
    fontSize: 13,
    fontWeight: '500',
  },
  zodiacHint: {
    fontSize: 11,
    marginTop: 1,
  },
  error: {
    fontSize: 12,
    color: '#E57373',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
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
