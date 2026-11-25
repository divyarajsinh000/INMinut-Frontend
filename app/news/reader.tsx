import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Alert, Linking, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, Extrapolation, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import * as Storage from '@/utils/storage';
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
import { getShareImageCandidates } from '@/utils/newsImages';
import BrandedShareImage from '@/components/BrandedShareImage';
import { captureRef } from 'react-native-view-shot';

const ORANGE = '#F97316';
const ANIMATION_KEY = 'reader_animation';
type ReaderAnimation = 'lift' | 'zoom' | 'fold';
const ANIMATIONS = [
  { id: 'lift', title: 'Card Lift', description: 'Classic depth and stacking', icon: 'layers-outline' },
  { id: 'zoom', title: 'Zoom & Fade', description: 'Soft cinematic zoom', icon: 'scan-outline' },
  { id: 'fold', title: '3D Paper Fold', description: 'Magazine-style page tilt', icon: 'book-outline' },
] as const;
const isAnimation = (value: unknown): value is ReaderAnimation => value === 'lift' || value === 'zoom' || value === 'fold';
type ReaderGestureProps = {
  index: number; total: number; position: SharedValue<number>; locked: SharedValue<boolean>;
  onTransitionStart: () => void; onTransitionEnd: (index: number) => void; reducedMotion: boolean;
};
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
        nativeControls allowsFullscreen surfaceType="textureView" />
    </View>
  );
}

