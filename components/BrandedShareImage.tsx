import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, Image } from 'react-native';

interface Props {
  imageUri: string;
  imageHeight?: number;
  title?: string;
  description?: string;
  titleColor?: string;
  publishedDate?: string;
  reporterName?: string;
  isBreaking?: boolean;
  breakingText?: string;
  breakingTextColor?: string;
  logoUrl?: string;
}

const stripText = (value?: string, maxLength = 420) => {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}...`;
};

const formatShareDate = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  
  // Get ordinal suffix (st, nd, rd, th)
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${dayName}, ${day}${suffix} ${monthName} ${year}`;
};

export default function BrandedShareImage({
  imageUri,
  imageHeight,
  title,
  description,
  titleColor,
  publishedDate,
  reporterName,
  isBreaking,
  breakingText,
  breakingTextColor,
  logoUrl,
}: Props) {
  const finalTitle = stripText(title, 140);
  const finalDescription = stripText(description, 260);
  const finalDate = formatShareDate(publishedDate);

  return (
    <View style={styles.card} collapsable={false}>
      <View style={styles.innerCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.logoBox}>
            <Image
              source={
                logoUrl
                  ? { uri: logoUrl }
                  : require('../assets/images/logo.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          {isBreaking && (
            <Text style={[styles.breakingText, breakingTextColor ? { color: breakingTextColor } : null]}>
              {breakingText || 'BREAKING NEWS'}
            </Text>
          )}
        </View>

        {/* Card Image */}
        <View style={[styles.imageWrapper, imageHeight ? { height: imageHeight } : null]}>
          <Image
            source={
              imageUri === 'breaking_placeholder'
                ? require('../assets/images/breaking_placeholder.jpg')
                : { uri: imageUri }
            }
            style={styles.mainImage}
            resizeMode={imageUri === 'breaking_placeholder' ? 'cover' : 'contain'}
          />
        </View>

        {/* Control Row */}
        <View style={styles.controlRow}>
          <Text style={styles.dateText}>{finalDate}</Text>
          
          <View style={styles.iconsRow}>
            <Ionicons name="heart-outline" size={32} color="#111111" />
            <Ionicons name="bookmark-outline" size={30} color="#111111" />
            <Ionicons name="share-outline" size={30} color="#111111" />
            <View style={styles.whatsappCircle}>
              <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Card Content Area */}
        <View style={styles.contentArea}>
          {!!finalTitle && (
            <Text
              style={[styles.title, titleColor ? { color: titleColor } : null]}
              numberOfLines={2}
            >
              {finalTitle}
            </Text>
          )}

          {!!finalDescription && (
            <Text
              style={styles.description}
              numberOfLines={5}
              ellipsizeMode="tail"
            >
              {finalDescription}
            </Text>
          )}
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.reporterText}>
            REPORTER: {reporterName?.trim() || 'INMINUT TEAM'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 1080,
    backgroundColor: '#E2E8F0', // slate outer background
    paddingHorizontal: 54,
    paddingVertical: 54,
  },
  innerCard: {
    width: 972,
    backgroundColor: '#FFFFFF',
    borderRadius: 48,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
logo: {
  width: 300,
  height: 99,
  borderRadius: 14,
  resizeMode: "contain",
},
  logoTitle: {
    color: '#111111',
    fontSize: 34,
    fontWeight: '900',
  },
  breakingText: {
    color: '#EF4444',
    fontSize: 45,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  imageWrapper: {
    width: 972,
    height: 850,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    marginTop: 28,
  },
  dateText: {
    color: '#64748B',
    fontSize: 22,
    fontWeight: '600',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  whatsappCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentArea: {
    paddingHorizontal: 48,
    marginTop: 28,
  },
  title: {
    color: '#111111',
    fontSize: 48,
    lineHeight: 68,
    fontWeight: '900',
    marginBottom: 16,
  },
  description: {
    color: '#334155',
    fontSize: 32,
    lineHeight: 48,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 48,
    paddingBottom: 40,
  },
  reporterText: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});