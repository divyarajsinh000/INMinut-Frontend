import { View, FlatList, StyleSheet, RefreshControl, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewsCard from '@/components/NewsCard';
import AdCard from '@/components/AdCard';
import CategoryFilter from '@/components/CategoryFilter';
import CityPreferenceModal from '@/components/CityPreferenceModal';
import OnboardingSlider, { hasCompletedOnboarding } from '@/components/OnboardingSlider';
import { useAppStore } from '@/store';
import { Ad, NewsItem } from '@/api';
import { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const CITY_PREFERENCE_SETUP_KEY = 'city_preference_setup_done';

type FeedItem =
  | { type: 'news'; data: NewsItem }
  | { type: 'ad'; data: Ad; key: string };

const hasRenderableNews = (item: NewsItem) => {
  if (item.isActive === false) return false;
  const hasText = !!item.title?.trim() || !!item.description?.trim() || !!item.content?.trim();
  const hasMedia = (item.media || []).some((media) => !!media?.url);
  return hasText || hasMedia;
};

export default function HomeScreen() {
  const {
    news,
    categories,
    advertisements,
    cities,
    selectedCityPreferences,
    selectedCategory,
    fetchNews,
    fetchCategories,
    fetchAdvertisements,
    fetchCities,
    loadCityPreferences,
    saveCityPreferences,
    loadSavedNews,
    trackNewsView,
    setSelectedCategory,
    isLoading,
    error,
  } = useAppStore();

  const [showCityModal, setShowCityModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const viewedNewsIdsRef = useRef<Set<string>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item: FeedItem; isViewable: boolean }> }) => {
    viewableItems.forEach(({ item, isViewable }) => {
      if (!isViewable || item.type !== 'news') return;
      const newsId = item.data._id;
      if (viewedNewsIdsRef.current.has(newsId)) return;
      viewedNewsIdsRef.current.add(newsId);
      trackNewsView(newsId);
    });
  }).current;

  const loadData = useCallback(async () => {
    const [savedCityIds, onboardingDone, cityPreferenceSetupDone] = await Promise.all([
      loadCityPreferences(),
      hasCompletedOnboarding(),
      AsyncStorage.getItem(CITY_PREFERENCE_SETUP_KEY),
    ]);

    await Promise.all([fetchCategories(), fetchAdvertisements(), fetchCities(), loadSavedNews()]);

    if (!onboardingDone) {
      setShowOnboarding(true);
    } else if (!cityPreferenceSetupDone) {
      setShowCityModal(true);
    }

    await fetchNews({
      category: selectedCategory || undefined,
      cityIds: savedCityIds,
    });
    setPreferencesLoaded(true);
  }, [fetchCategories, fetchAdvertisements, fetchCities, fetchNews, selectedCategory, loadCityPreferences, loadSavedNews]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    fetchNews({
      category: selectedCategory || undefined,
      cityIds: selectedCityPreferences,
    });
  }, [selectedCategory, selectedCityPreferences, preferencesLoaded, fetchNews]);

  const feedItems: FeedItem[] = [];
  news.filter(hasRenderableNews).forEach((item, index) => {
    feedItems.push({ type: 'news', data: item });
    advertisements.forEach((ad) => {
      const position = Number(ad.positionAfterNews || 4);
      if (ad.isEnabled && index + 1 === position) {
        feedItems.push({ type: 'ad', data: ad, key: `${ad._id}-${index}` });
      }
    });
  });

  const selectedCityLabel = selectedCityPreferences.length === 0
    ? 'All cities'
    : cities
        .filter((city) => selectedCityPreferences.includes(city._id))
        .map((city) => city.name)
        .slice(0, 2)
        .join(', ') || 'Cities';

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'ad') return <AdCard item={item.data} />;
    return <NewsCard item={item.data} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.eyebrow}>Good to see you</Text>
              <Text style={styles.heroTitle}>Latest local news</Text>
            </View>
            <Pressable style={styles.cityButton} onPress={() => setShowCityModal(true)}>
              <Ionicons name="location-outline" size={17} color={AppPalette.brightOrange} />
              <Text style={styles.cityButtonText} numberOfLines={1}>{selectedCityLabel}</Text>
              <Ionicons name="chevron-down" size={15} color={AppPalette.muted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.filterWrapper}>
          <CategoryFilter categories={categories} selectedCategoryId={selectedCategory} onSelectCategory={setSelectedCategory} />
        </View>

        {isLoading && news.length === 0 ? (
          <Text style={styles.stateText}>Loading fresh stories...</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            data={feedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.type === 'news' ? item.data._id : item.key}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.stateText}>No news found for selected filters.</Text>}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={AppPalette.brightOrange} />}
          />
        )}

        <OnboardingSlider
          visible={showOnboarding}
          onDone={() => {
            setShowOnboarding(false);
            AsyncStorage.getItem(CITY_PREFERENCE_SETUP_KEY).then((done) => {
              if (!done) setShowCityModal(true);
            });
          }}
        />

        <CityPreferenceModal
          visible={showCityModal}
          cities={cities}
          selectedCityIds={selectedCityPreferences}
          required={false}
          onClose={async () => {
            await AsyncStorage.setItem(CITY_PREFERENCE_SETUP_KEY, 'true');
            setShowCityModal(false);
          }}
          onSave={async (cityIds) => {
            await AsyncStorage.setItem(CITY_PREFERENCE_SETUP_KEY, 'true');
            await saveCityPreferences(cityIds);
            setShowCityModal(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFF6FF' },
  container: { flex: 1, backgroundColor: '#EFF6FF' },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#EFF6FF',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextWrap: { flex: 1 },
  cityButton: {
    maxWidth: 148,
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cityButtonText: {
    flex: 1,
    color: AppPalette.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: AppPalette.brightOrange,
    marginBottom: 3,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: AppPalette.ink,
    letterSpacing: -0.6,
  },
  filterWrapper: { height: 64 },
  listContainer: { padding: 16, paddingTop: 6, paddingBottom: 26 },
  stateText: { textAlign: 'center', marginTop: 50, color: AppPalette.slate, fontWeight: '800' },
  errorText: { textAlign: 'center', marginTop: 50, color: AppPalette.danger, fontWeight: '800' },
});
