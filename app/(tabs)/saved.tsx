import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NewsCard from '@/components/NewsCard';
import { useAppStore } from '@/store';
import { NewsItem } from '@/api';
import { AppPalette } from '@/constants/theme';

export default function SavedScreen() {
  const { news, savedNews } = useAppStore();
  const savedNewsItems = news.filter((item) => savedNews.includes(item._id));

  const renderItem = ({ item }: { item: NewsItem }) => <NewsCard item={item} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Saved news</Text>
        <Text style={styles.subtitle}>Your bookmarked stories are stored here.</Text>
        {savedNewsItems.length > 0 ? (
          <FlatList data={savedNewsItems} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="bookmark-outline" size={44} color={AppPalette.brightOrange} />
            <Text style={styles.emptyTitle}>No saved news yet</Text>
            <Text style={styles.emptyText}>Tap bookmark on any story to save it for later.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFF6FF' },
  container: { flex: 1, backgroundColor: '#EFF6FF', paddingTop: 12 },
  title: { fontSize: 28, fontWeight: '900', color: AppPalette.ink, paddingHorizontal: 18 },
  subtitle: { fontSize: 14, color: AppPalette.slate, fontWeight: '600', paddingHorizontal: 18, marginTop: 5, marginBottom: 8 },
  listContainer: { padding: 16, paddingBottom: 26 },
  emptyCard: {
    margin: 18,
    padding: 28,
    borderRadius: 26,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: AppPalette.border,
    alignItems: 'center',
  },
  emptyTitle: { marginTop: 12, fontSize: 20, fontWeight: '900', color: AppPalette.ink },
  emptyText: { marginTop: 6, color: AppPalette.slate, textAlign: 'center', fontWeight: '600', lineHeight: 20 },
});
