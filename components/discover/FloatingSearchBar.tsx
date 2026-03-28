import React from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../Icon';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  locationName?: string;
  onGPSPress?: () => void;
  locatingGPS?: boolean;
}

export default function FloatingSearchBar({
  value, onChangeText,
  placeholder = 'Suchen …',
  locationName,
  onGPSPress,
  locatingGPS,
}: Props) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass,
          borderColor: colors.divider,
        },
      ]}
    >
      {/* Suchzeile */}
      <View style={styles.searchRow}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.input, { color: colors.textH }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="x" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Ort + GPS Button */}
      {(locationName || onGPSPress) && !value && (
        <View style={[styles.locationRow, { borderTopColor: `${colors.divider}80` }]}>
          <Icon name="map-pin" size={13} color={colors.gold} />
          <Text style={[styles.locationText, { color: colors.textSec }]} numberOfLines={1}>
            {locationName || 'Standort wird ermittelt …'}
          </Text>
          {onGPSPress && (
            <TouchableOpacity
              onPress={onGPSPress}
              disabled={locatingGPS}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.gpsBtn, { borderColor: colors.gold }]}
            >
              {locatingGPS ? (
                <ActivityIndicator size={10} color={colors.gold} />
              ) : (
                <Icon name="current-location" size={13} color={colors.gold} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontWeight: '500',
    paddingVertical: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  gpsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
