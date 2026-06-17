import { View, TextInput, FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import NewsCard from '@/components/NewsCard';
import { useAppStore } from '@/store';
import { NewsItem } from '@/api';
import { AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SearchScreen() {
  const { news, setSearchQuery, searchQuery, fetchNews, isLoading } = useAppStore();
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
    if (localQuery) fetchNews({ search: localQuery });
  }, [localQuery, fetchNews]);

  const handleSearch = useCallback((text: string) => {
    setLocalQuery(text);
    setSearchQuery(text);
  }, [setSearchQuery]);

  const renderItem = ({ item }: { item: NewsItem }) => <NewsCard item={item} />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.bg }]}>
      <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
        <Text style={[styles.title, { color: themeStyles.text }]}>Search stories</Text>
        <Text style={[styles.subtitle, { color: themeStyles.textSecondary }]}>Find latest updates by title, city, reporter or keyword.</Text>
        <View style={[styles.searchContainer, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
          <Ionicons name="search" size={20} color={themeStyles.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: themeStyles.text }]}
            placeholder="Search news..."
            placeholderTextColor={isDark ? '#64748B' : '#98A2B3'}
            value={localQuery}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>

        {localQuery ? (
          isLoading ? (
            <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>Searching...</Text>
          ) : news.length > 0 ? (
            <FlatList data={news} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
          ) : (
            <Text style={[styles.stateText, { color: themeStyles.textSecondary }]}>No results found</Text>
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
