import { View, TextInput, FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import NewsCard from '@/components/NewsCard';
import { useAppStore } from '@/store';
import { NewsItem } from '@/api';
import { AppPalette } from '@/constants/theme';

export default function SearchScreen() {
  const { news, setSearchQuery, searchQuery, fetchNews, isLoading } = useAppStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    if (localQuery) fetchNews({ search: localQuery });
  }, [localQuery, fetchNews]);

  const handleSearch = useCallback((text: string) => {
    setLocalQuery(text);
    setSearchQuery(text);
  }, [setSearchQuery]);

  const renderItem = ({ item }: { item: NewsItem }) => <NewsCard item={item} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Search stories</Text>
        <Text style={styles.subtitle}>Find latest updates by title, city, reporter or keyword.</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={AppPalette.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search news..."
            placeholderTextColor="#98A2B3"
            value={localQuery}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>

        {localQuery ? (
          isLoading ? (
            <Text style={styles.stateText}>Searching...</Text>
          ) : news.length > 0 ? (
            <FlatList data={news} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
          ) : (
            <Text style={styles.stateText}>No results found</Text>
          )
        ) : (
          <Text style={styles.stateText}>Start typing to search...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFF6FF' },
  container: { flex: 1, backgroundColor: '#EFF6FF', paddingTop: 12 },
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
