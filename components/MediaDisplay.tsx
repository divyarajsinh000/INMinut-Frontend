import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, useColorScheme, NativeSyntheticEvent, NativeScrollEvent, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { MediaItem } from '@/api';
import { useState } from 'react';
import FullScreenImageViewer from '@/components/FullScreenImageViewer';
import { getImageMedia, getMediaName, getMediaUrl } from '@/utils/media';

const { width: screenWidth } = Dimensions.get('window');
const MEDIA_WIDTH = Math.max(260, screenWidth - 64);

interface MediaDisplayProps {
  media: MediaItem[];
}

export default function MediaDisplay({ media }: MediaDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const openPdfInApp = async (url: string) => {
    const fullUrl = getMediaUrl(url);
    if (fullUrl) await WebBrowser.openBrowserAsync(fullUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
  };

  const images = getImageMedia(media);
  const otherMedia = media.filter((item) => item.type !== 'image');

  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / MEDIA_WIDTH);
    setCurrentImageIndex(index);
  };

  const openImagePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  return (
    <View style={styles.container}>
      {images.length > 0 && (
        <View style={styles.sliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
          >
            {images.map((item, index) => (
              <View key={`image-${item.url}-${index}`} style={styles.slide}>
                <TouchableOpacity activeOpacity={0.92} onPress={() => openImagePreview(index)}>
                  <Image source={{ uri: getMediaUrl(item.url) }} style={styles.image} contentFit="contain" />
                </TouchableOpacity>
                <View style={styles.mediaOverlayActions}>
                  <TouchableOpacity style={styles.overlayButton} onPress={() => openImagePreview(index)} activeOpacity={0.8}>
                    <Ionicons name="expand-outline" size={18} color={Colors.white} />
                    <Text style={styles.overlayButtonText}>Full screen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    { backgroundColor: isDark ? '#555555' : '#CCCCCC' },
                    index === currentImageIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {otherMedia.map((item, index) => {
        if (item.type === 'video') {
          const url = getMediaUrl(item.url);
          return (
            <View key={`video-${item.url}-${index}`} style={styles.mediaBlock}>
              <TouchableOpacity activeOpacity={0.92} onPress={() => setVideoPreviewUrl(url)}>
                <VideoPlayer url={url} />
              </TouchableOpacity>
              <MediaActions label={getMediaName(item)} onPreview={() => setVideoPreviewUrl(url)} actionLabel="Open in app" icon="play-circle-outline" />
            </View>
          );
        }

        if (item.type === 'pdf') {
          return (
            <View key={`pdf-${item.url}-${index}`} style={styles.mediaBlock}>
              <TouchableOpacity
                style={[styles.pdfContainer, { backgroundColor: isDark ? Colors.dark.background : '#F5F5F5' }]}
                onPress={() => openPdfInApp(item.url)}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text" size={40} color={Colors.brightOrange} />
                <Text style={[styles.pdfText, { color: isDark ? Colors.dark.text : Colors.darkCharcoal }]} numberOfLines={2}>
                  {getMediaName(item)}
                </Text>
              </TouchableOpacity>
              <MediaActions label="PDF file" onPreview={() => openPdfInApp(item.url)} actionLabel="Open in app" icon="document-text-outline" />
            </View>
          );
        }

        return null;
      })}

      <FullScreenImageViewer
        visible={previewVisible}
        media={images}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />

      <VideoPreviewModal url={videoPreviewUrl} onClose={() => setVideoPreviewUrl(null)} />
    </View>
  );
}

function MediaActions({ label, onPreview, actionLabel = 'Open', icon = 'eye-outline' }: { label: string; onPreview: () => void; actionLabel?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.actionRow}>
      <Text style={styles.mediaLabel} numberOfLines={1}>{label}</Text>
      <TouchableOpacity style={styles.actionButton} onPress={onPreview} activeOpacity={0.8}>
        <Ionicons name={icon} size={18} color={Colors.white} />
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function VideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  return (
    <View style={styles.videoContainer}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
      />
      {status === 'error' && (
        <View style={styles.videoFallback}>
          <Ionicons name="play-circle-outline" size={34} color={Colors.white} />
          <Text style={styles.videoFallbackText}>Unable to play preview. Tap Open in app.</Text>
        </View>
      )}
    </View>
  );
}

function VideoPreviewModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  if (!url) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.videoModalOverlay}>
        <TouchableOpacity style={styles.videoModalClose} onPress={onClose} activeOpacity={0.85}>
          <Ionicons name="close" size={26} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.videoModalPlayerWrap}>
          <VideoPlayer url={url} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    gap: 16,
  },
  sliderContainer: {
    position: 'relative',
  },
  slide: {
    width: MEDIA_WIDTH,
    position: 'relative',
  },
  image: {
    width: MEDIA_WIDTH,
    height: Math.min(340, Math.max(240, Math.round(MEDIA_WIDTH * 0.82))),
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  mediaOverlayActions: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  overlayButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paginationDotActive: {
    backgroundColor: Colors.brightOrange,
    width: 20,
  },
  mediaBlock: {
    gap: 10,
  },
  videoContainer: {
    width: MEDIA_WIDTH,
    height: Math.min(320, Math.max(220, Math.round(MEDIA_WIDTH * 0.72))),
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoFallbackText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  pdfContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  pdfText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaLabel: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brightOrange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  videoModalClose: {
    position: 'absolute',
    top: 48,
    right: 18,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalPlayerWrap: {
    width: '100%',
    alignItems: 'center',
  },
});
