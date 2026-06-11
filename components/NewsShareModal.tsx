import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { AppPalette, Colors } from '@/constants/theme';
import { MediaItem, NewsItem } from '@/api';
import { copyNewsText, generateAndShareNewsPdf, shareSingleMediaFile, shareTextOnly } from '@/utils/share';
import { getMediaName } from '@/utils/media';

interface NewsShareModalProps {
  visible: boolean;
  item: NewsItem;
  onClose: () => void;
  onShared?: () => void;
}

type MediaType = MediaItem['type'];

const typeLabel: Record<MediaType, string> = {
  image: 'Images',
  video: 'Videos',
  pdf: 'PDFs',
};

const typeIcon: Record<MediaType, keyof typeof Ionicons.glyphMap> = {
  image: 'image-outline',
  video: 'videocam-outline',
  pdf: 'document-text-outline',
};

export default function NewsShareModal({ visible, item, onClose, onShared }: NewsShareModalProps) {
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const mediaByType = useMemo(() => {
    const media = (item.media || []).filter((m) => !!m.url);
    return {
      image: media.filter((m) => m.type === 'image'),
      video: media.filter((m) => m.type === 'video'),
      pdf: media.filter((m) => m.type === 'pdf'),
    };
  }, [item.media]);

  const payload = {
    title: item.title,
    description: item.description,
    content: item.content,
    media: item.media || [],
    hashtags: item.hashtags || [],
    cities: item.cities || [],
    publishedDate: item.publishedDate,
  };

  const runShare = async (key: string, action: () => Promise<boolean | void>, closeAfter = true) => {
    try {
      setLoadingKey(key);
      const result = await action();
      if (result !== false) onShared?.();
      if (closeAfter) onClose();
    } catch (error) {
      console.error('Share action failed:', error);
      Alert.alert('Share failed', 'Unable to complete this share action. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  };

  const shareMediaItem = (media: MediaItem, index: number) => {
    const label = getMediaName(media) || `${media.type} ${index + 1}`;
    runShare(`${media.type}-${index}`, () => shareSingleMediaFile(media, label));
  };

  const renderOption = ({
    key,
    icon,
    title,
    subtitle,
    disabled,
    onPress,
  }: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    disabled?: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      key={key}
      style={[styles.option, disabled && styles.optionDisabled]}
      onPress={onPress}
      activeOpacity={0.84}
      disabled={disabled || !!loadingKey}
    >
      <View style={styles.optionIcon}>
        {loadingKey === key ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name={icon} size={21} color={Colors.white} />}
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={AppPalette.muted} />
    </TouchableOpacity>
  );

  const renderMediaPicker = () => {
    if (!selectedType) return null;
    const media = mediaByType[selectedType];

    return (
      <View style={styles.mediaPickerWrap}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedType(null)} activeOpacity={0.8} disabled={!!loadingKey}>
          <Ionicons name="arrow-back" size={18} color={AppPalette.deepBlue} />
          <Text style={styles.backText}>Back to share options</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Select one {selectedType}</Text>
        <Text style={styles.helperText}>
          Expo managed / Expo Go can share one actual file at a time. Use “Share all in PDF” to send the complete news in one file.
        </Text>

        {media.map((m, index) => {
          const key = `${selectedType}-${index}`;
          return (
            <TouchableOpacity
              key={`${m.url}-${index}`}
              style={styles.mediaRow}
              onPress={() => shareMediaItem(m, index)}
              activeOpacity={0.84}
              disabled={!!loadingKey}
            >
              <View style={styles.mediaIcon}>
                {loadingKey === key ? <ActivityIndicator size="small" color={AppPalette.deepBlue} /> : <Ionicons name={typeIcon[selectedType]} size={20} color={AppPalette.deepBlue} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaTitle} numberOfLines={1}>{getMediaName(m)}</Text>
                <Text style={styles.mediaSubtitle}>Share actual {selectedType} file</Text>
              </View>
              <Ionicons name="share-social-outline" size={18} color={AppPalette.deepBlue} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Share News</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{item.title}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={AppPalette.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {selectedType ? (
              renderMediaPicker()
            ) : (
              <>
                {renderOption({
                  key: 'text',
                  icon: 'text-outline',
                  title: 'Share text',
                  subtitle: 'Share title, description, content, city and hashtags',
                  onPress: () => runShare('text', () => shareTextOnly(payload)),
                })}
                {renderOption({
                  key: 'copy',
                  icon: 'copy-outline',
                  title: 'Copy text',
                  subtitle: 'Copy properly aligned news text to clipboard',
                  onPress: () => runShare('copy', () => copyNewsText(payload), false),
                })}
                {renderOption({
                  key: 'all-pdf',
                  icon: 'newspaper-outline',
                  title: 'Share all in PDF',
                  subtitle: 'Generate one PDF with news text, images and media references',
                  onPress: () => runShare('all-pdf', () => generateAndShareNewsPdf(payload)),
                })}
                {renderOption({
                  key: 'images',
                  icon: 'image-outline',
                  title: `Share images (${mediaByType.image.length})`,
                  subtitle: mediaByType.image.length ? 'Select image to share as actual file' : 'No images available',
                  disabled: !mediaByType.image.length,
                  onPress: () => setSelectedType('image'),
                })}
                {renderOption({
                  key: 'videos',
                  icon: 'videocam-outline',
                  title: `Share videos (${mediaByType.video.length})`,
                  subtitle: mediaByType.video.length ? 'Select video to share as actual file' : 'No videos available',
                  disabled: !mediaByType.video.length,
                  onPress: () => setSelectedType('video'),
                })}
                {renderOption({
                  key: 'pdfs',
                  icon: 'document-text-outline',
                  title: `Share PDFs (${mediaByType.pdf.length})`,
                  subtitle: mediaByType.pdf.length ? 'Select PDF to share as actual file' : 'No PDFs available',
                  disabled: !mediaByType.pdf.length,
                  onPress: () => setSelectedType('pdf'),
                })}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11,30,63,0.48)',
  },
  sheet: {
    maxHeight: '88%',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: AppPalette.border,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: AppPalette.navyBlue,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: AppPalette.muted,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: AppPalette.border,
  },
  scrollContent: {
    paddingBottom: 10,
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: AppPalette.border,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.deepBlue,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: AppPalette.ink,
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    color: AppPalette.muted,
  },
  mediaPickerWrap: {
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AppPalette.blueSurface,
  },
  backText: {
    fontSize: 13,
    fontWeight: '900',
    color: AppPalette.deepBlue,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '900',
    color: AppPalette.navyBlue,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    color: AppPalette.muted,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: AppPalette.border,
  },
  mediaIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.blueSurface,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: AppPalette.ink,
  },
  mediaSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: AppPalette.muted,
  },
});
