import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState, useEffect } from "react";
import { AppPalette, Colors } from "@/constants/theme";
import { MediaItem, NewsItem } from "@/api";
import { formatDate } from "@/utils";
import { useAppStore } from "@/store";
import RenderHTML from "react-native-render-html";
import FullScreenImageViewer from "@/components/FullScreenImageViewer";
import MediaDisplay from "@/components/MediaDisplay";
import { shareNewsDirect } from "@/utils/share";
import { getImageMedia, getMediaUrl } from "@/utils/media";
import { captureRef } from "react-native-view-shot";
let Share: any;
if (Platform.OS !== "web") {
  Share = require("react-native-share").default || require("react-native-share");
}
import BrandedShareImage from "@/components/BrandedShareImage";
import { useColorScheme } from "@/hooks/use-color-scheme";

const CARD_WIDTH = Dimensions.get("window").width - 32;
const DEFAULT_TITLE_FONT_SIZE = 20;
const DEFAULT_DESCRIPTION_FONT_SIZE = 14;

// Replace this example URL with the real INMinut Play Store URL when available.
const PLAY_STORE_LINK =
  "https://play.google.com/store/apps/details?id=com.news.brekingapp";

interface NewsCardProps {
  item: NewsItem;
  onMediaLayout?: (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onActionsLayout?: (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}

const normalizeFontSize = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const normalizeHexColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^#([0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/i.test(color)
    ? color
    : fallback;
};

const normalizeExternalUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export default function NewsCard({
  item,
  onMediaLayout,
  onActionsLayout,
}: NewsCardProps) {
  const { savedNews, toggleSavedNews, likedNews, toggleLikedNews, trackNewsShare, settings } = useAppStore();
  const mediaRef = useRef<View>(null);
  const actionsRef = useRef<View>(null);

  const handleMediaLayout = () => {
    if (onMediaLayout) {
      setTimeout(() => {
        mediaRef.current?.measureInWindow((x, y, width, height) => {
          if (width > 0) {
            onMediaLayout({ x, y, width, height });
          }
        });
      }, 350);
    }
  };

  const handleActionsLayout = () => {
    if (onActionsLayout) {
      setTimeout(() => {
        actionsRef.current?.measureInWindow((x, y, width, height) => {
          if (width > 0) {
            onActionsLayout({ x, y, width, height });
          }
        });
      }, 350);
    }
  };
  const isSaved = savedNews.includes(item._id);
  const isLiked = likedNews.includes(item._id);
  const images = getImageMedia(item.media || []);
  const nonImageMedia = (item.media || []).filter(
    (m) => !!m.url && m.type !== "image",
  );
  const hasAnyMedia = images.length > 0 || nonImageMedia.length > 0;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [whatsappSharing, setWhatsappSharing] = useState(false);
  const [shareImageUri, setShareImageUri] = useState<string | null>(null);
  const brandedShareRef = useRef<View>(null);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [renderedLines, setRenderedLines] = useState<any[]>([]);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setRenderedLines([]);
    setDescriptionExpanded(false);
  }, [item._id]);

  useEffect(() => {
    if (item.isBreaking && item.isBreakingBlink) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      blinkAnim.setValue(1);
    }
  }, [item.isBreaking, item.isBreakingBlink]);

  const handleTextLayout = (e: any) => {
    if (renderedLines.length === 0) {
      setRenderedLines(e.nativeEvent.lines);
    }
  };

  const stripHtml = (html: string) => {
    return (html || "").replace(/<[^>]*>?/gm, "");
  };
  const plainDescription = stripHtml(item.description || "");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const shouldShowDescriptionMore = renderedLines.length > 5;
  const titleColor = isDark
    ? "#FFFFFF"
    : normalizeHexColor(item.titleColor, AppPalette.navyBlue);
  const titleFontSize = normalizeFontSize(
    item.titleFontSize,
    DEFAULT_TITLE_FONT_SIZE,
    14,
    34,
  );
  const descriptionFontSize = normalizeFontSize(
    item.descriptionFontSize,
    DEFAULT_DESCRIPTION_FONT_SIZE,
    12,
    28,
  );
  const breakingLabel = item.breakingText?.trim() || "Breaking";
  const hasOnlyMedia = !item.title?.trim() && !plainDescription.trim();
  const hashtags = item.hashtags || [];
  const titleLink = normalizeExternalUrl(item.titleLink || item.title_link);

  const handleOpenTitleLink = async () => {
    if (!titleLink) return;

    try {
      const supported = await Linking.canOpenURL(titleLink);
      if (!supported) {
        Alert.alert(
          "Unable to open link",
          "This news title link is not supported on this device.",
        );
        return;
      }
      await Linking.openURL(titleLink);
    } catch (error) {
      console.error("Open title link failed:", error);
      Alert.alert("Unable to open link", "Please try again later.");
    }
  };

  const displayText = (() => {
    if (descriptionExpanded || renderedLines.length <= 5) {
      return plainDescription;
    }
    const lineTexts = renderedLines.slice(0, 4).map((l) => l.text);
    const fifthLineText = renderedLines[4].text;
    const truncatedFifth = fifthLineText.substring(
      0,
      Math.max(0, fifthLineText.length - 22),
    );
    return lineTexts.join("") + truncatedFifth;
  })();

  const getImageHeight = (media?: MediaItem) => {
    const url = media?.url || "";
    const ratio = imageRatios[url] || 1.35;
    const rawHeight = CARD_WIDTH / Math.max(ratio, 0.45);
    const minHeight = hasOnlyMedia ? 260 : 190;
    const maxHeight = hasOnlyMedia ? 620 : 520;
    return Math.round(Math.min(maxHeight, Math.max(minHeight, rawHeight)));
  };

  const handleImageLoad = (media: MediaItem, event: any) => {
    const width =
      event?.source?.width ||
      event?.nativeEvent?.source?.width ||
      event?.nativeEvent?.width;
    const height =
      event?.source?.height ||
      event?.nativeEvent?.source?.height ||
      event?.nativeEvent?.height;
    if (!media.url || !width || !height) return;

    const ratio = Number(width) / Number(height);
    if (!Number.isFinite(ratio) || ratio <= 0) return;

    setImageRatios((prev) => {
      if (Math.abs((prev[media.url] || 0) - ratio) < 0.01) return prev;
      return { ...prev, [media.url]: ratio };
    });
  };

  const shareFirstImageAsBrandedPng = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Share", "Image sharing is not supported on web preview.");
      return;
    }
    const hasImage = images.length > 0;
    const firstImageUrl = hasImage
      ? getMediaUrl(images[0]?.url)
      : settings?.defaultShareImage
        ? getMediaUrl(settings.defaultShareImage)
        : "breaking_placeholder";
    if (!firstImageUrl)
      return shareNewsDirect({
        title: item.title,
        description: item.description,
        content: item.content,
        media: item.media || [],
        hashtags: item.hashtags || [],
        cities: item.cities || [],
        publishedDate: item.publishedDate,
      });

    setShareImageUri(firstImageUrl);

    await new Promise<void>((resolve) => setTimeout(resolve, 250));

    const capturedUri = await captureRef(brandedShareRef, {
      format: "jpg",
      quality: 0.95,
      result: "tmpfile",
      width: 1080,
    });

    const imageUrl = capturedUri.startsWith("file://")
      ? capturedUri
      : `file://${capturedUri}`;

    return Share.open({
      url: imageUrl,
      type: "image/jpeg",
      message: PLAY_STORE_LINK,
      title: item.title || "Share INMinut news",
      failOnCancel: false,
    });
  };

  const buildWhatsAppMessage = () => PLAY_STORE_LINK;

  const handleWhatsAppShare = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Share", "WhatsApp sharing is not supported on web preview.");
      return;
    }
    if (sharing || whatsappSharing) return;

    try {
      setWhatsappSharing(true);

      const firstImageUrl =
        images.length > 0
          ? getMediaUrl(images[0]?.url)
          : "breaking_placeholder";

      setShareImageUri(firstImageUrl);

      // Wait for the hidden branded card and its image to render before capture.
      await new Promise<void>((resolve) => setTimeout(resolve, 450));

      if (!brandedShareRef.current) {
        throw new Error("Branded share image is not ready.");
      }

      const capturedUri = await captureRef(brandedShareRef, {
        format: "jpg",
        quality: 0.95,
        result: "tmpfile",
        width: 1080,
      });

      const imageUrl = capturedUri.startsWith("file://")
        ? capturedUri
        : `file://${capturedUri}`;

      const message = buildWhatsAppMessage();

      await Share.shareSingle({
        social: Share.Social.WHATSAPP,
        url: imageUrl,
        type: "image/jpeg",
        message: message || item.title || "Shared from INMinut",
        failOnCancel: false,
      });

      await trackNewsShare(item._id);
    } catch (error: any) {
      console.error("WhatsApp image share failed:", error);

      const errorText = String(error?.message || error || "").toLowerCase();
      const isCancelled =
        errorText.includes("cancel") || errorText.includes("dismiss");

      if (!isCancelled) {
        const whatsappUnavailable =
          errorText.includes("not installed") ||
          errorText.includes("package") ||
          errorText.includes("whatsapp");

        Alert.alert(
          whatsappUnavailable ? "WhatsApp unavailable" : "Share failed",
          whatsappUnavailable
            ? "Please install WhatsApp and try again."
            : "Unable to share this branded image to WhatsApp. Please try again.",
        );
      }
    } finally {
      setShareImageUri(null);
      setWhatsappSharing(false);
    }
  };

  const handleShare = async () => {
    if (sharing || whatsappSharing) return;

    try {
      setSharing(true);
      const hasPdf = (item.media || []).some(
        (media) => media.type === "pdf" && !!media.url,
      );
      const hasVideo = (item.media || []).some(
        (media) => media.type === "video" && !!media.url,
      );
      const shared =
        !hasPdf && !hasVideo
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
      console.error("Share news failed:", error);
      Alert.alert(
        "Share failed",
        "Unable to share this news right now. Please try again.",
      );
    } finally {
      setShareImageUri(null);
      setSharing(false);
    }
  };

  const handleImageScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(
      event.nativeEvent.contentOffset.x / Math.max(width, 1),
    );
    setActiveImageIndex(index);
  };

  const openImagePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  return (
    <View
      style={[
        styles.container,
        isDark && { backgroundColor: "#1E293B", borderColor: "#334155" },
      ]}
    >
      {images.length > 0 ? (
        <View
          ref={mediaRef}
          onLayout={handleMediaLayout}
          style={styles.imageWrap}
        >
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
            <Animated.View
              style={[
                styles.breakingBadge,
                {
                  backgroundColor: item.breakingBgColor || "#EF4444",
                  opacity: blinkAnim,
                },
              ]}
            >
              <Ionicons
                name="flash"
                size={13}
                color={item.breakingTextColor || "#FFFFFF"}
              />
              <Text
                style={[
                  styles.breakingText,
                  { color: item.breakingTextColor || "#FFFFFF" },
                ]}
              >
                {breakingLabel}
              </Text>
            </Animated.View>
          )}



          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, index) => (
                <Pressable
                  key={index}
                  onPress={() => setActiveImageIndex(index)}
                  style={[
                    styles.imageDot,
                    index === activeImageIndex && styles.imageDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      ) : !hasAnyMedia ? null : // <View style={styles.emptyImage}>
      //   <Ionicons name="newspaper-outline" size={42} color={AppPalette.brightOrange} />
      //   {item.isBreaking && (
      //     <View style={styles.breakingBadge}>
      //       <Ionicons name="flash" size={13} color="#fff" />
      //       <Text style={styles.breakingText}>{breakingLabel}</Text>
      //     </View>
      //   )}
      // </View>
      null}

      <View style={styles.content}>
        <View style={styles.metaHeader}>
          <View style={styles.categoryCityWrap}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor:
                    item.category?.backgroundColor || Colors.brightOrange,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: item.category?.textColor || Colors.white },
                ]}
              >
                {item.category?.name || "News"}
              </Text>
            </View>

            {!!item.cities?.length && (
              <View style={styles.cityChipsWrap}>
                {(item.cities || []).map((city) => (
                  <View
                    key={city._id || city.name}
                    style={[
                      styles.cityChip,
                      isDark && {
                        backgroundColor: "#111111",
                        borderColor: "#334155",
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={AppPalette.brightOrange}
                    />
                    <Text
                      style={[
                        styles.cityChipText,
                        isDark && { color: "#CBD5E1" },
                      ]}
                    >
                      {city.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {!!item.publishedDate && (
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={isDark ? "#94A3B8" : AppPalette.muted}
              />
              <Text style={[styles.date, isDark && { color: "#94A3B8" }]}>
                {formatDate(item.publishedDate)}
              </Text>
            </View>
          )}
        </View>

        {item.isBreaking && images.length === 0 && (
          <Animated.View
            style={[
              styles.inlineBreakingBadge,
              {
                backgroundColor: item.breakingBgColor || "#EF4444",
                opacity: blinkAnim,
              },
            ]}
          >
            <Ionicons
              name="flash"
              size={13}
              color={item.breakingTextColor || "#FFFFFF"}
            />
            <Text
              style={[
                styles.breakingText,
                { color: item.breakingTextColor || "#FFFFFF" },
              ]}
            >
              {breakingLabel}
            </Text>
          </Animated.View>
        )}

        {!!item.title &&
          (titleLink ? (
            <Pressable
              onPress={handleOpenTitleLink}
              style={styles.titleLinkButton}
              hitSlop={6}
            >
              <Text
                style={[
                  styles.title,
                  styles.clickableTitle,
                  {
                    color: titleColor,
                    fontSize: titleFontSize,
                    lineHeight: Math.round(titleFontSize * 1.28),
                  },
                ]}
              >
                {item.title}
                <Text style={styles.titleLinkIcon}> ↗</Text>
              </Text>
            </Pressable>
          ) : (
            <Text
              style={[
                styles.title,
                {
                  color: titleColor,
                  fontSize: titleFontSize,
                  lineHeight: Math.round(titleFontSize * 1.28),
                },
              ]}
            >
              {item.title}
            </Text>
          ))}
        {!!item.description && (
          <View style={styles.descriptionWrap}>
            {descriptionExpanded ? (
              <>
                <RenderHTML
                  contentWidth={CARD_WIDTH}
                  source={{ html: item.description }}
                  tagsStyles={{
                    body: {
                      color: isDark ? "#FFFFFF" : AppPalette.slate,
                      fontSize: descriptionFontSize,
                      lineHeight: Math.round(descriptionFontSize * 1.45),
                      fontWeight: "600",
                    },
                    p: {
                      color: isDark ? "#FFFFFF" : AppPalette.slate,
                      fontSize: descriptionFontSize,
                      lineHeight: Math.round(descriptionFontSize * 1.45),
                      fontWeight: "600",
                      marginTop: 0,
                      marginBottom: 4,
                    },
                  }}
                />
                <TouchableOpacity
                  onPress={() => setDescriptionExpanded(false)}
                  style={styles.descriptionMoreButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.descriptionMoreText}>Read less</Text>
                  <Ionicons
                    name="chevron-up"
                    size={15}
                    color={AppPalette.brightOrange}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <Pressable
                onPress={() =>
                  renderedLines.length > 5 && setDescriptionExpanded(true)
                }
              >
                <Text
                  style={[
                    styles.description,
                    {
                      fontSize: descriptionFontSize,
                      lineHeight: Math.round(descriptionFontSize * 1.45),
                    },
                    isDark && { color: "#FFFFFF" },
                  ]}
                  onTextLayout={handleTextLayout}
                >
                  {displayText}
                  {renderedLines.length > 5 && (
                    <Text style={styles.inlineReadMore}> ... Read more</Text>
                  )}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {!!nonImageMedia.length && (
          <View style={styles.inlineMediaWrap}>
            <MediaDisplay media={nonImageMedia} />
          </View>
        )}

        {hashtags.length > 0 && (
          <View style={styles.hashtagsContainer}>
            {hashtags
              .slice(0, descriptionExpanded ? hashtags.length : 3)
              .map((tag, index) => (
                <Text key={index} style={styles.hashtag}>
                  #{tag}
                </Text>
              ))}
          </View>
        )}

        <View style={styles.footer}>
          {!item.hideReporter && !!(item.reporter?.name?.trim() || item.reporter?.avatar?.trim()) && (
            <View style={styles.reporterContainer}>
              {!!item.reporter?.avatar?.trim() && (
                <Image
                  source={{ uri: getMediaUrl(item.reporter.avatar) }}
                  style={styles.reporterAvatar}
                  contentFit="cover"
                />
              )}
              {!!item.reporter?.name?.trim() && (
                <Text
                  style={[styles.reporterName, isDark && { color: "#F8FAFC" }]}
                  numberOfLines={1}
                >
                  {item.reporter.name}
                </Text>
              )}
            </View>
          )}

          <View
            ref={actionsRef}
            onLayout={handleActionsLayout}
            style={styles.actionsContainer}
          >
            <TouchableOpacity
              onPress={handleWhatsAppShare}
              style={[styles.actionButton, styles.whatsappButton]}
              activeOpacity={0.8}
              disabled={sharing || whatsappSharing}
              accessibilityRole="button"
              accessibilityLabel="Share on WhatsApp"
            >
              {whatsappSharing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="logo-whatsapp" size={21} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={[
                styles.actionButton,
                isDark && {
                  backgroundColor: "#334155",
                  borderColor: "#475569",
                },
              ]}
              activeOpacity={0.8}
              disabled={sharing || whatsappSharing}
              accessibilityRole="button"
              accessibilityLabel="Share news"
            >
              {sharing ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#F8FAFC" : AppPalette.ink}
                />
              ) : (
                <Ionicons
                  name="share-social-outline"
                  size={19}
                  color={isDark ? "#F8FAFC" : AppPalette.ink}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleSavedNews(item._id)}
              style={[
                styles.actionButton,
                isDark && {
                  backgroundColor: "#334155",
                  borderColor: "#475569",
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={19}
                color={
                  isSaved
                    ? Colors.brightOrange
                    : isDark
                      ? "#F8FAFC"
                      : AppPalette.ink
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleLikedNews(item._id)}
              style={[
                styles.actionButton,
                isDark && {
                  backgroundColor: "#334155",
                  borderColor: "#475569",
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={19}
                color={
                  isLiked
                    ? "#EF4444" // red color for like
                    : isDark
                      ? "#F8FAFC"
                      : AppPalette.ink
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {shareImageUri && (
        <View pointerEvents="none" style={styles.hiddenShareCapture}>
          <View
            ref={brandedShareRef}
            collapsable={false}
            style={{ alignSelf: "flex-start" }}
          >
            <BrandedShareImage
              imageUri={shareImageUri}
              imageHeight={
                shareImageUri === "breaking_placeholder"
                  ? 850
                  : shareImageUri === getMediaUrl(settings?.defaultShareImage || "")
                    ? 850
                    : Math.round(972 / (imageRatios[images[0]?.url] || 1.35))
              }
              title={item.title}
              description={plainDescription}
              titleColor={item.titleColor || "#111111"}
              publishedDate={item.publishedDate}
              reporterName={item.reporter?.name}
              isBreaking={item.isBreaking}
              breakingText={item.breakingText}
              breakingTextColor={item.breakingTextColor}
              logoUrl={settings?.appLogo ? getMediaUrl(settings.appLogo) : undefined}
            />
          </View>
        </View>
      )}

      <FullScreenImageViewer
        visible={previewVisible}
        media={images}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: AppPalette.border,
    ...Platform.select({
      ios: {
        shadowColor: AppPalette.deepBlue,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 22,
      },
      android: { elevation: 4 },
      web: { boxShadow: "0 12px 28px rgba(14,165,233,0.14)" },
    }),
  },
  imageWrap: { position: "relative", backgroundColor: "#F8FAFC" },
  imageSlide: { width: CARD_WIDTH - 2, backgroundColor: "#F8FAFC" },
  image: { width: "100%", minHeight: 190, backgroundColor: "#F8FAFC" },
  imageDots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  imageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  imageDotActive: { width: 20, backgroundColor: AppPalette.brightOrange },
  emptyImage: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppPalette.blueSurface,
  },
  breakingBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopLeftRadius: 23,
    borderBottomRightRadius: 18,
    backgroundColor: "#EF4444",
  },
  breakingText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  inlineBreakingBadge: {
    alignSelf: "flex-start",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
    backgroundColor: "#EF4444",
  },
  mediaBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,61,142,0.82)",
  },
  mediaBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  content: { padding: 16 },
  metaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  categoryCityWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    paddingRight: 4,
  },
  categoryBadge: {
    flexShrink: 0,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryText: { fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  cityChipsWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  cityChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: AppPalette.blueSurface,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cityChipText: {
    flexShrink: 1,
    color: AppPalette.deepBlue,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  dateRow: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
  },
  date: { fontSize: 12, color: AppPalette.muted, fontWeight: "700" },
  titleLinkButton: { alignSelf: "stretch" },
  title: {
    fontFamily: "HindVadodara_700Bold",
    fontSize: 20,
    lineHeight: 26,
    color: AppPalette.ink,
    marginBottom: 8,
  },
  clickableTitle: {},
  titleLinkIcon: { color: AppPalette.brightOrange, fontWeight: "900" },
  description: {
    fontFamily: "HindVadodara_600SemiBold",
    fontSize: 14,
    lineHeight: 21,
    color: AppPalette.slate,
  },
  descriptionWrap: {
    marginBottom: 12,
  },

  descriptionMoreButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },

  descriptionMoreText: {
    color: AppPalette.brightOrange,
    fontSize: 13,
    fontWeight: "900",
  },
  inlineReadMore: {
    color: AppPalette.brightOrange,
    fontWeight: "900",
  },
  articleBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  articleContent: {
    fontFamily: "HindVadodara_500Medium",
    color: AppPalette.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  readMoreButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  readMoreText: {
    color: AppPalette.brightOrange,
    fontSize: 13,
    fontWeight: "900",
  },
  inlineMediaWrap: { marginTop: 2, marginBottom: 12 },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: AppPalette.blueSurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  cityText: {
    flex: 1,
    color: AppPalette.deepBlue,
    fontWeight: "800",
    fontSize: 12,
  },
  hashtagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  hashtag: {
    fontSize: 12,
    fontWeight: "800",
    color: AppPalette.deepBlue,
    backgroundColor: AppPalette.blueSurface,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reporterContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 10,
  },
  reporterAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppPalette.border,
  },
  reporterAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppPalette.brightOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  reporterName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: AppPalette.ink,
  },
  actionsContainer: { flexDirection: "row", gap: 8, marginLeft: "auto" },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppPalette.border,
  },
  whatsappButton: { backgroundColor: "#25D366", borderColor: "#25D366" },
  hiddenShareCapture: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1080,
    opacity: 0,
  },
});
