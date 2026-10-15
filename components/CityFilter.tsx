import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { City } from '@/api';

type Props = {
  cities: City[];
  selectedCityId: string | null;
  onSelectCity: (cityId: string | null) => void;
};

export default function CityFilter({ cities, selectedCityId, onSelectCity }: Props) {
  const dark = useColorScheme() === 'dark';
  const inactiveBackground = dark ? '#1C2541' : '#FFFFFF';
  const inactiveBorder = dark ? '#7F1D1D' : '#FECACA';
  const inactiveText = dark ? '#F8FAFC' : '#111111';

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: selectedCityId === null }}
        onPress={() => onSelectCity(null)}
        style={[styles.chip, {
          backgroundColor: selectedCityId === null ? AppPalette.brightOrange : inactiveBackground,
          borderColor: selectedCityId === null ? AppPalette.brightOrange : inactiveBorder,
        }]}
      >
        <Ionicons name="globe-outline" size={13} color={selectedCityId === null ? '#FFFFFF' : AppPalette.brightOrange} />
        <Text style={[styles.text, { color: selectedCityId === null ? '#FFFFFF' : inactiveText }]}>All Cities</Text>
      </Pressable>
      {cities.map(city => {
        const selected = selectedCityId === city._id;
        return (
          <Pressable
            key={city._id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelectCity(city._id)}
            style={[styles.chip, {
              backgroundColor: selected ? AppPalette.brightOrange : inactiveBackground,
              borderColor: selected ? AppPalette.brightOrange : inactiveBorder,
            }]}
          >
            <Ionicons name={selected ? 'location' : 'location-outline'} size={13} color={selected ? '#FFFFFF' : AppPalette.brightOrange} />
            <Text numberOfLines={1} style={[styles.text, { color: selected ? '#FFFFFF' : inactiveText }]}>{city.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 16, paddingVertical: 4, gap: 8, alignItems: 'center' },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, maxWidth: 185 },
  text: { fontSize: 12, fontWeight: '800' },
});
