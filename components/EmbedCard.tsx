import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { EmbedItem } from "@/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useMemo, useRef } from "react";
import { useAppStore } from "@/store";

interface EmbedCardProps {
  item: EmbedItem;
}

const normalizeProtocolUrl = (value: string) => {
  const trimmed = String(value || "")
    .replace(/&amp;/g, "&")
    .trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return "";
};

const isShareableContentUrl = (value: string) => {
  if (!value) return false;

  const normalized = value.toLowerCase();

  // Never share JavaScript, CSS, tracking or embed loader files.
  if (
    normalized.endsWith(".js") ||
    normalized.includes("/embed.js") ||
    normalized.endsWith(".css") ||
    normalized.startsWith("javascript:")
  ) {
    return false;
  }

  return /^https?:\/\//i.test(value);
};

const extractAttributeValue = (
  html: string,
  attributeName: string,
): string => {
  const escapedName = attributeName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const match = html.match(
    new RegExp(
      `${escapedName}\\s*=\\s*["']([^"']+)["']`,
      "i",
    ),
  );

  return match?.[1] || "";
};

const extractEmbedShareUrl = (embedCode: string) => {
  const source = String(embedCode || "");

  /*
   * Instagram embeds include the real post/reel URL in
   * data-instgrm-permalink. This must be checked before script src,
   * otherwise //www.instagram.com/embed.js can be selected.
   */
  const instagramPermalink = normalizeProtocolUrl(
    extractAttributeValue(source, "data-instgrm-permalink"),
  );

  if (isShareableContentUrl(instagramPermalink)) {
    return instagramPermalink;
  }

  // Prefer Instagram post/reel links from anchor tags.
  const hrefMatches = Array.from(
    source.matchAll(/href\s*=\s*["']([^"']+)["']/gi),
  );

  for (const match of hrefMatches) {
    const candidate = normalizeProtocolUrl(match[1]);

    if (
      isShareableContentUrl(candidate) &&
      /instagram\.com\/(reel|p|tv)\//i.test(candidate)
    ) {
      return candidate;
    }
  }

  // Then use iframe content URLs such as YouTube embeds.
  const iframeMatch = source.match(
    /<iframe[^>]+src\s*=\s*["']([^"']+)["']/i,
  );
  const iframeUrl = normalizeProtocolUrl(iframeMatch?.[1] || "");

  if (isShareableContentUrl(iframeUrl)) {
    return iframeUrl;
  }

  // Then use any normal link, but never script/CSS loader URLs.
  for (const match of hrefMatches) {
    const candidate = normalizeProtocolUrl(match[1]);

    if (isShareableContentUrl(candidate)) {
      return candidate;
    }
  }

  // Direct URL entered instead of HTML.
  const directUrl = normalizeProtocolUrl(source);

  if (isShareableContentUrl(directUrl)) {
    return directUrl;
  }

  return "";
};

const getProcessedEmbedUrl = (value: string) => {
  const trimmed = String(value || "").trim();

  if (
    !/^https?:\/\//i.test(trimmed) ||
    trimmed.includes(" ") ||
    trimmed.includes("<iframe") ||
    trimmed.includes("<script") ||
    trimmed.includes("<blockquote")
  ) {
    return null;
  }

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
  );

  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  return trimmed;
};

const generateHtml = (
  embedCode: string,
  isDark: boolean,
) => `<!DOCTYPE html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <meta
      name="referrer"
      content="strict-origin-when-cross-origin"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
        background: ${isDark ? "#1E293B" : "#FFFFFF"};
        color: ${isDark ? "#F8FAFC" : "#111111"};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, Helvetica, Arial, sans-serif;
      }

      body {
        padding: 8px;
        box-sizing: border-box;
      }

      .embed-container {
        width: 100%;
        max-width: 100%;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        overflow: hidden;
      }

      blockquote,
      iframe,
      video,
      img,
      embed,
      object {
        max-width: 100% !important;
        box-sizing: border-box !important;
        border-radius: 8px;
      }
    </style>
  </head>

  <body>
    <div class="embed-container">
      ${embedCode}
    </div>

    <script>
      document.addEventListener("click", function () {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: "click" })
          );
        }
      });

      window.addEventListener("blur", function () {
        setTimeout(function () {
          const activeElement = document.activeElement;

          if (
            activeElement &&
            (
              activeElement.tagName === "IFRAME" ||
              activeElement.tagName === "VIDEO" ||
              activeElement.tagName === "EMBED" ||
              activeElement.tagName === "OBJECT"
            )
          ) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "click" })
              );
            }

            window.focus();
          }
        }, 150);
      });
    </script>

    ${
      /instagram-media/i.test(embedCode)
        ? '<script async src="https://www.instagram.com/embed.js"></script>'
        : ""
    }
  </body>
</html>`;

