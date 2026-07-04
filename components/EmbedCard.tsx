import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { EmbedItem } from '@/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';

interface EmbedCardProps {
  item: EmbedItem;
}

const generateHtml = (embedCode: string, isDark: boolean) => `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <style>
      body {
        margin: 0;
        padding: 8px;
        background-color: ${isDark ? '#1E293B' : '#FFFFFF'};
        color: ${isDark ? '#F8FAFC' : '#111111'};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .embed-container {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      iframe, video, img {
        max-width: 100% !important;
        border-radius: 8px;
      }
    </style>
  </head>
  <body>
    <div class="embed-container">
      ${embedCode}
    </div>
    <script>
      // 1. Direct click capture
      document.addEventListener('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'click' }));
        }
      });

      // 2. Cross-origin iframe click capture
      window.addEventListener('blur', function() {
        setTimeout(function() {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'IFRAME' || activeEl.tagName === 'VIDEO' || activeEl.tagName === 'EMBED' || activeEl.tagName === 'OBJECT')) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'click' }));
            }
            window.focus();
          }
        }, 150);
      });
    </script>
  </body>
</html>
`;

export default function EmbedCard({ item }: EmbedCardProps) {
  const height = item.height || 250;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { trackEmbedInteraction } = useAppStore();
  const containerRef = useRef<any>(null);

  const getProcessedEmbedUrl = (str: string) => {
    const trimmed = (str || '').trim();
    if (!/^https?:\/\//i.test(trimmed) || trimmed.includes(' ') || trimmed.includes('<iframe') || trimmed.includes('<script')) {
      return null;
    }
    
    // Auto-convert YouTube watch URLs to embed URLs
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    return trimmed;
  };

  const directUrl = getProcessedEmbedUrl(item.embedCode);
  const processedEmbedCode = directUrl
    ? `<iframe src="${directUrl}" width="100%" height="100%" style="border:none; border-radius:8px; min-height:${height - 16}px;" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`
    : item.embedCode;

  useEffect(() => {
    trackEmbedInteraction(item._id, 'view');
  }, [item._id, trackEmbedInteraction]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleBlur = () => {
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'IFRAME') {
          if (containerRef.current && containerRef.current.contains(activeEl)) {
            trackEmbedInteraction(item._id, 'click');
            window.focus();
          }
        }
      }, 150);
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [item._id, trackEmbedInteraction]);

  if (Platform.OS === 'web') {
    return (
      <div
        ref={containerRef}
        style={{
          marginBottom: 16,
          borderRadius: 16,
          border: isDark ? '1px solid #334155' : '1px solid #FECACA',
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          padding: 8,
          height,
          overflow: 'hidden',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
        onClick={() => trackEmbedInteraction(item._id, 'click')}
        dangerouslySetInnerHTML={{ __html: processedEmbedCode }}
      />
    );
  }

  return (
    <View style={[styles.container, { height }, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
      <WebView
        originWhitelist={['*']}
        source={{
          html: generateHtml(processedEmbedCode, isDark),
          baseUrl: 'https://youtube.com',
        }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={true}
        scalesPageToFit={true}
        allowsFullscreenVideo={true}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        backgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data && data.type === 'click') {
              trackEmbedInteraction(item._id, 'click');
            }
          } catch (e) {
            console.error('Embed click message error:', e);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    // Premium soft card shadow
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  webview: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
});