function ReaderStory({ item, height, active, transitioning, index, total, position, locked, onTransitionStart, onTransitionEnd, reducedMotion }:
  { item: NewsItem; height: number; active: boolean; transitioning: boolean } & ReaderGestureProps) {
  const offset = useSharedValue(0);
  const contentSize = useSharedValue(0);
  const viewport = useSharedValue(height);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const startedAtTop = useSharedValue(false);
  const startedAtBottom = useSharedValue(false);
  const ownsGesture = useSharedValue(false);
  const shareInProgress = useSharedValue(false);
  const pageDirection = useSharedValue(0);
  const onArticleScroll = useAnimatedScrollHandler({ onScroll: (e) => { offset.value = e.contentOffset.y; } });
  // Decide ownership once, before the inner native scroll can activate.
  // A gesture that starts inside a long article never becomes a page swipe halfway through.
  const pagePan = Gesture.Pan().manualActivation(true).maxPointers(1)
    .onTouchesDown((e, manager) => {
      if (!active || locked.value || shareInProgress.value || e.allTouches.length !== 1) { manager.fail(); return; }
      const touch = e.allTouches[0];
      touchX.value = touch.absoluteX; touchY.value = touch.absoluteY;
      const max = Math.max(0, contentSize.value - viewport.value);
      pageDirection.value = 0;
      startedAtTop.value = offset.value <= 3;
      startedAtBottom.value = offset.value >= max - 3;
    })
    .onTouchesMove((e, manager) => {
      if (ownsGesture.value) return;
      if (locked.value || shareInProgress.value || e.allTouches.length !== 1) { manager.fail(); return; }
      const touch = e.allTouches[0];
      const dx = touch.absoluteX - touchX.value, dy = touch.absoluteY - touchY.value;
      if (Math.abs(dx) > 10 && Math.abs(dx) >= Math.abs(dy)) { manager.fail(); return; }
      if (Math.abs(dy) < 10) return;
      if ((dy < 0 && startedAtBottom.value && index < total - 1) ||
          (dy > 0 && startedAtTop.value && index > 0)) {
        pageDirection.value = dy < 0 ? 1 : -1;
        manager.activate();
      } else manager.fail();
    })
    .onTouchesUp((_e, manager) => { if (!ownsGesture.value) manager.fail(); })
    .onStart(() => {
      ownsGesture.value = true; locked.value = true;
      runOnJS(onTransitionStart)();
    })
    .onUpdate((e) => {
      const delta = Math.max(pageDirection.value < 0 ? -1 : 0, Math.min(pageDirection.value > 0 ? 1 : 0, -e.translationY / Math.max(1, height)));
      position.value = index + delta;
    })
    .onEnd((e, success) => {
      if (!success) return;
      ownsGesture.value = false;
      const delta = position.value - index;
      const direction = Math.abs(delta) > 0.18 ? Math.sign(delta) : Math.abs(e.velocityY) > 650 && Math.abs(delta) > 0.035 && Math.sign(delta) === Math.sign(-e.velocityY) ? Math.sign(delta) : 0;
      const next = Math.min(total - 1, Math.max(0, index + direction));
      position.value = withTiming(next, { duration: reducedMotion ? 120 : 260, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onTransitionEnd)(next);
      });
    })
    .onFinalize(() => {
      if (!ownsGesture.value) return;
      ownsGesture.value = false;
      position.value = withTiming(index, { duration: 180 }, (finished) => {
        if (finished) runOnJS(onTransitionEnd)(index);
      });
    });
  const nativeScroll = Gesture.Native().requireExternalGestureToFail(pagePan);

  const { width, height: screenHeight } = useWindowDimensions();
  const theme = useAppStore((s) => s.theme);
  const settings = useAppStore((s) => s.settings);
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
  const [captureImages, setCaptureImages] = useState<string[]>([]);
  const captureView = useRef<View>(null);
  const captureReady = useRef<(() => void) | null>(null);
  const sharingRef = useRef(false);
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

  const shareBranded = async (whatsapp: boolean) => {
    let NativeShare: any;
    try { NativeShare = require('react-native-share').default || require('react-native-share'); }
    catch { throw new Error('Native sharing requires a development build'); }
    if (!NativeShare) throw new Error('Native sharing unavailable');
    const candidates = getShareImageCandidates(item.media, settings);
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        captureReady.current = null;
        reject(new Error('Share image took too long to load'));
      }, 12000);
      captureReady.current = () => { clearTimeout(timer); captureReady.current = null; resolve(); };
    });
    setCaptureImages(candidates);
    try {
      await ready;
      if (!captureView.current) throw new Error('Share image is not ready');
      const captured = await captureRef(captureView, { format: 'jpg', quality: 0.95, result: 'tmpfile', width: 1080 });
      const url = captured.startsWith('file://') ? captured : `file://${captured}`;
      const message = `View Post : ${storyUrl}\n\nDownload App : https://play.google.com/store/apps/details?id=com.inminut`;
      const options = { url, type: 'image/jpeg', message, failOnCancel: false };
      const result = whatsapp
        ? await NativeShare.shareSingle({ ...options, social: NativeShare.Social.WHATSAPP })
        : await NativeShare.open({ ...options, title: item.title || 'Share INMinut news' });
      return result?.success !== false;
    } finally { setCaptureImages([]); }
  };

  const onShare = async () => {
    if (sharingRef.current || !active || transitioning) return;
    sharingRef.current = true;
    shareInProgress.value = true;
    setSharing(true);
    try {
      const shared = Platform.OS !== 'web' && !videos.length && !otherMedia.length
        ? await shareBranded(false)
        : await shareNewsDirect({
          title: item.title, description: item.description, content: item.content,
          media: item.media || [], hashtags: item.hashtags || [], cities: item.cities || [],
          publishedDate: item.publishedDate, link: storyUrl,
        });
      if (shared !== false) await trackNewsShare(item._id);
    } catch { Alert.alert('Share failed', 'Unable to share this news right now.'); }
    finally { sharingRef.current = false; shareInProgress.value = false; setSharing(false); }
  };

  const shareWhatsapp = async () => {
    if (sharingRef.current || !active || transitioning) return;
    sharingRef.current = true;
    shareInProgress.value = true;
    setWhatsappSharing(true);
    try {
      const message = `${item.title || 'INMinut News'}\n${storyUrl}`;
      if (Platform.OS === 'web') {
        await openExternal(`https://wa.me/?text=${encodeURIComponent(message)}`);
      } else if (!videos.length && !otherMedia.length) {
        if (!(await shareBranded(true))) return;
      } else {
        // Preserve existing link sharing for video/PDF articles in the reader.
        let NativeShare: any;
        try { NativeShare = require('react-native-share').default; } catch { NativeShare = null; }
        if (NativeShare?.shareSingle) {
          const result = await NativeShare.shareSingle({ social: NativeShare.Social.WHATSAPP, message, failOnCancel: false });
          if (result?.success === false) return;
        } else {
          await openExternal(`https://wa.me/?text=${encodeURIComponent(message)}`);
        }
      }
      await trackNewsShare(item._id);
    } catch (error: any) {
      if (!/cancel|dismiss/i.test(String(error?.message || error)))
        Alert.alert('WhatsApp share failed', 'Please try again.');
    } finally { sharingRef.current = false; shareInProgress.value = false; setWhatsappSharing(false); }
  };

  return (
    <GestureDetector gesture={pagePan}>
    <View style={{ flex: 1 }} collapsable={false}>
    <GestureDetector gesture={nativeScroll}>
    <Animated.ScrollView style={[styles.articleScroll, { height, backgroundColor: bg }]}
      contentContainerStyle={{ flexGrow: 1 }}
      scrollEnabled={active && !transitioning}
      onScroll={onArticleScroll} scrollEventThrottle={16}
      onContentSizeChange={(_, h) => { contentSize.value = h; }}
      onLayout={(e) => { viewport.value = e.nativeEvent.layout.height; }}
      showsVerticalScrollIndicator={false} nestedScrollEnabled={false}
      directionalLockEnabled bounces={false} overScrollMode="never"
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
          <ScrollView horizontal pagingEnabled bounces={false} directionalLockEnabled scrollEnabled={active && !transitioning}
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
      {videos.map((media, index) => active ? (
        <ReaderVideo key={`${item._id}-${media.url}-${index}`} uri={getMediaUrl(media.url)}
          height={videoHeight} active={!transitioning} />
      ) : <View key={`${item._id}-${media.url}-${index}`} style={[styles.videoWrap, { height: videoHeight }]} />)}

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
    </Animated.ScrollView>
    </GestureDetector>
      {captureImages.length > 0 && <View pointerEvents="none" style={{ position: 'absolute', left: -12000, top: 0, width: 1080 }}>
        <View ref={captureView} collapsable={false}>
          <BrandedShareImage imageUri={captureImages[0]} fallbackImageUris={captureImages.slice(1)}
            imageHeight={images.length && imageRatios[images[0].url] ? Math.min(1800, Math.round(972 / imageRatios[images[0].url])) : 850}
            title={item.title} description={(item.description || item.content || '').replace(/<[^>]*>/g, '')}
            titleColor={item.titleColor || '#111111'} titleFontSize={Number(item.titleFontSize) || 20}
            descriptionFontSize={Number(item.descriptionFontSize) || 14} publishedDate={item.publishedDate}
            reporterName={item.hideReporter ? undefined : item.reporter?.name} isBreaking={item.isBreaking}
            breakingText={item.breakingText} breakingTextColor={item.breakingTextColor}
            logoUrl={settings?.appLogo ? getMediaUrl(settings.appLogo) : undefined}
            onReady={() => captureReady.current?.()} />
        </View>
      </View>}
      <FullScreenImageViewer visible={previewVisible && active} media={images} initialIndex={imageIndex}
        onClose={() => setPreviewVisible(false)} />
    </View>
    </GestureDetector>
  );
}

