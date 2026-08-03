import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ad } from '@/api';
import { API_BASE_URL } from '@/api/client';
import { AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';

interface AdCardProps {
  item: Ad;
}

const normalizeHeight = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(80, parsed) : 250;
};

const getImageUrl = (value?: string) => {
  if (!value) return '';
  return value.startsWith('http') ? value : `${API_BASE_URL}${value}`;
};

export default function AdCard({ item }: AdCardProps) {
  const { trackAdInteraction } = useAppStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const imageHeight = normalizeHeight((item as Ad & { height?: number }).height);

  useEffect(() => {
    trackAdInteraction(item._id, 'view');
  }, [item._id, trackAdInteraction]);

  const handlePress = async () => {
    try {
      trackAdInteraction(item._id, 'click');
      if (item.redirectUrl) {
        await WebBrowser.openBrowserAsync(item.redirectUrl);
      }
    } catch (error) {
      console.error('Error opening ad:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isDark && { backgroundColor: '#1E293B', borderColor: '#334155' },
      ]}
      onPress={handlePress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name || 'advertisement'}`}
    >
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        <Image
          source={{ uri: getImageUrl(item.bannerImage) }}
          style={styles.image}
          contentFit="cover"
          contentPosition="center"
        />

        <View style={styles.labelBadge}>
          <Text style={styles.labelText} numberOfLines={1}>
            {item.label?.trim() || 'Advertisement'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerTextWrap}>
          <Text
            style={[styles.name, isDark && { color: '#F8FAFC' }]}
            numberOfLines={1}
          >
            {item.name?.trim() || 'Advertisement'}
          </Text>
          <Text
            style={[styles.url, isDark && { color: '#94A3B8' }]}
            numberOfLines={1}
          >
            {item.redirectUrl?.trim() || 'Tap to open advertisement'}
          </Text>
        </View>

        <View style={styles.openButton}>
          <Text style={styles.openText}>OPEN</Text>
          <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 4,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  labelBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    maxWidth: '70%',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.66)',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  footer: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  footerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  url: {
    marginTop: 4,
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AppPalette.brightOrange,
  },
  openText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
