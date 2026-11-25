import { View, TextInput, FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import NewsCard from '@/components/NewsCard';
import EmbedCard from '@/components/EmbedCard';
import { useAppStore } from '@/store';
import { NewsItem, EmbedItem, api } from '@/api';
import { AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SearchResultItem =
  | { type: 'news'; data: NewsItem; key: string }
  | { type: 'embed'; data: EmbedItem; key: string };

export default function SearchScreen() {
  const { setSearchQuery, searchQuery } = useAppStore();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [embeds, setEmbeds] = useState<EmbedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const cityIds = useAppStore(s => s.selectedCityPreferences);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeStyles = {
    bg: isDark ? '#111111' : '#FFF5F5',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#111111',
    border: isDark ? '#334155' : '#FECACA',
    textSecondary: isDark ? '#94A3B8' : '#475569',
  };

  useEffect(() => {
    let cancelled = false;
    const q = localQuery.trim();
    setNews([]); setEmbeds([]); setSearchError(false); setIsLoading(!!q);
    if (!q) return;
    const timer = setTimeout(async () => {
      const results = await Promise.allSettled([api.getNews({ search: q, cityIds }), api.getEmbeds({ search: q })]);
      if (cancelled) return;
      setNews(results[0].status === 'fulfilled' ? results[0].value : []);
      setEmbeds(results[1].status === 'fulfilled' ? results[1].value : []);
      setSearchError(results.every(result => result.status === 'rejected'));
      setIsLoading(false);
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [localQuery, cityIds]);

  const handleSearch = useCallback((text: string) => {
    setLocalQuery(text);
    setSearchQuery(text);
  }, [setSearchQuery]);

  const matchingEmbeds = embeds.filter((emb) => {
    if (emb.isEnabled !== true) return false;
    if (!localQuery.trim()) return false;
    return emb.title?.toLowerCase().includes(localQuery.trim().toLowerCase());
  });

  const searchResults: SearchResultItem[] = [
    ...news.map((item) => ({ type: 'news' as const, data: item, key: `news-${item._id}` })),
    ...matchingEmbeds.map((emb) => ({ type: 'embed' as const, data: emb, key: `embed-${emb._id}` })),
  ];

  const renderItem = ({ item }: { item: SearchResultItem }) => {
    if (item.type === 'embed') return <EmbedCard item={item.data} />;
    return <NewsCard item={item.data} />;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.bg }]}>
      <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
        <Text style={[styles.title, { color: themeStyles.text }]}>Search stories & content</Text>
        <Text style={[styles.subtitle, { color: themeStyles.textSecondary }]}>Find news and embeds by title, city, reporter or keyword.</Text>
        <View style={[styles.searchContainer, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
          <Ionicons name="search" size={20} color={themeStyles.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: themeStyles.text }]}
            placeholder="Search news & embed title..."
            placeholderTextColor={isDark ? '#64748B' : '#98A2B3'}
            value={localQuery}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>

        {localQuery.trim() ? (
          isLoading ? (
            <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>Searching...</Text>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>{searchError ? 'Unable to search right now. Please try again.' : 'No results found'}</Text>
          )
        ) : (
          <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>Start typing to search...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF5F5' },
  container: { flex: 1, backgroundColor: '#FFF5F5', paddingTop: 12 },
  title: { fontSize: 28, fontWeight: '900', color: AppPalette.ink, paddingHorizontal: 18 },
  subtitle: { fontSize: 14, color: AppPalette.slate, fontWeight: '600', paddingHorizontal: 18, marginTop: 5 },
  searchContainer: {
    margin: 16,
    height: 54,
    borderRadius: 22,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: AppPalette.border,
  },
  searchInput: { flex: 1, color: AppPalette.ink, fontSize: 16, fontWeight: '700' },
  listContainer: { padding: 16, paddingTop: 0, paddingBottom: 26 },
  stateText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: AppPalette.slate, fontWeight: '800' },
});
