import { create } from 'zustand';
import { NewsItem, Category, City, Ad, api } from '@/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateGuestId } from '@/utils/notifications';

const SAVED_NEWS_KEY = 'saved_news';
const CITY_PREFERENCES_KEY = 'city_preferences';

interface AppState {
  news: NewsItem[];
  advertisements: Ad[];
  categories: Category[];
  cities: City[];
  selectedCityPreferences: string[];
  savedNews: string[];
  selectedCategory: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  fetchNews: (params?: { category?: string; search?: string; cityIds?: string[] }) => Promise<void>;
  fetchAdvertisements: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCities: () => Promise<void>;
  loadCityPreferences: () => Promise<string[]>;
  saveCityPreferences: (cityIds: string[]) => Promise<void>;
  toggleSavedNews: (newsId: string) => Promise<void>;
  trackNewsView: (newsId: string) => Promise<void>;
  trackNewsShare: (newsId: string) => Promise<void>;
  loadSavedNews: () => Promise<void>;
  setSelectedCategory: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  news: [],
  advertisements: [],
  categories: [],
  cities: [],
  selectedCityPreferences: [],
  savedNews: [],
  selectedCategory: null,
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchNews: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const cityIds = params?.cityIds ?? get().selectedCityPreferences;
      const news = await api.getNews({ ...params, cityIds });
      set({ news, isLoading: false });
    } catch (err) {
      console.error('Fetch news error:', err);
      set({ error: 'Failed to load news', isLoading: false });
    }
  },

  fetchAdvertisements: async () => {
    try {
      const advertisements = await api.getAdvertisements();
      set({ advertisements });
    } catch (err) {
      console.error('Fetch advertisements error:', err);
      set({ advertisements: [] });
    }
  },

  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null });
      const categories = await api.getCategories();
      set({ categories, isLoading: false });
    } catch (err) {
      console.error('Fetch categories error:', err);
      set({ error: 'Failed to load categories', isLoading: false });
    }
  },

  fetchCities: async () => {
    try {
      const cities = await api.getCities();
      set({ cities });
    } catch (err) {
      console.error('Fetch cities error:', err);
      set({ error: 'Failed to load cities' });
    }
  },

  loadCityPreferences: async () => {
    try {
      const saved = await AsyncStorage.getItem(CITY_PREFERENCES_KEY);
      const cityIds = saved ? JSON.parse(saved) : [];
      const normalized = Array.isArray(cityIds) ? cityIds : [];
      set({ selectedCityPreferences: normalized });
      return normalized;
    } catch (err) {
      console.error('Load city preferences error:', err);
      return [];
    }
  },

  saveCityPreferences: async (cityIds) => {
    const uniqueCityIds = [...new Set(cityIds.filter(Boolean))];
    set({ selectedCityPreferences: uniqueCityIds });
    await AsyncStorage.setItem(CITY_PREFERENCES_KEY, JSON.stringify(uniqueCityIds));

    try {
      const guestId = await getOrCreateGuestId();
      await api.updateGuestCityPreferences(guestId, uniqueCityIds);
    } catch (err) {
      console.log('Guest city preference sync skipped until guest registration exists:', err);
    }

    await get().fetchNews({
      category: get().selectedCategory || undefined,
      search: get().searchQuery || undefined,
      cityIds: uniqueCityIds,
    });
  },

  loadSavedNews: async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_NEWS_KEY);
      if (saved) {
        set({ savedNews: JSON.parse(saved) });
      }
    } catch (err) {
      console.error('Load saved news error:', err);
    }
  },

  toggleSavedNews: async (newsId) => {
    const wasSaved = get().savedNews.includes(newsId);
    const newSavedNews = wasSaved
      ? get().savedNews.filter((id) => id !== newsId)
      : [...get().savedNews, newsId];

    set({ savedNews: newSavedNews });

    try {
      await AsyncStorage.setItem(SAVED_NEWS_KEY, JSON.stringify(newSavedNews));
    } catch (err) {
      console.error('Save news error:', err);
    }

    try {
      const guestId = await getOrCreateGuestId();
      const result = await api.trackNewsInteraction(newsId, {
        guestId,
        action: wasSaved ? 'unsave' : 'save',
        metadata: { cityPreferences: get().selectedCityPreferences },
      });
      set({
        news: get().news.map((item) =>
          item._id === newsId
            ? { ...item, saveCount: result.saveCount, shareCount: result.shareCount, viewCount: result.viewCount }
            : item
        ),
      });
    } catch (err) {
      console.log('News save tracking skipped:', err);
    }
  },

  trackNewsView: async (newsId) => {
    try {
      const guestId = await getOrCreateGuestId();
      const result = await api.trackNewsInteraction(newsId, {
        guestId,
        action: 'view',
        metadata: { cityPreferences: get().selectedCityPreferences },
      });
      if (result.changed) {
        set({
          news: get().news.map((item) =>
            item._id === newsId
              ? { ...item, viewCount: result.viewCount, saveCount: result.saveCount, shareCount: result.shareCount }
              : item
          ),
        });
      }
    } catch (err) {
      console.log('News view tracking skipped:', err);
    }
  },

  trackNewsShare: async (newsId) => {
    try {
      const guestId = await getOrCreateGuestId();
      const result = await api.trackNewsInteraction(newsId, {
        guestId,
        action: 'share',
        metadata: { cityPreferences: get().selectedCityPreferences },
      });
      set({
        news: get().news.map((item) =>
          item._id === newsId
            ? { ...item, shareCount: result.shareCount, saveCount: result.saveCount, viewCount: result.viewCount }
            : item
        ),
      });
    } catch (err) {
      console.log('News share tracking skipped:', err);
    }
  },

  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () =>
    set({
      selectedCategory: null,
      searchQuery: '',
    }),
}));
