import {
  Alert,
  Linking,
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
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
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

const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Match the actual authority, not a provider name embedded in another URL.
const getProcessedEmbedUrl = (value: string): string | null => {
  const url = normalizeProtocolUrl(value);
  if (!url || /[\s<>"']/.test(url)) return null;
  const youtube = url.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:embed\/|v\/|shorts\/|live\/)([\w-]{11})(?:[/?#]|$)/i)
    || url.match(/^https?:\/\/youtu\.be\/([\w-]{11})(?:[/?#]|$)/i)
    || (/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?/i.test(url) ? url.match(/[?&]v=([\w-]{11})(?:[&#]|$)/) : null);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const instagram = url.match(/^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([\w-]+)(?:[/?#]|$)/i);
  if (instagram) return `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed/`;
  const spotify = url.match(/^https?:\/\/open\.spotify\.com\/(?:embed\/)?(track|episode|album|playlist|show|artist)\/([a-zA-Z0-9]+)(?:[/?#]|$)/i);
  if (spotify) return `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}`;
  const vimeo = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[/?#]|$)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
};

const externalContentUrl = (value: string) => {
  const url = normalizeProtocolUrl(value);
  if (!url || /[\s<>"']/.test(url)) return "";
  return url.replace(/^(https:\/\/www\.youtube\.com)\/embed\/([\w-]{11}).*$/i, "$1/watch?v=$2")
    .replace(/^(https:\/\/www\.instagram\.com\/(?:p|reel|tv)\/[\w-]+)\/embed\/?(?:[?#].*)?$/i, "$1/")
    .replace(/^(https:\/\/open\.spotify\.com)\/embed\//i, "$1/")
    .replace(/^https:\/\/player\.vimeo\.com\/video\/(\d+).*$/i, "https://vimeo.com/$1");
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

            // Do not force focus back from an embedded player.
          }
        }, 150);
      });
    </script>

    ${
      /instagram-media/i.test(embedCode) && !/instagram\.com\/embed\.js/i.test(embedCode)
        ? '<script async src="https://www.instagram.com/embed.js"></script>'
        : ""
    }
  </body>
</html>`;

export default function EmbedCard({ item }: EmbedCardProps) {
  const contentHeight = Math.max(80, Number(item.height) || 250);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const trackEmbedInteraction = useAppStore(state => state.trackEmbedInteraction);
  const lastClick = useRef(0);
  const lastExternal = useRef(0);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const trackClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClick.current < 900) return;
    lastClick.current = now;
    void trackEmbedInteraction(item._id, "click");
  }, [item._id, trackEmbedInteraction]);
  const containerRef = useRef<any>(null);

  const directUrl = getProcessedEmbedUrl(item.embedCode);

  const processedEmbedCode = directUrl
    ? `<iframe
         src="${escapeAttribute(directUrl)}"
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

const contentUrl = useMemo(
  () => externalContentUrl(
    extractEmbedShareUrl(item.embedCode)
  ),
  [item.embedCode],
);

const shareUrl = useMemo(
  () => externalContentUrl(item.shareUrl || "") || contentUrl,
  [item.shareUrl, contentUrl],
);
  const html = useMemo(() => generateHtml(processedEmbedCode, isDark), [processedEmbedCode, isDark]);
  const source = useMemo(() => ({ html, baseUrl: "https://inminut.com/" }), [html]);
  useEffect(() => { setFailed(false); lastClick.current = 0; lastExternal.current = 0; }, [item._id, item.embedCode]);

  const openExternal = useCallback(async (url: string, fallback?: string) => {
    if (Date.now() - lastExternal.current < 900) return;
    lastExternal.current = Date.now();
    trackClick();
    try { await Linking.openURL(url); }
    catch {
      if (fallback && fallback !== url) {
        try { await Linking.openURL(fallback); return; } catch { /* show friendly error */ }
      }
      Alert.alert("Unable to open content", "The external app or website is unavailable.");
    }
  }, [trackClick]);

  const handleNavigation = useCallback((request: { url: string }) => {
    const url = request.url || "";
    if (/^https?:\/\//i.test(url) || url === "about:blank" || url === "about:srcdoc") return true;
    const instagram = url.match(/^intent:\/\/applink\.instagram\.com\/(p|reel|tv)\/([\w-]+)(?:[/?#]|$)/i);
    if (instagram) {
      void openExternal(`https://www.instagram.com/${instagram[1]}/${instagram[2]}/`);
    } else if (/^spotify:(?:\/\/open(?:[/?#]|$)|(?:track|episode|album|playlist|show|artist):[a-zA-Z0-9]+$)/i.test(url)) {
      const fallback = /^https:\/\/open\.spotify\.com\//i.test(shareUrl) ? shareUrl : "https://open.spotify.com/";
      void openExternal(url, fallback);
    } else if (/^(?:instagram|youtube|vnd\.youtube|whatsapp):/i.test(url)) {
      // Use the original HTTPS content instead of executing arbitrary native intent payloads.
      if (shareUrl) void openExternal(shareUrl);
    }
    return false;
  }, [openExternal, shareUrl]);

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
          trackClick();
        }
      }, 150);
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [trackClick]);

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

        <div ref={containerRef} style={{ height: contentHeight }}>
          <iframe title={item.title} srcDoc={html}
            sandbox="allow-scripts allow-presentation allow-popups allow-popups-to-escape-sandbox"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen style={{ width: "100%", height: "100%", border: 0 }} />
        </div>
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
      {!!shareUrl && <TouchableOpacity accessibilityRole="button" onPress={() => void openExternal(shareUrl)} style={{ alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 7 }}><Text style={{ color: isDark ? "#FB923C" : "#C2410C", fontSize: 12 }}>Open externally ↗</Text></TouchableOpacity>}
      <View style={{ height: contentHeight }}>
        {failed ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 12, gap: 12 }}>
            <Text style={{ color: isDark ? "#F8FAFC" : "#111827" }}>Unable to load embedded content.</Text>
            <TouchableOpacity onPress={() => { setFailed(false); setRetry(n => n + 1); }}><Text style={{ color: "#F97316" }}>Retry</Text></TouchableOpacity>
            {!!shareUrl && <TouchableOpacity onPress={() => void openExternal(shareUrl)}><Text style={{ color: "#F97316" }}>Open in browser</Text></TouchableOpacity>}
          </View>
        ) : <WebView
          key={`${item._id}-${retry}`}
          originWhitelist={["*"]}
          source={source}
          onShouldStartLoadWithRequest={handleNavigation}
          onError={() => setFailed(true)}
          allowsInlineMediaPlayback
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled
          scalesPageToFit
          allowsFullscreenVideo
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          mixedContentMode="never"
          thirdPartyCookiesEnabled
          sharedCookiesEnabled={false}
          setSupportMultipleWindows={false}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);

              if (data?.type === "click") {
                trackClick();
              }
            } catch (error) {
              console.error(
                "Embed click message error:",
                error,
              );
            }
          }}
        />}
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
