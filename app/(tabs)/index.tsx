import { View, FlatList, StyleSheet, RefreshControl, Text, Pressable, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import NewsCard from '@/components/NewsCard';
import AdCard from '@/components/AdCard';
import EmbedCard from '@/components/EmbedCard';
import CategoryFilter from '@/components/CategoryFilter';
import CityPreferenceModal from '@/components/CityPreferenceModal';
import OnboardingSlider, { hasCompletedOnboarding } from '@/components/OnboardingSlider';
import AppGuideOverlay, { hasCompletedAppGuide } from '@/components/AppGuideOverlay';
import { useAppStore } from '@/store';
import { Ad, NewsItem, EmbedItem, api } from '@/api';
import { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '@/utils/storage';
import { getMediaUrl } from '@/utils/media';

const CITY_PREFERENCE_SETUP_KEY = 'city_preference_setup_done';

type FeedItem =
  | { type: 'news'; data: NewsItem }
  | { type: 'ad'; data: Ad; key: string }
  | { type: 'embed'; data: EmbedItem; key: string }
  | { type: 'section'; title: string; key: string };

const hasRenderableNews = (item: NewsItem) => {
  if (item.isActive === false) return false;
  const hasText = !!item.title?.trim() || !!item.description?.trim() || !!item.content?.trim();
  const hasMedia = (item.media || []).some((media) => !!media?.url);
  return hasText || hasMedia;
};

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    newsId?: string | string[];
    newsSource?: string | string[];
  }>();

  const incomingNewsId = Array.isArray(params.newsId)
    ? params.newsId[0]
    : params.newsId;

  const incomingNewsSource = Array.isArray(params.newsSource)
    ? params.newsSource[0]
    : params.newsSource;
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
  };

  const [showCityModal, setShowCityModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAppGuide, setShowAppGuide] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [notificationNews, setNotificationNews] = useState<NewsItem | null>(null);
  const [isLoadingNotificationNews, setIsLoadingNotificationNews] = useState(false);
  const [notificationNewsError, setNotificationNewsError] = useState<string | null>(null);
  const [openedNewsId, setOpenedNewsId] = useState<string | null>(null);
  const [openedNewsSource, setOpenedNewsSource] = useState<
    'share' | 'notification' | null
  >(null);
  const newsListRef = useRef<FlatList<FeedItem>>(null);
  const refreshInProgressRef = useRef(false);
  const skipNextCityPreferenceFetchRef = useRef(false);

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
    if (refreshInProgressRef.current) return;

    refreshInProgressRef.current = true;
    setIsRefreshingAll(true);

    try {
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
        loadLikedNews(),
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

      viewedNewsIdsRef.current.clear();
      setPreferencesLoaded(true);
    } finally {
      refreshInProgressRef.current = false;
      setIsRefreshingAll(false);
    }
  }, [
    fetchAdvertisements,
    fetchCategories,
    fetchCities,
    fetchEmbeds,
    fetchNews,
    fetchSettings,
    loadCityPreferences,
    loadLikedNews,
    loadSavedNews,
    selectedCategory,
  ]);

  

  const handleLogoPress = useCallback(() => {
    newsListRef.current?.scrollToOffset({
      offset: 0,
      animated: true,
    });

    loadData();
  }, [loadData]);

  const closeNotificationNews = useCallback(() => {
    setNotificationNews(null);
    setNotificationNewsError(null);
    setOpenedNewsId(null);
    setOpenedNewsSource(null);

    router.setParams({
      newsId: undefined,
      newsSource: undefined,
    });
  }, []);

  const changeCategoryBySwipe = useCallback((direction: 'next' | 'previous') => {
    // Include the unfiltered feed so users can swipe back to it from the first category.
    const categoryIds = [null, ...categories.map((category) => category._id)];
    const currentIndex = categoryIds.indexOf(selectedCategory);
    const nextIndex = currentIndex + (direction === 'next' ? 1 : -1);

    if (nextIndex < 0 || nextIndex >= categoryIds.length) return;

    setSelectedCategory(categoryIds[nextIndex]);
    if (openedNewsId) {
      closeNotificationNews();
    }
    newsListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [categories, selectedCategory, setSelectedCategory, openedNewsId, closeNotificationNews]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (openedNewsId) {
      closeNotificationNews();
    }
    newsListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [setSelectedCategory, openedNewsId, closeNotificationNews]);

  const selectedPreferenceCities = cities.filter((city) =>
    selectedCityPreferences.includes(city._id),
  );

  const handleRemovePreferredCity = useCallback(
    async (cityId: string) => {
      const nextCityIds = selectedCityPreferences.filter((id) => id !== cityId);

      // saveCityPreferences updates the persisted preference and store state.
      // We also fetch immediately so the feed changes as soon as the pill is removed.
      skipNextCityPreferenceFetchRef.current = true;
      await saveCityPreferences(nextCityIds);
      await fetchNews({
        category: selectedCategory || undefined,
        cityIds: nextCityIds,
      });

      viewedNewsIdsRef.current.clear();
      newsListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    [selectedCityPreferences, saveCityPreferences, fetchNews, selectedCategory],
  );

  const categorySwipeGesture = Gesture.Pan()
    // Let the news feed keep handling normal vertical scrolling.
    .activeOffsetX([-24, 24])
    .failOffsetY([-24, 24])
    .onEnd((event) => {
      const isSwipeLeft = event.translationX < -60 || event.velocityX < -650;
      const isSwipeRight = event.translationX > 60 || event.velocityX > 650;

      if (isSwipeLeft) {
        changeCategoryBySwipe('next');
      } else if (isSwipeRight) {
        changeCategoryBySwipe('previous');
      }
    })
    .runOnJS(true);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!preferencesLoaded) return;

    // Removing a city pill already triggers an immediate request above.
    // Skip the matching store-change request once to avoid duplicate API calls.
    if (skipNextCityPreferenceFetchRef.current) {
      skipNextCityPreferenceFetchRef.current = false;
      return;
    }

    fetchNews({
      category: selectedCategory || undefined,
      cityIds: selectedCityPreferences,
    });
  }, [selectedCategory, selectedCityPreferences, preferencesLoaded, fetchNews]);


  useEffect(() => {
    if (!incomingNewsId) return;

    setOpenedNewsId(incomingNewsId);
    setOpenedNewsSource(
      incomingNewsSource === 'notification' ? 'notification' : 'share',
    );
  }, [incomingNewsId, incomingNewsSource]);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationNews = async () => {
      if (!openedNewsId) {
        setIsLoadingNotificationNews(false);
        setNotificationNewsError(null);
        return;
      }

      setIsLoadingNotificationNews(true);
      setNotificationNewsError(null);

      try {
        const selectedNews = await api.getNewsById(openedNewsId);
        if (!cancelled) {
          setNotificationNews(selectedNews);
          viewedNewsIdsRef.current.delete(selectedNews._id);

          // Keep Home mounted. Only clear the query params after the selected
          // news has loaded successfully, so app restart returns to normal Home.
          router.setParams({
            newsId: undefined,
            newsSource: undefined,
          });
        }
      } catch (notificationError) {
        console.error('Fetch notification news error:', notificationError);
        if (!cancelled) {
          setNotificationNews(null);
          setNotificationNewsError('This news could not be opened. It may have been removed.');
        }
      } finally {
        if (!cancelled) setIsLoadingNotificationNews(false);
      }
    };

    loadNotificationNews();

    return () => {
      cancelled = true;
    };
  }, [openedNewsId]);
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

  const regularFeedItems = notificationNews
    ? feedItems.filter(
        (feedItem) =>
          feedItem.type !== 'news' || feedItem.data._id !== notificationNews._id,
      )
    : feedItems;

  const displayedFeedItems: FeedItem[] = notificationNews
    ? [
        { type: 'news', data: notificationNews },
        { type: 'section', title: 'All News', key: 'all-news-section' },
        ...regularFeedItems,
      ]
    : regularFeedItems;

  const renderItem = ({ item, index }: { item: FeedItem; index: number }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.allNewsSection}>
          <View style={styles.allNewsLine} />
          <Text style={[styles.allNewsTitle, { color: themeStyles.text }]}>
            {item.title}
          </Text>
          <View style={styles.allNewsLine} />
        </View>
      );
    }
    if (item.type === 'ad') return <AdCard item={item.data} />;
    if (item.type === 'embed') return <EmbedCard item={item.data} />;
    return (
      <NewsCard
        item={item.data}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.bg }]}>
      <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
        <View style={[styles.hero, { backgroundColor: themeStyles.bg }]}>
          <View style={styles.heroTopRow}>
            <Pressable
              style={({ pressed }) => [
                styles.logoBox,
                pressed && styles.logoPressed,
              ]}
              onPress={handleLogoPress}
              disabled={isRefreshingAll}
              accessibilityRole="button"
              accessibilityLabel="Refresh all app data"
              accessibilityHint="Reloads news, categories, advertisements, embeds, cities and settings"
              hitSlop={6}
            >
              <View style={styles.logoImageWrap}>
                <ExpoImage
                  source={
                    settings?.appLogo
                      ? { uri: getMediaUrl(settings.appLogo) }
                      : require('../../assets/images/logo.png')
                  }
                  style={styles.logo}
                  contentFit="contain"
                  contentPosition="left center"
                  transition={200}
                />
              </View>
            </Pressable>

            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerIconButton}
                onPress={() => setShowAppGuide(true)}
                hitSlop={12}
              >
                <Ionicons name="help-circle-outline" size={25} color={AppPalette.brightOrange} />
              </Pressable>

              <Pressable
                style={styles.headerIconButton}
                onPress={() => setShowCityModal(true)}
                hitSlop={12}
              >
                <Ionicons name="location-outline" size={25} color={AppPalette.brightOrange} />
              </Pressable>
            </View>
          </View>
        </View>

        {selectedPreferenceCities.length > 0 && (
          <View style={styles.selectedCitiesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedCitiesContent}
            >
              {selectedPreferenceCities.map((city) => (
                <View
                  key={city._id}
                  style={[
                    styles.selectedCityPill,
                    {
                      backgroundColor: themeStyles.card,
                      borderColor: themeStyles.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="location"
                    size={13}
                    color={AppPalette.brightOrange}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.selectedCityPillText, { color: themeStyles.text }]}
                  >
                    {city.name}
                  </Text>
                  <Pressable
                    onPress={() => handleRemovePreferredCity(city._id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${city.name} city preference`}
                    style={styles.selectedCityRemove}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={AppPalette.brightOrange}
                    />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.filterWrapper}>
          <CategoryFilter
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </View>

        {!!openedNewsId && (
          <View style={[styles.notificationNewsBar, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
            <View style={styles.notificationNewsBarTextWrap}>
              <Ionicons name="notifications" size={17} color={AppPalette.brightOrange} />
              <Text style={[styles.notificationNewsBarText, { color: themeStyles.text }]} numberOfLines={1}>
                {openedNewsSource === 'notification'
                  ? 'News opened from notification'
                  : 'News opened from shared link'}
              </Text>
            </View>
            <Pressable onPress={closeNotificationNews} hitSlop={8} style={styles.showAllButton}>
              <Text style={styles.showAllButtonText}>Show all</Text>
            </Pressable>
          </View>
        )}

        <GestureDetector gesture={categorySwipeGesture}>
          <View style={styles.feedGestureArea}>
            {isLoadingNotificationNews ? (
              <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>Opening selected news...</Text>
            ) : notificationNewsError ? (
              <View style={styles.notificationErrorWrap}>
                <Text style={styles.errorText}>{notificationNewsError}</Text>
                <Pressable style={styles.backToFeedButton} onPress={closeNotificationNews}>
                  <Text style={styles.backToFeedButtonText}>Back to all news</Text>
                </Pressable>
              </View>
            ) : isLoading && news.length === 0 ? (
              <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>Loading fresh stories...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <FlatList
                ref={newsListRef}
                data={displayedFeedItems}
                renderItem={renderItem}
                keyExtractor={(item) =>
                  item.type === 'news' ? `news-${item.data._id}` : item.key
                }
                contentContainerStyle={styles.listContainer}
                style={styles.newsList}
                scrollIndicatorInsets={{ bottom: 96 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.stateText}>No news found for selected filters.</Text>}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                refreshControl={<RefreshControl refreshing={isRefreshingAll} onRefresh={loadData} tintColor={AppPalette.brightOrange} />}
              />
            )}
          </View>
        </GestureDetector>

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

        <AppGuideOverlay visible={showAppGuide} onFinish={() => setShowAppGuide(false)} />
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
  logoBox: {
    flex: 1,
    height: 56,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },

  logoPressed: {
    opacity: 0.65,
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
  headerIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
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
  selectedCitiesSection: {
    minHeight: 42,
    paddingTop: 3,
    paddingBottom: 5,
  },
  selectedCitiesContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  selectedCityPill: {
    maxWidth: 190,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 10,
    paddingRight: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  selectedCityPillText: {
    maxWidth: 125,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedCityRemove: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterWrapper: { height: 42 },
  feedGestureArea: { flex: 1 },
  newsList: { flex: 1 },
  listContainer: { padding: 16, paddingTop: 6, paddingBottom: 120 },
  allNewsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  allNewsLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FECACA',
  },
  allNewsTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  notificationNewsBar: {
    minHeight: 42,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  notificationNewsBarTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationNewsBarText: { flex: 1, fontSize: 12, fontWeight: '800' },
  showAllButton: { paddingVertical: 8, paddingLeft: 8 },
  showAllButtonText: { color: AppPalette.brightOrange, fontSize: 12, fontWeight: '900' },
  notificationErrorWrap: { alignItems: 'center', paddingHorizontal: 20 },
  backToFeedButton: {
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: AppPalette.brightOrange,
  },
  backToFeedButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  stateText: { textAlign: 'center', marginTop: 50, color: AppPalette.slate, fontWeight: '800' },
  errorText: { textAlign: 'center', marginTop: 50, color: AppPalette.danger, fontWeight: '800' },
});
