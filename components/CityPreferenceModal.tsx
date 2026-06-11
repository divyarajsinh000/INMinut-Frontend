import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { City } from '@/api';
import { AppPalette } from '@/constants/theme';

interface Props {
  visible: boolean;
  cities: City[];
  selectedCityIds: string[];
  required?: boolean;
  onSave: (cityIds: string[]) => void;
  onClose?: () => void;
}

const CityPreferenceModal = ({
  visible,
  cities,
  selectedCityIds,
  required = false,
  onSave,
  onClose,
}: Props) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedCityIds || []);

  useEffect(() => {
    if (visible) setLocalSelected(selectedCityIds || []);
  }, [selectedCityIds, visible]);

  const groupedCities = useMemo(() => {
    return [...cities].sort((a, b) => a.name.localeCompare(b.name));
  }, [cities]);

  const toggleCity = (cityId: string) => {
    setLocalSelected((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  };

  const handleSave = () => {
    onSave(localSelected);
  };

  const handleShowAllCities = () => {
    setLocalSelected([]);
    onSave([]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="location-outline" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.title}>Choose your cities</ThemedText>
              <ThemedText style={styles.subtitle}>
                Select cities to personalize your feed, or continue with all cities.
              </ThemedText>
            </View>
          </View>

          <View style={styles.selectedBox}>
            <ThemedText style={styles.selectedCount}>{localSelected.length}</ThemedText>
            <ThemedText style={styles.selectedLabel}>
              {localSelected.length === 0 ? 'All cities selected' : localSelected.length === 1 ? 'city selected' : 'cities selected'}
            </ThemedText>
          </View>

          <ScrollView style={styles.cityList} contentContainerStyle={styles.cityListContent}>
            <Pressable
              onPress={() => setLocalSelected([])}
              style={[styles.cityPill, localSelected.length === 0 && styles.cityPillSelected]}
            >
              <Ionicons
                name={localSelected.length === 0 ? 'checkmark-circle' : 'globe-outline'}
                size={18}
                color={localSelected.length === 0 ? '#fff' : AppPalette.brightOrange}
              />
              <ThemedText style={[styles.cityText, localSelected.length === 0 && styles.cityTextSelected]}>
                All cities
              </ThemedText>
            </Pressable>
            {groupedCities.map((city) => {
              const selected = localSelected.includes(city._id);
              return (
                <Pressable
                  key={city._id}
                  onPress={() => toggleCity(city._id)}
                  style={[styles.cityPill, selected && styles.cityPillSelected]}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selected ? '#fff' : AppPalette.brightOrange}
                  />
                  <ThemedText style={[styles.cityText, selected && styles.cityTextSelected]}>
                    {city.name}{city.state?.name ? `, ${city.state.name}` : ''}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {cities.length === 0 && (
            <ThemedText style={styles.emptyText}>No cities available. Add cities from admin panel first.</ThemedText>
          )}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={required ? handleShowAllCities : onClose}>
              <ThemedText style={styles.secondaryButtonText}>{required ? 'Skip / Show All' : 'Cancel'}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleSave}
            >
              <ThemedText style={styles.primaryButtonText}>{localSelected.length === 0 ? 'Show All News' : 'Save Preference'}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 20,
    maxHeight: '86%',
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.brightOrange,
  },
  title: {
    color: AppPalette.ink,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: AppPalette.muted,
    lineHeight: 20,
    fontSize: 13.5,
  },
  selectedBox: {
    marginTop: 18,
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCount: {
    color: AppPalette.brightOrange,
    fontWeight: '900',
    fontSize: 22,
  },
  selectedLabel: {
    color: AppPalette.ink,
    fontWeight: '800',
  },
  cityList: { maxHeight: 420 },
  cityListContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 10 },
  cityPill: {
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cityPillSelected: {
    backgroundColor: AppPalette.brightOrange,
    borderColor: AppPalette.brightOrange,
  },
  cityText: { color: AppPalette.ink, fontWeight: '800' },
  cityTextSelected: { color: '#fff' },
  emptyText: { textAlign: 'center', color: AppPalette.muted, paddingVertical: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  button: { flex: 1, paddingVertical: 15, borderRadius: 18, alignItems: 'center' },
  primaryButton: { backgroundColor: AppPalette.brightOrange },
  disabledButton: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  secondaryButton: { backgroundColor: '#F3F4F6' },
  secondaryButtonText: { color: AppPalette.ink, fontWeight: '900' },
});

export default CityPreferenceModal;