export default function EmbedCard({ item }: EmbedCardProps) {
  const contentHeight = Math.max(80, Number(item.height) || 250);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { trackEmbedInteraction } = useAppStore();
  const containerRef = useRef<any>(null);

  const directUrl = getProcessedEmbedUrl(item.embedCode);

  const processedEmbedCode = directUrl
    ? `<iframe
         src="${directUrl}"
         width="100%"
         height="100%"
         style="border:none;border-radius:8px;min-height:${Math.max(
           60,
           contentHeight - 16,
         )}px;"
         allowfullscreen
         allow="autoplay; encrypted-media; picture-in-picture"
       ></iframe>`
    : item.embedCode;

  const shareUrl = useMemo(
    () => extractEmbedShareUrl(item.embedCode),
    [item.embedCode],
  );

  useEffect(() => {
    trackEmbedInteraction(item._id, "view");
  }, [item._id, trackEmbedInteraction]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleBlur = () => {
      setTimeout(() => {
        const activeElement = document.activeElement;

        if (
          activeElement &&
          activeElement.tagName === "IFRAME" &&
          containerRef.current?.contains(activeElement)
        ) {
          trackEmbedInteraction(item._id, "click");
          window.focus();
        }
      }, 150);
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [item._id, trackEmbedInteraction]);

  const handleShare = async () => {
    const cleanTitle = String(item.title || "Shared from INMinut").trim();

    /*
     * Do not convert the full HTML embed into share text.
     * Share only the admin title and the actual content permalink.
     */
    const message = shareUrl
      ? `${cleanTitle}\n${shareUrl}`
      : cleanTitle;

    try {
      await Share.share({
        title: cleanTitle,
        message,
        url: Platform.OS === "ios" && shareUrl ? shareUrl : undefined,
      });
    } catch (error: any) {
      const errorMessage = String(error?.message || error || "").toLowerCase();

      if (
        !errorMessage.includes("cancel") &&
        !errorMessage.includes("dismiss")
      ) {
        console.error("Embed share failed:", error);
        Alert.alert(
          "Share failed",
          "Unable to share this embedded content right now.",
        );
      }
    }
  };

  const header = (
    <View
      style={[
        styles.header,
        isDark && styles.headerDark,
      ]}
    >
      <View style={styles.headerTextWrap}>
        <Text
          style={[
            styles.eyebrow,
            isDark && styles.eyebrowDark,
          ]}
        >
          Embedded content
        </Text>

        <Text
          style={[
            styles.title,
            isDark && styles.titleDark,
          ]}
          numberOfLines={2}
        >
          {item.title || "Embedded content"}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleShare}
        style={[
          styles.shareButton,
          isDark && styles.shareButtonDark,
        ]}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Share embedded content"
      >
        <Ionicons
          name="share-social-outline"
          size={19}
          color={isDark ? "#F8FAFC" : "#111827"}
        />
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.card,
          isDark && styles.cardDark,
        ]}
      >
        {header}

        <div
          ref={containerRef}
          style={{
            height: contentHeight,
            overflow: "hidden",
            padding: 8,
            boxSizing: "border-box",
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            cursor: "pointer",
          }}
          onClick={() =>
            trackEmbedInteraction(item._id, "click")
          }
          dangerouslySetInnerHTML={{
            __html: processedEmbedCode,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        isDark && styles.cardDark,
      ]}
    >
      {header}

      <View style={{ height: contentHeight }}>
        <WebView
          originWhitelist={["*"]}
          source={{
            html: generateHtml(processedEmbedCode, isDark),
            baseUrl: "https://www.instagram.com",
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled
          scalesPageToFit
          allowsFullscreenVideo
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          mixedContentMode="always"
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          backgroundColor={isDark ? "#1E293B" : "#FFFFFF"}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);

              if (data?.type === "click") {
                trackEmbedInteraction(item._id, "click");
              }
            } catch (error) {
              console.error(
                "Embed click message error:",
                error,
              );
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
    shadowColor: "#111111",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDark: {
    borderColor: "#334155",
    backgroundColor: "#1E293B",
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  headerDark: {
    borderBottomColor: "#334155",
    backgroundColor: "#1E293B",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: "#F97316",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  eyebrowDark: {
    color: "#FB923C",
  },
  title: {
    marginTop: 3,
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  titleDark: {
    color: "#F8FAFC",
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  shareButtonDark: {
    borderColor: "#475569",
    backgroundColor: "#334155",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