function ReaderPage({ item, height, active, transitioning, animation, background, ...gestureProps }:
  { item: NewsItem; height: number; active: boolean; transitioning: boolean; animation: ReaderAnimation; background: string } & ReaderGestureProps) {
  const { index, position, reducedMotion } = gestureProps;
  const style = useAnimatedStyle(() => {
    const d = Math.max(-1, Math.min(1, index - position.value));
    const a = Math.abs(d);
    if (reducedMotion) return { opacity: 1, transform: [{ translateY: d * height }] };
    if (animation === 'zoom') return {
      opacity: interpolate(a, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: d * height * 0.48 }, { scale: d > 0 ? 1 + a * 0.12 : 1 - a * 0.30 }],
    };
    if (animation === 'fold') return {
      opacity: interpolate(a, [0, 0.9, 1], [1, 1, 0], Extrapolation.CLAMP), transform: [{ perspective: 1000 }, { translateY: d * height * 0.80 }, { rotateX: `${d * -52}deg` }, { scale: 1 - a * 0.12 }],
    };
    // Preserve the original Card Lift interpolation.
    const range = [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1];
    const scale = interpolate(-d, range, [.64,.76,.87,.96,1,.94,.85,.74,.64], Extrapolation.CLAMP);
    const lift = interpolate(-d, range, [0,-.12,-.10,-.045,0,-.08,-.11,-.08,0], Extrapolation.CLAMP);
    const angle = interpolate(-d, range, [-28,-22,-12,-4,0,3,8,15,24], Extrapolation.CLAMP);
    return { opacity: interpolate(a, [0, .95, 1], [1, 1, 0], Extrapolation.CLAMP), transform: [{ translateY: (d + lift) * height }, { perspective: 1100 }, { rotateX: `${angle}deg` }, { scale }] };
  }, [animation, height, index, reducedMotion]);
  return <Animated.View pointerEvents={active ? 'auto' : 'none'}
    accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    style={[StyleSheet.absoluteFillObject, { backgroundColor: background, overflow: 'hidden', borderRadius: 18,
      zIndex: active ? (animation === 'zoom' ? 1 : 2) : (animation === 'zoom' ? 2 : 1), backfaceVisibility: 'hidden' }, style]}>
    <ReaderStory item={item} height={height} active={active} transitioning={transitioning} {...gestureProps} />
  </Animated.View>;
}

