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
    text: isDark ? '#F8FAFC' : '#111111',
    border: isDark ? '#334155' : '#FECACA',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    selectedBoxBg: isDark ? '#111111' : '#FFF5F5',
    searchBoxBg: isDark ? '#111111' : '#F8FAFC',
    cityRowBg: isDark ? '#111111' : '#F8FAFC',
    cityRowBorder: isDark ? '#334155' : '#FEE2E2',
    cityRowSelectedBg: isDark ? '#3F0A0A' : '#FEF2F2',
    checkboxBg: isDark ? '#1E293B' : '#FFFFFF',
    checkboxBorder: isDark ? '#475569' : '#FCA5A5',
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.brightOrange,
  },
  title: {
    color: AppPalette.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 0,
  },
  subtitle: {
    color: AppPalette.muted,
    lineHeight: 20,
    fontSize: 13.5,
  },
  selectedBox: {
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FECACA',
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
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    gap: 7,
    marginBottom: 7,
  },
  searchInput: {
    flex: 1,
    color: AppPalette.ink,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 0,
  },
  cityList: { maxHeight: 520 },
  cityListContent: { gap: 5, paddingBottom: 8 },
  cityRow: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityRowSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: AppPalette.brightOrange,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: AppPalette.brightOrange,
    borderColor: AppPalette.brightOrange,
  },
  cityName: { color: AppPalette.ink, fontWeight: '900', fontSize: 13.2 },
  cityState: { marginTop: 0, color: AppPalette.muted, fontWeight: '700', fontSize: 11.3 },
  emptyText: { textAlign: 'center', color: AppPalette.muted, paddingVertical: 18 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 10 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 15, alignItems: 'center' },
  primaryButton: { backgroundColor: AppPalette.brightOrange },
  disabledButton: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  secondaryButton: { backgroundColor: '#F3F4F6' },
  secondaryButtonText: { color: AppPalette.ink, fontWeight: '900' },
});

export default CityPreferenceModal;
