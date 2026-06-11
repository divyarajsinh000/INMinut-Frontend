import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions, Pressable, Alert, ActivityIndicator, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { AppPalette, Colors } from '@/constants/theme';
import { MediaItem, NewsItem } from '@/api';
import { formatDate } from '@/utils';
import { useAppStore } from '@/store';
import FullScreenImageViewer from '@/components/FullScreenImageViewer';
import MediaDisplay from '@/components/MediaDisplay';
import { shareBrandedImageFile, shareNewsDirect } from '@/utils/share';
import { getImageMedia, getMediaUrl } from '@/utils/media';
import { captureRef } from 'react-native-view-shot';
import BrandedShareImage from '@/components/BrandedShareImage';

const CARD_WIDTH = Dimensions.get('window').width - 32;
const DEFAULT_TITLE_FONT_SIZE = 20;
const DEFAULT_DESCRIPTION_FONT_SIZE = 14;

interface NewsCardProps {
  item: NewsItem;
}

const normalizeFontSize = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const normalizeHexColor = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  return /^#([0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/i.test(color) ? color : fallback;
};

export default function NewsCard({ item }: NewsCardProps) {
  const { savedNews, toggleSavedNews, trackNewsShare } = useAppStore();
  const isSaved = savedNews.includes(item._id);
  const images = getImageMedia(item.media);
  const nonImageMedia = (item.media || []).filter((m) => !!m.url && m.type !== 'image');
  const hasAnyMedia = images.length > 0 || nonImageMedia.length > 0;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareImageUri, setShareImageUri] = useState<string | null>(null);
  const brandedShareRef = useRef<View>(null);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const contentText = item.content || '';
  const shouldShowDescriptionMore = (item.description || '').length > 180;
  const titleColor = normalizeHexColor(item.titleColor, AppPalette.navyBlue);
  const titleFontSize = normalizeFontSize(item.titleFontSize, DEFAULT_TITLE_FONT_SIZE, 14, 34);
  const descriptionFontSize = normalizeFontSize(item.descriptionFontSize, DEFAULT_DESCRIPTION_FONT_SIZE, 12, 28);
  const breakingLabel = item.breakingText?.trim() || 'Breaking';
  const hasOnlyMedia = !item.title?.trim() && !item.description?.trim() && !contentText.trim();

  const getImageHeight = (media?: MediaItem) => {
    const url = media?.url || '';
    const ratio = imageRatios[url] || 1.35;
    const rawHeight = CARD_WIDTH / Math.max(ratio, 0.45);
    const minHeight = hasOnlyMedia ? 260 : 190;
    const maxHeight = hasOnlyMedia ? 620 : 520;
    return Math.round(Math.min(maxHeight, Math.max(minHeight, rawHeight)));
  };

  const handleImageLoad = (media: MediaItem, event: any) => {
    const width = event?.source?.width || event?.nativeEvent?.source?.width || event?.nativeEvent?.width;
    const height = event?.source?.height || event?.nativeEvent?.source?.height || event?.nativeEvent?.height;
    if (!media.url || !width || !height) return;

    const ratio = Number(width) / Number(height);
    if (!Number.isFinite(ratio) || ratio <= 0) return;

    setImageRatios((prev) => {
      if (Math.abs((prev[media.url] || 0) - ratio) < 0.01) return prev;
      return { ...prev, [media.url]: ratio };
    });
  };

  const shareFirstImageAsBrandedPng = async () => {
    const firstImageUrl = getMediaUrl(images[0]?.url);
    if (!firstImageUrl) return shareNewsDirect({
      title: item.title,
      description: item.description,
      content: item.content,
      media: item.media || [],
      hashtags: item.hashtags || [],
      cities: item.cities || [],
      publishedDate: item.publishedDate,
    });

    await Image.prefetch(firstImageUrl).catch(() => undefined);
    setShareImageUri(firstImageUrl);

    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(resolve, 900);
      });
    });

    const capturedUri = await captureRef(brandedShareRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: 1080,
      height: 1350,
    });

    return shareBrandedImageFile(capturedUri, item.title || 'Share news image');
  };

  const handleShare = async () => {
    if (sharing) return;

    try {
      setSharing(true);
      const hasPdf = (item.media || []).some((media) => media.type === 'pdf' && !!media.url);
      const hasVideo = (item.media || []).some((media) => media.type === 'video' && !!media.url);
      const shared = images.length > 0 && !hasPdf && !hasVideo
        ? await shareFirstImageAsBrandedPng()
        : await shareNewsDirect({
            title: item.title,
            description: item.description,
            content: item.content,
            media: item.media || [],
            hashtags: item.hashtags || [],
            cities: item.cities || [],
            publishedDate: item.publishedDate,
          });

      if (shared !== false) {
        await trackNewsShare(item._id);
      }
    } catch (error) {
      console.error('Share news failed:', error);
      Alert.alert('Share failed', 'Unable to share this news right now. Please try again.');
    } finally {
      setShareImageUri(null);
      setSharing(false);
    }
  };

  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    setActiveImageIndex(index);
  };

  const openImagePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const shouldShowReadMore = contentText.length > 180;

  return (
    <View style={styles.container}>
      {images.length > 0 ? (
        <View style={styles.imageWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
          >
            {images.map((media: MediaItem, index) => (
              <TouchableOpacity
                key={`${media.url}-${index}`}
                activeOpacity={0.92}
                onPress={() => openImagePreview(index)}
                style={styles.imageSlide}
              >
                <Image
                  source={{ uri: getMediaUrl(media.url) }}
                  style={[styles.image, { height: getImageHeight(media) }]}
                  contentFit="contain"
                  onLoad={(event) => handleImageLoad(media, event)}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {item.isBreaking && (
            <View style={styles.breakingBadge}>
              <Ionicons name="flash" size={13} color="#fff" />
              <Text style={styles.breakingText}>{breakingLabel}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.mediaBadge} activeOpacity={0.85} onPress={() => openImagePreview(activeImageIndex)}>
            <Ionicons name="expand-outline" size={13} color="#fff" />
            <Text style={styles.mediaBadgeText}>{images.length > 1 ? `${activeImageIndex + 1}/${images.length}` : 'OPEN'}</Text>
          </TouchableOpacity>

          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, index) => (
                <Pressable key={index} onPress={() => setActiveImageIndex(index)} style={[styles.imageDot, index === activeImageIndex && styles.imageDotActive]} />
              ))}
            </View>
          )}
        </View>
      ) : !hasAnyMedia ? (null
        // <View style={styles.emptyImage}>
        //   <Ionicons name="newspaper-outline" size={42} color={AppPalette.brightOrange} />
        //   {item.isBreaking && (
        //     <View style={styles.breakingBadge}>
        //       <Ionicons name="flash" size={13} color="#fff" />
        //       <Text style={styles.breakingText}>{breakingLabel}</Text>
        //     </View>
        //   )}
        // </View>
      ) : null}

      <View style={styles.content}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryBadge, { backgroundColor: item.category?.backgroundColor || Colors.brightOrange }]}> 
            <Text style={[styles.categoryText, { color: item.category?.textColor || Colors.white }]}> 
              {item.category?.name || 'News'}
            </Text>
          </View>
           {!!item.cities?.length ? (
       <View style={styles.dateRow}>
            <Ionicons name="location-outline" size={14} color={AppPalette.brightOrange} />
            <Text style={styles.date} numberOfLines={1}>{item.cities.map((city) => city.name).join(', ')}</Text>
          </View>
        ) : null
         
        }
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={AppPalette.muted} />
            <Text style={styles.date}>{formatDate(item.publishedDate)}</Text>
          </View>
        </View>

        {item.isBreaking && images.length === 0 && (
          <View style={styles.inlineBreakingBadge}>
            <Ionicons name="flash" size={13} color="#fff" />
            <Text style={styles.breakingText}>{breakingLabel}</Text>
          </View>
        )}

        {!!item.title && <Text style={[styles.title, { color: titleColor, fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.28) }]}>{item.title}</Text>}
{!!item.description && (
  <View style={styles.descriptionWrap}>
    <Text
      style={[
        styles.description,
        {
          fontSize: descriptionFontSize,
          lineHeight: Math.round(descriptionFontSize * 1.45),
        },
      ]}
      numberOfLines={descriptionExpanded ? undefined : 5}
    >
      {item.description}
    </Text>

    {shouldShowDescriptionMore && (
      <TouchableOpacity
        onPress={() => setDescriptionExpanded((prev) => !prev)}
        style={styles.descriptionMoreButton}
        activeOpacity={0.8}
      >
        <Text style={styles.descriptionMoreText}>
          {descriptionExpanded ? 'Show less' : 'Show more'}
        </Text>
        <Ionicons
          name={descriptionExpanded ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={AppPalette.brightOrange}
        />
      </TouchableOpacity>
    )}
  </View>
)}
        {!!contentText && (
          <View style={styles.articleBox}>
            <Text style={styles.articleContent} numberOfLines={expanded ? undefined : 5}>{contentText}</Text>
            {shouldShowReadMore && (
              <TouchableOpacity onPress={() => setExpanded((prev) => !prev)} style={styles.readMoreButton} activeOpacity={0.8}>
                <Text style={styles.readMoreText}>{expanded ? 'Show less' : 'Read full news'}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={AppPalette.brightOrange} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!nonImageMedia.length && (
          <View style={styles.inlineMediaWrap}>
            <MediaDisplay media={nonImageMedia} />
          </View>
        )}

       

        {item.hashtags?.length > 0 && (
          <View style={styles.hashtagsContainer}>
            {item.hashtags.slice(0, expanded ? item.hashtags.length : 3).map((tag, index) => (
              <Text key={index} style={styles.hashtag}>#{tag}</Text>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.reporterContainer}>
            {item.reporter?.avatar ? (
              <Image source={{ uri: item.reporter.avatar }} style={styles.reporterAvatar} contentFit="cover" />
            ) : (
              <View style={styles.reporterAvatarFallback}>
                <Ionicons name="person" size={14} color="#fff" />
              </View>
            )}
            <Text style={styles.reporterName} numberOfLines={1}>{item.reporter?.name || 'Reporter'}</Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButton} activeOpacity={0.8} disabled={sharing}>
              {sharing ? <ActivityIndicator size="small" color={AppPalette.ink} /> : <Ionicons name="share-social-outline" size={19} color={AppPalette.ink} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSavedNews(item._id)} style={styles.actionButton} activeOpacity={0.8}>
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={isSaved ? Colors.brightOrange : AppPalette.ink} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {shareImageUri && (
        <View pointerEvents="none" style={styles.hiddenShareCapture}>
          <View ref={brandedShareRef} collapsable={false}>
            <BrandedShareImage imageUri={shareImageUri} title={item.title} description={item.description || item.content} titleColor={item.titleColor || '#FACC15'} />
          </View>
        </View>
      )}

      <FullScreenImageViewer visible={previewVisible} media={images} initialIndex={previewIndex} onClose={() => setPreviewVisible(false)} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: AppPalette.border,
    ...Platform.select({
      ios: { shadowColor: AppPalette.deepBlue, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 22 },
      android: { elevation: 4 },
      web: { boxShadow: '0 12px 28px rgba(14,165,233,0.14)' },
    }),
  },
  imageWrap: { position: 'relative', backgroundColor: '#F8FAFC' },
  imageSlide: { width: CARD_WIDTH, backgroundColor: '#F8FAFC' },
  image: { width: '100%', minHeight: 190, backgroundColor: '#F8FAFC' },
  imageDots: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  imageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
  imageDotActive: { width: 20, backgroundColor: AppPalette.brightOrange },
  emptyImage: { height: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: AppPalette.blueSurface },
  breakingBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EF4444' },
  breakingText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  inlineBreakingBadge: { alignSelf: 'flex-start', marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EF4444' },
  mediaBadge: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(15,61,142,0.82)' },
  mediaBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  content: { padding: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  categoryBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  categoryText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: 12, color: AppPalette.muted, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900', color: AppPalette.ink, marginBottom: 8 },
description: {
  fontSize: 14,
  lineHeight: 21,
  color: AppPalette.slate,
  fontWeight: '600',
},
  descriptionWrap: {
  marginBottom: 12,
},

descriptionMoreButton: {
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  marginTop: 6,
},

descriptionMoreText: {
  color: AppPalette.brightOrange,
  fontSize: 13,
  fontWeight: '900',
},
  articleBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: AppPalette.border, borderRadius: 18, padding: 12, marginBottom: 12 },
  articleContent: { color: AppPalette.ink, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  readMoreButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  readMoreText: { color: AppPalette.brightOrange, fontSize: 13, fontWeight: '900' },
  inlineMediaWrap: { marginTop: 2, marginBottom: 12 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: AppPalette.blueSurface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 },
  cityText: { flex: 1, color: AppPalette.deepBlue, fontWeight: '800', fontSize: 12 },
  hashtagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  hashtag: { fontSize: 12, fontWeight: '800', color: AppPalette.deepBlue, backgroundColor: AppPalette.blueSurface, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reporterContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10 },
  reporterAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: AppPalette.border },
  reporterAvatarFallback: { width: 34, height: 34, borderRadius: 17, backgroundColor: AppPalette.brightOrange, alignItems: 'center', justifyContent: 'center' },
  reporterName: { flex: 1, fontSize: 13, fontWeight: '800', color: AppPalette.ink },
  actionsContainer: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppPalette.border },
  hiddenShareCapture: {
    position: 'absolute',
    left: -1200,
    top: 0,
    width: 1080,
    height: 1350,
    opacity: 1,
  },
});
