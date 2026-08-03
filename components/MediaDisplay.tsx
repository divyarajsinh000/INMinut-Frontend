import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ScrollView,
  useColorScheme,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import Pdf from "react-native-pdf";
import ReactNativeBlobUtil from "react-native-blob-util";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { MediaItem } from "@/api";
import { useEffect, useState } from "react";
import FullScreenImageViewer from "@/components/FullScreenImageViewer";
import {
  getImageMedia,
  getMediaName,
  getMediaUrl,
} from "@/utils/media";

const { width: screenWidth } = Dimensions.get("window");
const MEDIA_WIDTH = Math.max(260, screenWidth - 64);

interface MediaDisplayProps {
  media: MediaItem[];
}

export default function MediaDisplay({ media }: MediaDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const images = getImageMedia(media);
  const otherMedia = media.filter((item) => item.type !== "image");

  const handleImageScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / MEDIA_WIDTH,
    );
    setCurrentImageIndex(index);
  };

  const openImagePreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  const openPdfInApp = (item: MediaItem) => {
    const fullUrl = getMediaUrl(item.url);
    if (!fullUrl) return;

    setPdfPreview({
      url: fullUrl,
      title: getMediaName(item) || "PDF Preview",
    });
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
              <View
                key={`image-${item.url}-${index}`}
                style={styles.slide}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => openImagePreview(index)}
                >
                  <Image
                    source={{ uri: getMediaUrl(item.url) }}
                    style={styles.image}
                    contentFit="contain"
                  />
                </TouchableOpacity>

                <View style={styles.mediaOverlayActions}>
                  <TouchableOpacity
                    style={styles.overlayButton}
                    onPress={() => openImagePreview(index)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="expand-outline"
                      size={18}
                      color={Colors.white}
                    />
                    <Text style={styles.overlayButtonText}>
                      Full screen
                    </Text>
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
                    {
                      backgroundColor: isDark
                        ? "#555555"
                        : "#CCCCCC",
                    },
                    index === currentImageIndex &&
                      styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {otherMedia.map((item, index) => {
        if (item.type === "video") {
          const url = getMediaUrl(item.url);

          return (
            <View
              key={`video-${item.url}-${index}`}
              style={styles.mediaBlock}
            >
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => setVideoPreviewUrl(url)}
              >
                <VideoPlayer url={url} isPreview />
              </TouchableOpacity>
            </View>
          );
        }

        if (item.type === "pdf") {
          return (
            <View
              key={`pdf-${item.url}-${index}`}
              style={styles.mediaBlock}
            >
              <TouchableOpacity
                style={[
                  styles.pdfContainer,
                  {
                    backgroundColor: isDark
                      ? Colors.dark.background
                      : "#F5F5F5",
                  },
                ]}
                onPress={() => openPdfInApp(item)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="document-text"
                  size={40}
                  color={Colors.brightOrange}
                />

                <View style={styles.pdfTextWrap}>
                  <Text
                    style={[
                      styles.pdfText,
                      {
                        color: isDark
                          ? Colors.dark.text
                          : Colors.darkCharcoal,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {getMediaName(item)}
                  </Text>

                  <Text style={styles.pdfHelperText}>
                    Tap to preview inside app
                  </Text>
                </View>

                <Ionicons
                  name="expand-outline"
                  size={22}
                  color={Colors.brightOrange}
                />
              </TouchableOpacity>
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

      <VideoPreviewModal
        url={videoPreviewUrl}
        onClose={() => setVideoPreviewUrl(null)}
      />

      <PdfPreviewModal
        preview={pdfPreview}
        isDark={isDark}
        onClose={() => setPdfPreview(null)}
      />
    </View>
  );
}

function VideoPlayer({
  url,
  isPreview = false,
}: {
  url: string;
  isPreview?: boolean;
}) {
  const player = useVideoPlayer(url);
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });

  return (
    <View
      style={styles.videoContainer}
      pointerEvents={isPreview ? "none" : "auto"}
    >
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={!isPreview}
        allowsFullscreen={!isPreview}
        allowsPictureInPicture={!isPreview}
        contentFit="contain"
      />

      {status === "error" && (
        <View style={styles.videoFallback}>
          <Ionicons
            name="play-circle-outline"
            size={34}
            color={Colors.white}
          />
          <Text style={styles.videoFallbackText}>
            Unable to play video.
          </Text>
        </View>
      )}
    </View>
  );
}

function VideoPreviewModal({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  if (!url) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.videoModalOverlay}>
        <TouchableOpacity
          style={styles.videoModalClose}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={26} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.videoModalPlayerWrap}>
          <VideoPlayer url={url} />
        </View>
      </View>
    </Modal>
  );
}

function PdfPreviewModal({
  preview,
  isDark,
  onClose,
}: {
  preview: { url: string; title: string } | null;
  isDark: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [pageInfo, setPageInfo] = useState({ page: 1, total: 0 });
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;

    let cancelled = false;
    let downloadedPath: string | null = null;

    const preparePdf = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrorMessage("");
      setLocalPdfUri(null);
      setPageInfo({ page: 1, total: 0 });

      try {
        const response = await ReactNativeBlobUtil.config({
          fileCache: true,
          appendExt: "pdf",
        }).fetch("GET", preview.url, {
          Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
        });

        downloadedPath = response.path();
        const info = response.info();
        const status = Number(info.status || 0);
        const headers = info.headers || {};
        const contentType = String(
          headers["Content-Type"] ||
            headers["content-type"] ||
            "",
        ).toLowerCase();

        if (status < 200 || status >= 300) {
          throw new Error(
            `Server returned HTTP ${status}. Check the PDF media URL and backend route.`,
          );
        }

        const fileStat = await ReactNativeBlobUtil.fs.stat(downloadedPath);
        const fileSize = Number(fileStat.size || 0);

        if (fileSize < 5) {
          throw new Error("The server returned an empty PDF file.");
        }

        // Validate the actual file signature instead of trusting the .pdf URL.
        // A real PDF starts with the bytes: %PDF-
        const signaturePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/inminut-pdf-signature-${Date.now()}.bin`;
        await ReactNativeBlobUtil.fs.slice(
          downloadedPath,
          signaturePath,
          0,
          Math.min(8, fileSize),
        );
        const signatureBase64 = await ReactNativeBlobUtil.fs.readFile(
          signaturePath,
          "base64",
        );
        await ReactNativeBlobUtil.fs.unlink(signaturePath).catch(() => undefined);

        const isPdfSignature = signatureBase64.startsWith("JVBERi0");

        if (!isPdfSignature) {
          const typeHint = contentType
            ? ` Content-Type received: ${contentType}.`
            : "";
          throw new Error(
            `The URL did not return PDF data.${typeHint} It may be returning HTML, JSON, a login page, or a 404 response.`,
          );
        }

        if (cancelled) {
          await ReactNativeBlobUtil.fs.unlink(downloadedPath).catch(() => undefined);
          return;
        }

        setLocalPdfUri(`file://${downloadedPath}`);
      } catch (error: any) {
        console.error("PDF download/validation failed:", error);

        if (downloadedPath) {
          await ReactNativeBlobUtil.fs.unlink(downloadedPath).catch(() => undefined);
        }

        if (!cancelled) {
          setLoading(false);
          setLoadFailed(true);
          setErrorMessage(
            error?.message || "Unable to download a valid PDF file.",
          );
        }
      }
    };

    preparePdf();

    return () => {
      cancelled = true;
      if (downloadedPath) {
        ReactNativeBlobUtil.fs.unlink(downloadedPath).catch(() => undefined);
      }
    };
  }, [preview?.url, reloadKey]);

  if (!preview) return null;

  const retry = () => {
    setReloadKey((value) => value + 1);
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView
        style={[
          styles.pdfScreen,
          { backgroundColor: isDark ? "#111111" : "#FFFFFF" },
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.brightOrange}
        />

        <View style={styles.pdfHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.pdfBackButton}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={23} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.pdfHeaderCenter}>
            <Text style={styles.pdfHeaderTitle} numberOfLines={1}>
              {preview.title || "PDF Preview"}
            </Text>
            {pageInfo.total > 0 && (
              <Text style={styles.pdfPageText}>
                Page {pageInfo.page} of {pageInfo.total}
              </Text>
            )}
          </View>

          <View style={styles.pdfHeaderSpacer} />
        </View>

        <View
          style={[
            styles.pdfViewer,
            { backgroundColor: isDark ? "#111111" : "#E5E7EB" },
          ]}
        >
          {loadFailed ? (
            <View style={styles.pdfErrorWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={54}
                color="#94A3B8"
              />
              <Text
                style={[
                  styles.pdfErrorTitle,
                  { color: isDark ? "#F8FAFC" : "#111827" },
                ]}
              >
                Unable to preview this PDF
              </Text>
              <Text style={styles.pdfErrorText}>{errorMessage}</Text>

              <Text style={styles.pdfLocalHint}>
                For local development, do not use localhost or 127.0.0.1 in the
                media URL on a physical phone. Use your computer LAN IP, for
                example http://192.168.1.10:PORT/media/file.pdf.
              </Text>

              <TouchableOpacity
                onPress={retry}
                style={styles.pdfRetryButton}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={Colors.white}
                />
                <Text style={styles.pdfRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {!!localPdfUri && (
                <Pdf
                  key={`${localPdfUri}-${reloadKey}`}
                  source={{ uri: localPdfUri, cache: false }}
                  style={styles.pdfNativeView}
                  trustAllCerts={false}
                  enablePaging={false}
                  horizontal={false}
                  spacing={8}
                  fitPolicy={0}
                  minScale={1}
                  maxScale={4}
                  onLoadComplete={(numberOfPages) => {
                    setLoading(false);
                    setPageInfo({ page: 1, total: numberOfPages });
                  }}
                  onPageChanged={(page, numberOfPages) => {
                    setPageInfo({ page, total: numberOfPages });
                  }}
                  onError={(error) => {
                    console.error("PDF render failed:", error);
                    setLoading(false);
                    setLoadFailed(true);
                    setErrorMessage(
                      "The file was downloaded as a PDF, but the native PDF renderer could not open it.",
                    );
                  }}
                />
              )}

              {loading && (
                <View
                  style={[
                    styles.pdfLoadingOverlay,
                    { backgroundColor: isDark ? "#111111" : "#FFFFFF" },
                  ]}
                >
                  <ActivityIndicator
                    size="large"
                    color={Colors.brightOrange}
                  />
                  <Text style={styles.pdfLoadingText}>
                    Downloading and validating PDF...
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    gap: 16,
  },
  sliderContainer: {
    position: "relative",
  },
  slide: {
    width: MEDIA_WIDTH,
    position: "relative",
  },
  image: {
    width: MEDIA_WIDTH,
    height: Math.min(
      340,
      Math.max(240, Math.round(MEDIA_WIDTH * 0.82)),
    ),
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
  },
  mediaOverlayActions: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    gap: 8,
  },
  overlayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  overlayButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
    height: Math.min(
      320,
      Math.max(220, Math.round(MEDIA_WIDTH * 0.72)),
    ),
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  videoFallbackText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  pdfContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  pdfTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  pdfText: {
    fontSize: 14,
    fontWeight: "800",
  },
  pdfHelperText: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  videoModalClose: {
    position: "absolute",
    top: 48,
    right: 18,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoModalPlayerWrap: {
    width: "100%",
    alignItems: "center",
  },
  pdfScreen: {
    flex: 1,
  },
  pdfHeader: {
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.brightOrange,
  },
  pdfBackButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfHeaderCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  pdfHeaderTitle: {
    width: "100%",
    minWidth: 0,
    paddingHorizontal: 10,
    color: Colors.white,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  pdfHeaderSpacer: {
    width: 40,
    height: 40,
  },
  pdfViewer: {
    flex: 1,
  },
  pdfNativeView: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
  pdfPageText: {
    marginTop: 1,
    color: "rgba(255,255,255,0.84)",
    fontSize: 10.5,
    fontWeight: "700",
  },
  pdfLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfLoadingText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  pdfErrorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  pdfErrorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  pdfErrorText: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
  },
  pdfLocalHint: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: "center",
  },
  pdfRetryButton: {
    minHeight: 44,
    marginTop: 18,
    borderRadius: 11,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Colors.brightOrange,
  },
  pdfRetryText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
