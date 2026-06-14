import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { City } from '@/api';
import { AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const [searchText, setSearchText] = useState('');

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeStyles = {
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    border: isDark ? '#334155' : '#BAE6FD',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    selectedBoxBg: isDark ? '#0F172A' : '#EFF6FF',
    searchBoxBg: isDark ? '#0F172A' : '#F8FAFC',
    cityRowBg: isDark ? '#0F172A' : '#F8FAFC',
    cityRowBorder: isDark ? '#334155' : '#E0F2FE',
    cityRowSelectedBg: isDark ? '#2D1B00' : '#FFF7ED',
    checkboxBg: isDark ? '#1E293B' : '#FFFFFF',
    checkboxBorder: isDark ? '#475569' : '#FDBA74',
    secondaryBtnBg: isDark ? '#334155' : '#F3F4F6',
  };

  useEffect(() => {
    if (visible) {
      setLocalSelected(selectedCityIds || []);
      setSearchText('');
    }
  }, [selectedCityIds, visible]);

  const groupedCities = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return [...cities]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((city) => {
        if (!query) return true;
        const cityName = city.name?.toLowerCase() || '';
        const stateName = city.state?.name?.toLowerCase() || '';
        return cityName.includes(query) || stateName.includes(query);
      });
  }, [cities, searchText]);

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
        <View style={[styles.sheet, { backgroundColor: themeStyles.card }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="location-outline" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.title, { color: themeStyles.text }]}>Choose your cities</ThemedText>
            </View>
          </View>

          <View style={[styles.selectedBox, { backgroundColor: themeStyles.selectedBoxBg, borderColor: themeStyles.border }]}>
            <View style={[styles.selectedIconWrap, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
              <Ionicons name="business-outline" size={18} color={AppPalette.brightOrange} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.selectedLabel, { color: themeStyles.text }]}>
                {localSelected.length === 0 ? 'Showing news from every city' : `${localSelected.length} ${localSelected.length === 1 ? 'city' : 'cities'} selected`}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.searchBox, { backgroundColor: themeStyles.searchBoxBg, borderColor: themeStyles.border }]}>
            <Ionicons name="search-outline" size={18} color={themeStyles.textSecondary} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search city or state"
              placeholderTextColor={themeStyles.textSecondary}
              style={[styles.searchInput, { color: themeStyles.text }]}
            />
            {!!searchText && (
              <Pressable onPress={() => setSearchText('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={themeStyles.textSecondary} />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.cityList} contentContainerStyle={styles.cityListContent} showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={() => setLocalSelected([])}
              style={[
                styles.cityRow,
                { backgroundColor: themeStyles.cityRowBg, borderColor: themeStyles.cityRowBorder },
                localSelected.length === 0 && [styles.cityRowSelected, { backgroundColor: themeStyles.cityRowSelectedBg }]
              ]}
            >
              <View style={[styles.checkbox, { backgroundColor: themeStyles.checkboxBg, borderColor: themeStyles.checkboxBorder }, localSelected.length === 0 && styles.checkboxSelected]}>
                <Ionicons
                  name={localSelected.length === 0 ? 'checkmark' : 'globe-outline'}
                  size={15}
                  color={localSelected.length === 0 ? '#fff' : AppPalette.brightOrange}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.cityName, { color: themeStyles.text }]}>All cities</ThemedText>
              </View>
            </Pressable>

            {groupedCities.map((city) => {
              const selected = localSelected.includes(city._id);
              return (
                <Pressable
                  key={city._id}
                  onPress={() => toggleCity(city._id)}
                  style={[
                    styles.cityRow,
                    { backgroundColor: themeStyles.cityRowBg, borderColor: themeStyles.cityRowBorder },
                    selected && [styles.cityRowSelected, { backgroundColor: themeStyles.cityRowSelectedBg }]
                  ]}
                >
                  <View style={[styles.checkbox, { backgroundColor: themeStyles.checkboxBg, borderColor: themeStyles.checkboxBorder }, selected && styles.checkboxSelected]}>
                    <Ionicons
                      name={selected ? 'checkmark' : 'ellipse-outline'}
                      size={15}
                      color={selected ? '#fff' : AppPalette.brightOrange}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText style={[styles.cityName, { color: themeStyles.text }]} numberOfLines={1}>
                      {city.name}  {!!city.state?.name && (
                        <ThemedText style={[styles.cityState, { color: themeStyles.textSecondary }]} numberOfLines={1}>{city.state.name}</ThemedText>
                      )}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {cities.length === 0 && (
            <ThemedText style={[styles.emptyText, { color: themeStyles.textSecondary }]}>No cities available. Add cities from admin panel first.</ThemedText>
          )}

          {cities.length > 0 && groupedCities.length === 0 && (
            <ThemedText style={[styles.emptyText, { color: themeStyles.textSecondary }]}>No city found for this search.</ThemedText>
          )}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.secondaryButton, { backgroundColor: themeStyles.secondaryBtnBg }]} onPress={required ? handleShowAllCities : onClose}>
              <ThemedText style={[styles.secondaryButtonText, { color: themeStyles.text }]}>{required ? 'Skip / Show All' : 'Cancel'}</ThemedText>
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
    padding: 13,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLabel: {
    color: AppPalette.ink,
    fontWeight: '900',
    fontSize: 14,
  },
  selectedHint: {
    marginTop: 2,
    color: AppPalette.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  searchBox: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: AppPalette.ink,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 0,
  },
  cityList: { maxHeight: 390 },
  cityListContent: { gap: 8, paddingBottom: 10 },
  cityRow: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cityRowSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: AppPalette.brightOrange,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDBA74',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: AppPalette.brightOrange,
    borderColor: AppPalette.brightOrange,
  },
  cityName: { color: AppPalette.ink, fontWeight: '900', fontSize: 14 },
  cityState: { marginTop: 2, color: AppPalette.muted, fontWeight: '700', fontSize: 12 },
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
