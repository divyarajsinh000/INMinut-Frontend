import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Linking, Platform, Pressable,
  ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import RenderHTML from 'react-native-render-html';
import { api, NewsItem } from '@/api';
import { useAppStore } from '@/store';
import { getImageMedia, getMediaUrl } from '@/utils/media';
import MediaDisplay from '@/components/MediaDisplay';
import FullScreenImageViewer from '@/components/FullScreenImageViewer';
import { shareNewsDirect } from '@/utils/share';

const ORANGE = '#F97316';
const canDisplay = (item: NewsItem) => item.isActive !== false &&
  (!!item.title?.trim() || !!item.description?.trim() || !!item.content?.trim() ||
    (item.media || []).some((media) => !!media?.url));

const normalizeUrl = (value?: string) => {
  const v = value?.trim() || '';
  return v && !/^(https?:\/\/|mailto:|tel:)/i.test(v) ? `https://${v}` : v;
};

// Mount the player only for the current story: off-screen stories must not play.
function ReaderVideo({ uri, height, active }: { uri: string; height: number; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  useEffect(() => {
    if (!active) player.pause();
  }, [active, player]);
  return (
    <View style={[styles.videoWrap, { height }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain"
        nativeControls allowsFullscreen />
    </View>
  );
}

function ReaderStory({ item, height, active }: { item: NewsItem; height: number; active: boolean }) {
  const { width, height: screenHeight } = useWindowDimensions();
  const theme = useAppStore((s) => s.theme);
  const likedNews = useAppStore((s) => s.likedNews);
  const savedNews = useAppStore((s) => s.savedNews);
  const toggleLikedNews = useAppStore((s) => s.toggleLikedNews);
  const toggleSavedNews = useAppStore((s) => s.toggleSavedNews);
  const trackNewsShare = useAppStore((s) => s.trackNewsShare);
  const dark = theme === 'dark';
  const textColor = dark ? '#F8FAFC' : '#101828';
  const mutedColor = dark ? '#CBD5E1' : '#64748B';
  const bg = dark ? '#111827' : '#FFFEFC';
  const articleWidth = Math.min(width, 720) - 40;
  const images = useMemo(() => getImageMedia(item.media || []), [item.media]);
  const videos = (item.media || []).filter((m) => m.type === 'video' && !!m.url);
  const otherMedia = (item.media || []).filter((m) => m.type !== 'image' && m.type !== 'video' && !!m.url);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [whatsappSharing, setWhatsappSharing] = useState(false);
  const titleLink = normalizeUrl(item.titleLink || item.title_link);
  const isLiked = likedNews.includes(item._id);
  const isSaved = savedNews.includes(item._id);
  const maxMediaHeight = Math.max(220, Math.round(screenHeight * 0.59));
  const mediaRatio = images[imageIndex]?.url ? imageRatios[images[imageIndex].url] : undefined;
  const mediaHeight = mediaRatio
    ? Math.min(maxMediaHeight, Math.max(175, Math.round(articleWidth / mediaRatio)))
    : Math.min(maxMediaHeight, Math.round(articleWidth * 0.85));
  const videoHeight = Math.min(maxMediaHeight, Math.max(220, Math.round(articleWidth * 0.73)));
  const storyUrl = `https://inminut.com/news/${item._id}`;

  const openExternal = async (url: string) => {
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else Alert.alert('Unable to open link');
    } catch { Alert.alert('Unable to open link', 'Please try again.'); }
  };

  const onShare = async () => {
    if (sharing || whatsappSharing) return;
    setSharing(true);
    try {
      const shared = await shareNewsDirect({
        title: item.title, description: item.description, content: item.content,
        media: item.media || [], hashtags: item.hashtags || [], cities: item.cities || [],
        publishedDate: item.publishedDate, link: storyUrl,
      });
      if (shared !== false) await trackNewsShare(item._id);
    } catch { Alert.alert('Share failed', 'Unable to share this news right now.'); }
    finally { setSharing(false); }
  };

  const shareWhatsapp = async () => {
    if (sharing || whatsappSharing) return;
    setWhatsappSharing(true);
    try {
      // WhatsApp-specific link share. Unlike Home's branded-image share this does not capture a PNG.
      const message = `${item.title || 'INMinut News'}\n${storyUrl}`;
      if (Platform.OS === 'web') {
        await openExternal(`https://wa.me/?text=${encodeURIComponent(message)}`);
      } else {
        let NativeShare: any;
        try { NativeShare = require('react-native-share').default; } catch { NativeShare = null; }
        if (NativeShare?.shareSingle) {
          await NativeShare.shareSingle({ social: NativeShare.Social.WHATSAPP, message });
        } else {
          await openExternal(`https://wa.me/?text=${encodeURIComponent(message)}`);
        }
      }
      await trackNewsShare(item._id);
    } catch (error: any) {
      if (!/cancel|dismiss/i.test(String(error?.message || error)))
        Alert.alert('WhatsApp share failed', 'Please try again.');
    } finally { setWhatsappSharing(false); }
  };

  return (
    <ScrollView style={[styles.articleScroll, { height, backgroundColor: bg }]}
      contentContainerStyle={{ minHeight: height, paddingBottom: 35 }}
      showsVerticalScrollIndicator={false} nestedScrollEnabled
    >
      <View style={[styles.articleBody, { backgroundColor: bg }]}>
        <View style={styles.metadata}>
          {item.isBreaking && <View style={styles.breakingPill}><Text style={styles.breakingText}>{item.breakingText || 'BREAKING'}</Text></View>}
          {(item.categories?.length ? item.categories : item.category ? [item.category] : []).map((cat, index) => <Text key={cat._id || index} style={styles.category}>{cat.name}</Text>)}
          {!!item.publishedDate && <Text style={[styles.date, { color: mutedColor }]}>
            {new Date(item.publishedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>}
        </View>
        {!!item.cities?.length && <View style={styles.locationRow}><Ionicons name="location-outline" size={15} color={ORANGE} /><Text style={[styles.date, { color: mutedColor }]}>{item.cities.map(city => city.name).join(' · ')}</Text></View>}
        {!!item.title?.trim() && (
          <View style={styles.titleRow}>
            <Text style={[styles.articleTitle, { color: textColor, fontSize: Math.min(36, Math.max(26, Number(item.titleFontSize) || 30)), lineHeight: Math.round(Math.min(36, Math.max(26, Number(item.titleFontSize) || 30)) * 1.32) }]}>{item.title}</Text>
            {!!titleLink && <Pressable onPress={() => void openExternal(titleLink)} style={styles.titleLink} accessibilityLabel="Open source">
              <Ionicons name="open-outline" size={19} color={ORANGE} />
            </Pressable>}
          </View>
        )}
        {!item.hideReporter && !!item.reporter?.name && <View style={styles.byline}>{!!item.reporter.avatar && <Image source={{ uri: getMediaUrl(item.reporter.avatar) }} style={styles.avatar} />}<Text style={[styles.reporter, { color: mutedColor }]}>By {item.reporter.name}</Text></View>}
        <View style={[styles.editorialRule, { backgroundColor: dark ? '#334155' : '#E7E5E4' }]} />
      {/* Media -> actions -> description, matching the reference reader placement. */}
      <View style={[styles.actionsStrip, { backgroundColor: bg, borderBottomColor: dark ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.actionGroup}>
          <Pressable onPress={() => void toggleLikedNews(item._id)} style={styles.iconButton} accessibilityLabel="Like news">
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? '#EF4444' : textColor} />
          </Pressable>
          <Pressable onPress={() => void toggleSavedNews(item._id)} style={styles.iconButton} accessibilityLabel="Save news">
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={21} color={isSaved ? ORANGE : textColor} />
          </Pressable>
        </View>
        <View style={styles.actionGroup}>
          <Pressable onPress={() => void shareWhatsapp()} disabled={whatsappSharing || sharing}
            style={[styles.iconButton, styles.whatsappButton]} accessibilityLabel="Share to WhatsApp">
            {whatsappSharing ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="logo-whatsapp" size={22} color="#FFF" />}
          </Pressable>
          <Pressable onPress={() => void onShare()} disabled={whatsappSharing || sharing}
            style={styles.iconButton} accessibilityLabel="Share news">
            {sharing ? <ActivityIndicator size="small" color={textColor} /> : <Ionicons name="share-social-outline" size={22} color={textColor} />}
          </Pressable>
        </View>
      </View>

      {images.length > 0 && (
        <View style={[styles.hero, { width: articleWidth, height: mediaHeight }]}>
          <ScrollView horizontal pagingEnabled bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImageIndex(Math.min(images.length - 1,
              Math.max(0, Math.round(e.nativeEvent.contentOffset.x / Math.max(1, articleWidth)))))}>
            {images.map((image, index) => (
              <Pressable key={`${image.url}-${index}`} onPress={() => { setImageIndex(index); setPreviewVisible(true); }}>
                <Image source={{ uri: getMediaUrl(image.url) }}
                  style={{ width: articleWidth, height: mediaHeight }} contentFit="contain"
                  onLoad={(e: any) => {
                    const w = Number(e?.source?.width || 0);
                    const h = Number(e?.source?.height || 0);
                    if (w > 0 && h > 0) setImageRatios((prev) =>
                      prev[image.url] === w / h ? prev : { ...prev, [image.url]: w / h });
                  }} />
              </Pressable>
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.imageCounter} pointerEvents="none">
              <Text style={styles.imageCounterText}>{imageIndex + 1} / {images.length}</Text>
            </View>
          )}
          <Pressable style={styles.expandImage} onPress={() => setPreviewVisible(true)} accessibilityLabel="Expand image">
            <Ionicons name="expand-outline" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
      {active && videos.map((media, index) => (
        <ReaderVideo key={`${item._id}-${media.url}-${index}`} uri={getMediaUrl(media.url)}
          height={videoHeight} active={active} />
      ))}

        {!!item.description?.trim() && <RenderHTML contentWidth={Math.max(1, articleWidth)}
          source={{ html: item.description }}
          baseStyle={{ color: textColor, fontSize: Math.min(28, Math.max(17, Number(item.descriptionFontSize) || 18)), lineHeight: Math.round(Math.min(28, Math.max(17, Number(item.descriptionFontSize) || 18)) * 1.65), fontFamily: 'HindVadodara_400Regular' }}
          tagsStyles={{ p: { marginTop: 0, marginBottom: 16 }, a: { color: ORANGE, textDecorationLine: 'underline' } }} />}
        {!!item.content?.trim() && item.content?.trim() !== item.description?.trim() && <RenderHTML
          contentWidth={Math.max(1, articleWidth)} source={{ html: item.content }}
          baseStyle={{ color: textColor, fontSize: 18, lineHeight: 30, fontFamily: 'HindVadodara_400Regular' }}
          tagsStyles={{ p: { marginTop: 0, marginBottom: 16 }, a: { color: ORANGE, textDecorationLine: 'underline' } }} />}
        {otherMedia.length > 0 && <View style={styles.extraMedia}><MediaDisplay media={otherMedia} /></View>}
        {!!item.hashtags?.length && <Text style={styles.hashtags}>
          {item.hashtags.map((t) => t.startsWith('#') ? t : `#${t}`).join('  ')}
        </Text>}
      </View>
      <FullScreenImageViewer visible={previewVisible} media={images} initialIndex={imageIndex}
        onClose={() => setPreviewVisible(false)} />
    </ScrollView>
  );
}

export default function NewsReaderScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const requestedId = Array.isArray(id) ? id[0] : id;
  const news = useAppStore((s) => s.news);
  const theme = useAppStore((s) => s.theme);
  const trackNewsView = useAppStore((s) => s.trackNewsView);
  const isDark = theme === 'dark';
  const [fallbackNews, setFallbackNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pageHeight, setPageHeight] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList<NewsItem>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const initializedId = useRef<string | undefined>(undefined);
  const viewed = useRef(new Set<string>());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!requestedId || news.some((n) => n._id === requestedId)) return;
    let cancelled = false;
    setLoading(true); setLoadError(false);
    api.getNewsById(requestedId)
      .then((result) => { if (!cancelled) setFallbackNews(result); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requestedId, news]);

  const stories = useMemo(() => {
    const filtered = news.filter(canDisplay);
    return fallbackNews && canDisplay(fallbackNews) && !filtered.some((n) => n._id === fallbackNews._id)
      ? [fallbackNews, ...filtered] : filtered;
  }, [news, fallbackNews]);
  const startIndex = useMemo(() => Math.max(0, stories.findIndex((n) => n._id === requestedId)), [stories, requestedId]);

  useEffect(() => {
    if (!pageHeight || !requestedId || !stories.some((s) => s._id === requestedId)) return;
    if (initializedId.current === requestedId) return;
    initializedId.current = requestedId;
    setCurrentIndex(startIndex);
    scrollY.setValue(startIndex * pageHeight);
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: startIndex, animated: false }));
  }, [pageHeight, requestedId, startIndex, stories, scrollY]);

  const markViewed = useCallback((story?: NewsItem) => {
    if (!story || viewed.current.has(story._id)) return;
    viewed.current.add(story._id);
    void trackNewsView(story._id);
  }, [trackNewsView]);
  useEffect(() => {
    if (!pageHeight || initializedId.current !== requestedId) return;
    markViewed(stories[currentIndex]);
  }, [pageHeight, currentIndex, stories, requestedId, markViewed]);

  const goTo = (index: number) => {
    if (index < 0 || index >= stories.length) return;
    setCurrentIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const background = isDark ? '#111827' : '#FFFEFC';
  const foreground = isDark ? '#F8FAFC' : '#0F172A';
  return (
    <View style={[styles.screen, { backgroundColor: background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={background} />
      {/* Header is in normal layout, fully BELOW status bar, not overlaid on content. */}
      <View style={[styles.header, { backgroundColor: background, borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="Back to Home">
          <Ionicons name="arrow-back" size={24} color={foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: foreground }]}>INMinut <Text style={{ color: ORANGE }}> / Reader</Text></Text>
      </View>
      <View style={[styles.pager, { backgroundColor: isDark ? '#080D16' : '#E6E1DB' }]} onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h !== pageHeight) setPageHeight(h);
      }}>
        {loading && !stories.some(s => s._id === requestedId) ? (
          <View style={styles.center}><ActivityIndicator size="large" color={ORANGE} /></View>
        ) : loadError && !stories.some(s => s._id === requestedId) ? (
          <View style={styles.center}><Text style={{ color: foreground }}>This news could not be loaded.</Text></View>
        ) : pageHeight > 0 && stories.length > 0 && (!requestedId || stories.some(s => s._id === requestedId)) ? (
          <Animated.FlatList
            ref={listRef as any} data={stories} keyExtractor={(s) => s._id}
            renderItem={({ item, index }) => {
              // A clearly visible card lift: the next story rises from the
              // bottom center while the outgoing story shrinks and moves away.
              // Every value follows the gesture, including reverse swipes.
              const range = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]
                .map((step) => (index + step) * pageHeight);
              const scale = scrollY.interpolate({
                inputRange: range,
                outputRange: [0.64, 0.76, 0.87, 0.96, 1, 0.94, 0.85, 0.74, 0.64],
                extrapolate: 'clamp',
              });
              const translateY = scrollY.interpolate({
                inputRange: range,
                outputRange: [0, -pageHeight * 0.12, -pageHeight * 0.10, -pageHeight * 0.045, 0,
                  -pageHeight * 0.08, -pageHeight * 0.11, -pageHeight * 0.08, 0],
                extrapolate: 'clamp',
              });
              const rotateX = scrollY.interpolate({
                inputRange: range,
                outputRange: ['-28deg', '-22deg', '-12deg', '-4deg', '0deg', '3deg', '8deg', '15deg', '24deg'],
                extrapolate: 'clamp',
              });
              return <View style={{ height: pageHeight, width: '100%', overflow: 'hidden' }}>
                <Animated.View style={{ flex: 1, backgroundColor: background, borderRadius: 20, overflow: 'hidden',
                  transform: [{ translateY }, { perspective: 1100 }, { rotateX }, { scale }],
                  backfaceVisibility: 'hidden' }}>
                  <ReaderStory item={item} height={pageHeight} active={currentIndex === index} />
                </Animated.View>
              </View>;
            }}
            pagingEnabled snapToInterval={pageHeight} decelerationRate="fast"
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false} bounces={false}
            getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
            initialNumToRender={3} maxToRenderPerBatch={3} windowSize={5}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => setCurrentIndex(Math.min(stories.length - 1,
              Math.max(0, Math.round(e.nativeEvent.contentOffset.y / pageHeight))))}
            onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: index * pageHeight, animated: false })}
          />
        ) : !loading && !stories.some(s => s._id === requestedId) ? (
          <View style={styles.center}><Text style={{ color: foreground }}>No news available.</Text></View>
        ) : null}
      </View>
      {/* {stories.length > 1 && (
        <View style={[styles.bottomNavigation, { backgroundColor: background, borderTopColor: isDark ? '#334155' : '#E2E8F0' }]}>
          <Pressable onPress={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            style={[styles.navControl, currentIndex === 0 && styles.disabled]} accessibilityLabel="Previous story">
            <Ionicons name="chevron-up" size={20} color={foreground} /><Text style={{ color: foreground, fontSize: 12 }}>Previous</Text>
          </Pressable>
          <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}>Swipe for next news</Text>
          <Pressable onPress={() => goTo(currentIndex + 1)} disabled={currentIndex >= stories.length - 1}
            style={[styles.navControl, currentIndex >= stories.length - 1 && styles.disabled]} accessibilityLabel="Next story">
            <Text style={{ color: foreground, fontSize: 12 }}>Next</Text><Ionicons name="chevron-down" size={20} color={foreground} />
          </Pressable>
        </View>
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, pager: { flex: 1, overflow: 'hidden' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: 0 },
  headerButton: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontWeight: '800', fontSize: 18, marginLeft: 6 },
  articleScroll: { flex: 1 }, hero: { overflow: 'hidden', backgroundColor: '#0B1220', justifyContent: 'center', borderRadius: 16, marginBottom: 22 },
  videoWrap: { width: '100%', backgroundColor: '#0B1220', overflow: 'hidden', borderRadius: 16, marginBottom: 22 },
  imageCounter: { position: 'absolute', right: 14, bottom: 12, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 15, backgroundColor: '#0009' },
  imageCounterText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  expandImage: { position: 'absolute', top: 12, right: 12, backgroundColor: '#0009', borderRadius: 20, padding: 7 },
  actionsStrip: { minHeight: 52, marginBottom: 20, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 41, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  whatsappButton: { backgroundColor: '#25D366' },
  articleBody: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 38, flexGrow: 1 },
  editorialRule: { height: StyleSheet.hairlineWidth, marginTop: 18 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 5 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  metadata: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  breakingPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 5, backgroundColor: '#E11D48' },
  breakingText: { color: '#FFF', fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  category: { color: ORANGE, fontWeight: '800', fontSize: 12 }, date: { fontWeight: '500', fontSize: 11 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  articleTitle: { fontFamily: 'HindVadodara_700Bold', letterSpacing: -0.4, flex: 1 }, titleLink: { padding: 5, marginTop: 4 },
  reporter: { fontSize: 13, fontWeight: '600', flexShrink: 1 }, extraMedia: { marginVertical: 14 },
  hashtags: { marginTop: 8, color: ORANGE, lineHeight: 24 },
  bottomNavigation: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth },
  navControl: { flexDirection: 'row', alignItems: 'center', padding: 4, gap: 2 }, disabled: { opacity: 0.32 },
});
