import { View, FlatList, StyleSheet, RefreshControl, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';

import NewsCard from '@/components/NewsCard';
import AdCard from '@/components/AdCard';
import EmbedCard from '@/components/EmbedCard';
import CategoryFilter from '@/components/CategoryFilter';
import CityPreferenceModal from '@/components/CityPreferenceModal';
import OnboardingSlider, { hasCompletedOnboarding } from '@/components/OnboardingSlider';
import AppGuideOverlay, { hasCompletedAppGuide } from '@/components/AppGuideOverlay';
import { useAppStore } from '@/store';
import { Ad, NewsItem, EmbedItem } from '@/api';
import { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '@/utils/storage';
import { getMediaUrl } from '@/utils/media';

const CITY_PREFERENCE_SETUP_KEY = 'city_preference_setup_done';

type FeedItem =
  | { type: 'news'; data: NewsItem }
  | { type: 'ad'; data: Ad; key: string }
  | { type: 'embed'; data: EmbedItem; key: string };

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
    embeds,
    cities,
    selectedCityPreferences,
    selectedCategory,
    fetchNews,
    fetchCategories,
    fetchAdvertisements,
    fetchEmbeds,
    fetchCities,
    fetchSettings,
    loadCityPreferences,
    saveCityPreferences,
    loadSavedNews,
    loadLikedNews,
    trackNewsView,
    setSelectedCategory,
    isLoading,
    error,
    theme,
    settings,
  } = useAppStore();

  const isDark = theme === 'dark';
  const themeStyles = {
    bg: isDark ? '#111111' : '#FFF5F5',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#111111',
    border: isDark ? '#334155' : '#FECACA',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    helpIcon: isDark ? '#FF6B6B' : AppPalette.deepBlue,
  };

  const [showCityModal, setShowCityModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAppGuide, setShowAppGuide] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  const [guideLayouts, setGuideLayouts] = useState<Record<string, any>>({});
  const cityButtonRef = useRef<View>(null);
  const helpButtonRef = useRef<View>(null);
  const categoryRowRef = useRef<View>(null);

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
    const [savedCityIds, onboardingDone, cityPreferenceSetupDone, appGuideDone] = await Promise.all([
      loadCityPreferences(),
      hasCompletedOnboarding(),
      SecureStore.getItemAsync(CITY_PREFERENCE_SETUP_KEY),
      hasCompletedAppGuide(),
    ]);

    await Promise.all([
      fetchCategories(), 
      fetchAdvertisements(), 
      fetchEmbeds(), 
      fetchCities(), 
      fetchSettings(),
      loadSavedNews(),
      loadLikedNews()
    ]);

    if (!onboardingDone) {
      setShowOnboarding(true);
    } else if (!cityPreferenceSetupDone) {
      setShowCityModal(true);
    } else if (!appGuideDone) {
      setShowAppGuide(true);
    }

    await fetchNews({
      category: selectedCategory || undefined,
      cityIds: savedCityIds,
    });
    setPreferencesLoaded(true);
  }, [fetchCategories, fetchAdvertisements, fetchCities, fetchNews, selectedCategory, loadCityPreferences, loadSavedNews, loadLikedNews]);

  
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

  const measureGuideTargets = useCallback(() => {
    cityButtonRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setGuideLayouts(prev => ({ ...prev, cityButton: { x, y, width, height } }));
      }
    });
    helpButtonRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setGuideLayouts(prev => ({ ...prev, helpButton: { x, y, width, height } }));
      }
    });
    categoryRowRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setGuideLayouts(prev => ({ ...prev, categoryRow: { x, y, width, height } }));
      }
    });
  }, []);

  useEffect(() => {
    if (!showAppGuide) return;

    setGuideLayouts({});
    const timers = [250, 650, 1100].map((delay) => setTimeout(measureGuideTargets, delay));
    return () => timers.forEach(clearTimeout);
  }, [showAppGuide, measureGuideTargets, news.length, categories.length]);

  const feedItems: FeedItem[] = [];
  
  // 1. Inject ads/embeds that should appear before any news items (position === 0)
  advertisements.forEach((ad) => {
    const position = ad.positionAfterNews !== undefined ? Number(ad.positionAfterNews) : 4;
    const adCategories = ad.categories?.map(c => typeof c === 'string' ? c : c?._id).filter(Boolean) || [];
    const isTargetingAll = adCategories.length === 0;
    const matchesCategory = selectedCategory 
      ? (isTargetingAll || adCategories.includes(selectedCategory)) 
      : isTargetingAll;

    if (ad.isEnabled && position === 0 && matchesCategory) {
      feedItems.push({ type: 'ad', data: ad, key: `${ad._id}-top` });
    }
  });
  embeds.forEach((emb) => {
    const position = emb.positionAfterNews !== undefined ? Number(emb.positionAfterNews) : 5;
    const embCategories = emb.categories?.map(c => typeof c === 'string' ? c : c?._id).filter(Boolean) || [];
    const isTargetingAll = embCategories.length === 0;
    const matchesCategory = selectedCategory 
      ? (isTargetingAll || embCategories.includes(selectedCategory)) 
      : isTargetingAll;

    if (emb.isEnabled && position === 0 && matchesCategory) {
      feedItems.push({ type: 'embed', data: emb, key: `${emb._id}-top` });
    }
  });

  // 2. Iterate news items and inject subsequent ads/embeds (position > 0)
  news.filter(hasRenderableNews).forEach((item, index) => {
    feedItems.push({ type: 'news', data: item });
    advertisements.forEach((ad) => {
      const position = ad.positionAfterNews !== undefined ? Number(ad.positionAfterNews) : 4;
      const adCategories = ad.categories?.map(c => typeof c === 'string' ? c : c?._id).filter(Boolean) || [];
      const isTargetingAll = adCategories.length === 0;
      const matchesCategory = selectedCategory 
        ? (isTargetingAll || adCategories.includes(selectedCategory)) 
        : isTargetingAll;

      if (ad.isEnabled && position > 0 && index + 1 === position && matchesCategory) {
        feedItems.push({ type: 'ad', data: ad, key: `${ad._id}-${index}` });
      }
    });
    embeds.forEach((emb) => {
      const position = emb.positionAfterNews !== undefined ? Number(emb.positionAfterNews) : 5;
      const embCategories = emb.categories?.map(c => typeof c === 'string' ? c : c?._id).filter(Boolean) || [];
      const isTargetingAll = embCategories.length === 0;
      const matchesCategory = selectedCategory 
        ? (isTargetingAll || embCategories.includes(selectedCategory)) 
        : isTargetingAll;

      if (emb.isEnabled && position > 0 && index + 1 === position && matchesCategory) {
        feedItems.push({ type: 'embed', data: emb, key: `${emb._id}-${index}` });
      }
    });
  });

  const selectedCityCount = selectedCityPreferences.length;
  const selectedCityLabel = selectedCityCount === 0
    ? 'All cities'
    : `${selectedCityCount} ${selectedCityCount === 1 ? 'city' : 'cities'}`;

  const renderItem = ({ item, index }: { item: FeedItem; index: number }) => {
    if (item.type === 'ad') return <AdCard item={item.data} />;
    if (item.type === 'embed') return <EmbedCard item={item.data} />;
    return (
      <NewsCard
        item={item.data}
        onMediaLayout={index === 0 ? (layout) => setGuideLayouts(prev => ({ ...prev, newsMedia: layout })) : undefined}
        onActionsLayout={index === 0 ? (layout) => setGuideLayouts(prev => ({ ...prev, saveShare: layout })) : undefined}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.bg }]}>
      <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
        <View style={[styles.hero, { backgroundColor: themeStyles.bg }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.logoBox}>
              <View style={styles.logoImageWrap}>
                <ExpoImage
                  source={
                    settings?.appLogo 
                      ? { uri: getMediaUrl(settings.appLogo) }
                      : isDark 
                        ? require('../../assets/images/logo-dark.png') 
                        : require('../../assets/images/logo-light.png')
                  }
                  style={styles.logo}
                  contentFit="contain"
                  contentPosition="left center"
                  transition={200}
                />
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable ref={helpButtonRef} style={[styles.helpButton, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={() => setShowAppGuide(true)} hitSlop={8}>
                <Ionicons name="help-circle-outline" size={22} color={themeStyles.helpIcon} />
              </Pressable>

              <Pressable ref={cityButtonRef} style={[styles.cityButton, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={() => setShowCityModal(true)}>
                <Ionicons name="location-outline" size={17} color={AppPalette.brightOrange} />
                <Text style={[styles.cityButtonText, { color: themeStyles.text }]} numberOfLines={1}>{selectedCityLabel}</Text>
                <Ionicons name="chevron-down" size={15} color={themeStyles.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        <View ref={categoryRowRef} style={styles.filterWrapper}>
          <CategoryFilter categories={categories} selectedCategoryId={selectedCategory} onSelectCategory={setSelectedCategory} />
        </View>

        {isLoading && news.length === 0 ? (
          <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>Loading fresh stories...</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            data={feedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.type === 'news' ? item.data._id : item.key}
            contentContainerStyle={styles.listContainer}
            style={styles.newsList}
            scrollIndicatorInsets={{ bottom: 96 }}
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
            SecureStore.getItemAsync(CITY_PREFERENCE_SETUP_KEY).then((done) => {
              if (!done) {
                setShowCityModal(true);
              } else {
                hasCompletedAppGuide().then((guideDone) => {
                  if (!guideDone) setShowAppGuide(true);
                });
              }
            });
          }}
        />

        <CityPreferenceModal
          visible={showCityModal}
          cities={cities}
          selectedCityIds={selectedCityPreferences}
          required={false}
          onClose={async () => {
            await SecureStore.setItemAsync(CITY_PREFERENCE_SETUP_KEY, 'true');
            setShowCityModal(false);
            const guideDone = await hasCompletedAppGuide();
            if (!guideDone) setShowAppGuide(true);
          }}
          onSave={async (cityIds) => {
            await SecureStore.setItemAsync(CITY_PREFERENCE_SETUP_KEY, 'true');
            await saveCityPreferences(cityIds);
            setShowCityModal(false);
            const guideDone = await hasCompletedAppGuide();
            if (!guideDone) setShowAppGuide(true);
          }}
        />

        <AppGuideOverlay visible={showAppGuide} onFinish={() => setShowAppGuide(false)} layouts={guideLayouts} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF5F5' },
  container: { flex: 1, backgroundColor: '#FFF5F5' },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    backgroundColor: '#FFF5F5',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerActions: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  helpButton: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    flex: 1,
    height: 56,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },

  logoImageWrap: {
    flex: 1,
    height: '100%',
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  logoTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  logoTitle: {
    color: '#111111',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  logoSub: {
    marginTop: 1,
    color: AppPalette.slate,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '800',
  },
  cityButton: {
    maxWidth: 118,
    height: 42,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexShrink: 1,
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
  filterWrapper: { height: 42 },
  newsList: { flex: 1 },
  listContainer: { padding: 16, paddingTop: 6, paddingBottom: 120 },
  stateText: { textAlign: 'center', marginTop: 50, color: AppPalette.slate, fontWeight: '800' },
  errorText: { textAlign: 'center', marginTop: 50, color: AppPalette.danger, fontWeight: '800' },
});