export default function NewsReaderScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const requestedId = Array.isArray(id) ? id[0] : id;
  const news = useAppStore((s) => s.news);
  const theme = useAppStore((s) => s.theme);
  const trackNewsView = useAppStore((s) => s.trackNewsView);
  const fetchSettings = useAppStore((s) => s.fetchSettings);
  useEffect(() => { if (!useAppStore.getState().settings) void fetchSettings(); }, [fetchSettings]);
  const isDark = theme === 'dark';
  const [fallbackNews, setFallbackNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pageHeight, setPageHeight] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useSharedValue(0);
  const locked = useSharedValue(false);
  const [transitioning, setTransitioning] = useState(false);
  const [animation, setAnimation] = useState<ReaderAnimation>('lift');
  const [showAnimations, setShowAnimations] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const preferenceTouched = useRef(false);
  useEffect(() => {
    let alive = true;
    Storage.getItemAsync(ANIMATION_KEY).then(value => {
      if (alive && !preferenceTouched.current && isAnimation(value)) setAnimation(value);
    }).catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { alive = false; sub.remove(); };
  }, []);
  const selectAnimation = (value: ReaderAnimation) => {
    preferenceTouched.current = true;
    setAnimation(value); setShowAnimations(false);
    void Storage.setItemAsync(ANIMATION_KEY, value).catch(() => undefined);
  };
  const onTransitionStart = useCallback(() => setTransitioning(true), []);
  const onTransitionEnd = useCallback((index: number) => {
    setCurrentIndex(index); setTransitioning(false);
  }, []);
  useEffect(() => { if (!transitioning) locked.value = false; }, [transitioning, currentIndex, locked]);
  const initializedId = useRef<string | undefined>(undefined);
  const viewed = useRef(new Set<string>());
  const insets = useSafeAreaInsets();

  const requestedInFeed = !!requestedId && news.some(n => n._id === requestedId);
  useEffect(() => {
    if (!requestedId || requestedInFeed) { setLoading(false); setLoadError(false); return; }
    let cancelled = false;
    setLoading(true); setLoadError(false);
    api.getNewsById(requestedId)
      .then((result) => { if (!cancelled) setFallbackNews(result); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requestedId, requestedInFeed]);

  const stories = useMemo(() => {
    const filtered = news.filter(canDisplay);
    return fallbackNews && fallbackNews._id === requestedId && canDisplay(fallbackNews) && !filtered.some((n) => n._id === fallbackNews._id)
      ? [fallbackNews, ...filtered] : filtered;
  }, [news, fallbackNews, requestedId]);
  const startIndex = useMemo(() => Math.max(0, stories.findIndex((n) => n._id === requestedId)), [stories, requestedId]);

  useLayoutEffect(() => {
    if (!pageHeight || !stories.length || (requestedId && !stories.some((s) => s._id === requestedId))) return;
    if (initializedId.current === (requestedId || '__first__')) return;
    initializedId.current = requestedId || '__first__';
    setCurrentIndex(startIndex);
    position.value = startIndex;
  }, [pageHeight, requestedId, startIndex, stories, position]);

  const markViewed = useCallback((story?: NewsItem) => {
    if (!story || viewed.current.has(story._id)) return;
    viewed.current.add(story._id);
    void trackNewsView(story._id);
  }, [trackNewsView]);
  useEffect(() => {
    if (!pageHeight || transitioning || initializedId.current !== (requestedId || '__first__')) return;
    if (viewed.current.size === 0 && requestedId && stories[currentIndex]?._id !== requestedId) return;
    markViewed(stories[currentIndex]);
  }, [pageHeight, currentIndex, stories, requestedId, markViewed, transitioning]);

  const goTo = (index: number) => {
    if (transitioning || locked.value || index < 0 || index >= stories.length || index === currentIndex) return;
    locked.value = true;
    setTransitioning(true);
    position.value = withTiming(index, { duration: reducedMotion ? 120 : 280, easing: Easing.out(Easing.cubic) }, finished => {
      if (finished) runOnJS(onTransitionEnd)(index);
    });
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
        <Pressable onPress={() => setShowAnimations(true)} disabled={transitioning} style={styles.headerButton} accessibilityLabel="Reader animation settings">
          <Ionicons name="layers-outline" size={23} color={ORANGE} />
        </Pressable>
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
          <View style={{ flex: 1, overflow: 'hidden' }}>
            {stories.slice(Math.max(0, currentIndex - 1), currentIndex + 2).map((item, localIndex) => {
              const index = Math.max(0, currentIndex - 1) + localIndex;
              return <ReaderPage key={item._id} item={item} index={index} total={stories.length}
                height={pageHeight} active={index === currentIndex} transitioning={transitioning}
                animation={animation} background={background} position={position} locked={locked}
                onTransitionStart={onTransitionStart} onTransitionEnd={onTransitionEnd} reducedMotion={reducedMotion} />;
            })}
          </View>
        ) : !loading && !stories.some(s => s._id === requestedId) ? (
          <View style={styles.center}><Text style={{ color: foreground }}>No news available.</Text></View>
        ) : null}
      </View>
      {stories.length > 1 && <View style={[styles.bottomNavigation, { backgroundColor: background, borderTopColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <Pressable onPress={() => goTo(currentIndex - 1)} disabled={transitioning || currentIndex === 0} style={[styles.navControl, (transitioning || currentIndex === 0) && styles.disabled]} accessibilityLabel="Previous story">
          <Ionicons name="chevron-up" size={18} color={foreground} /><Text style={{ color: foreground, fontSize: 12, fontWeight: '700' }}>Previous</Text>
        </Pressable>
        <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}>Swipe at article edge</Text>
        <Pressable onPress={() => goTo(currentIndex + 1)} disabled={transitioning || currentIndex >= stories.length - 1} style={[styles.navControl, (transitioning || currentIndex >= stories.length - 1) && styles.disabled]} accessibilityLabel="Next story">
          <Text style={{ color: foreground, fontSize: 12, fontWeight: '700' }}>Next</Text><Ionicons name="chevron-down" size={18} color={foreground} />
        </Pressable>
      </View>}
      <Modal visible={showAnimations} transparent animationType="fade" onRequestClose={() => setShowAnimations(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAnimations(false)} accessibilityLabel="Close animation settings" />
          <View style={[styles.animationSheet, { backgroundColor: background, paddingBottom: Math.max(22, insets.bottom) }]}>
            <View style={styles.sheetHeading}>
              <View style={{ flex: 1 }}><Text style={[styles.sheetTitle, { color: foreground }]}>Reader animation</Text><Text style={{ color: isDark ? '#94A3B8' : '#64748B', marginTop: 4 }}>Choose your preferred transition.</Text></View>
              <Pressable onPress={() => setShowAnimations(false)} style={styles.headerButton} accessibilityLabel="Close"><Ionicons name="close" size={24} color={foreground} /></Pressable>
            </View>
            {ANIMATIONS.map(option => <Pressable key={option.id} onPress={() => selectAnimation(option.id)} accessibilityRole="radio" accessibilityState={{ checked: animation === option.id }}
              style={[styles.animationOption, { borderColor: animation === option.id ? ORANGE : isDark ? '#334155' : '#E2E8F0', backgroundColor: animation === option.id ? (isDark ? '#35251D' : '#FFF7ED') : background }]}>
              <View style={styles.animationIcon}><Ionicons name={option.icon} size={24} color={ORANGE} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: foreground, fontWeight: '800', fontSize: 15 }}>{option.title}</Text><Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 12, marginTop: 3 }}>{option.description}</Text></View>
              <Ionicons name={animation === option.id ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={animation === option.id ? ORANGE : '#94A3B8'} />
            </Pressable>)}
            <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 12, marginTop: 8 }}>{reducedMotion ? 'Reduced motion is enabled in device settings.' : 'Your preference is saved automatically.'}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  animationSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, gap: 10 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 22, fontWeight: '900' },
  animationOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 16 },
  animationIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9731620', borderRadius: 12 },
  screen: { flex: 1 }, pager: { flex: 1, overflow: 'hidden' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
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
  articleBody: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, flexGrow: 1 },
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
