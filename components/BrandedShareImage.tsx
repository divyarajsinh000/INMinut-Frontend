import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.news.brekingapp';

interface Props {
  imageUri: string;
  title?: string;
  description?: string;
  titleColor?: string;
  publishedDate?: string;
}

const stripText = (value?: string, maxLength = 420) => {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}...`;
};

const formatShareDate = (value?: string) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `Dt. ${day}-${month}-${year}`;
};

export default function BrandedShareImage({
  imageUri,
  title,
  description,
  titleColor,
  publishedDate,
}: Props) {
  const finalTitle = stripText(title, 140);
  const finalDescription = stripText(description, 260);
  const finalDate = formatShareDate(publishedDate);

  return (
    <View style={styles.card} collapsable={false}>
      <LinearGradient
        colors={['#EFF6FF', '#FFFFFF', '#FFF7ED', '#E0F2FE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />

      <View style={styles.circleOne} />
      <View style={styles.circleTwo} />

      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.logoTextWrap}>
            <Text style={styles.logoTitle}>INMinut</Text>
            <Text style={styles.logoSub}>DIGITAL</Text>
          </View>
        </View>
      </View>

 <View style={styles.imageCard}>
  <Image
    source={{ uri: imageUri }}
    style={styles.imageBlurBg}
    resizeMode="cover"
    blurRadius={18}
  />

  <View style={styles.imageDarkLayer} />

  <Image
    source={{ uri: imageUri }}
    style={styles.mainImage}
    resizeMode="contain"
  />

  <View style={styles.cornerLogo}>
    <Image
      source={require('../assets/images/icon.png')}
      style={styles.cornerLogoImage}
      resizeMode="contain"
    />
    <Text style={styles.cornerLogoText}>INMinut</Text>
  </View>
</View>

      {!!finalDate && (
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{finalDate}</Text>
        </View>
      )}

      <View style={styles.contentArea}>
        {!!finalTitle && (
          <Text
            style={[styles.title, titleColor ? { color: titleColor } : null]}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {finalTitle}
          </Text>
        )}

        {!!finalDescription && (
          <Text
            style={styles.description}
            numberOfLines={5}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {finalDescription}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Read full news on INMinut App</Text>
        <Text style={styles.footerLink} numberOfLines={1}>
          {APP_LINK}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 1080,
    height: 1350,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  background: {
    ...StyleSheet.absoluteFillObject,
  },

  circleOne: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(14,165,233,0.13)',
    top: -140,
    right: -120,
  },

  circleTwo: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(245,158,11,0.13)',
    bottom: -180,
    left: -160,
  },

  header: {
    paddingTop: 28,
    paddingHorizontal: 34,
    paddingBottom: 18,
  },

  logoBox: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 20,
    borderWidth: 3,
    borderColor: '#FACC15',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },

  logo: {
    width: 82,
    height: 82,
    borderRadius: 16,
  },

  logoTextWrap: {
    marginLeft: 12,
  },

  logoTitle: {
    color: '#0F172A',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    includeFontPadding: true,
  },

  logoSub: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    overflow: 'hidden',
    includeFontPadding: true,
  },

imageCard: {
  marginHorizontal: 32,
  height: 650,
  borderRadius: 28,
  overflow: 'hidden',
  backgroundColor: '#111827',
  borderWidth: 2,
  borderColor: '#FFFFFF',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.18,
  shadowRadius: 26,
  elevation: 10,
},
imageBlurBg: {
  ...StyleSheet.absoluteFillObject,
  width: '100%',
  height: '100%',
  opacity: 0.55,
},

imageDarkLayer: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(15,23,42,0.42)',
},
mainImage: {
  width: '100%',
  height: '100%',
  backgroundColor: 'transparent',
},

  cornerLogo: {
    position: 'absolute',
    top: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cornerLogoImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },

  cornerLogoText: {
    marginLeft: 7,
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    includeFontPadding: true,
  },

  dateRow: {
    marginHorizontal: 38,
    marginTop: 12,
    alignItems: 'flex-end',
  },

  dateText: {
    color: '#64748B',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'right',
    includeFontPadding: true,
  },

  contentArea: {
    paddingHorizontal: 38,
    paddingTop: 10,
    paddingBottom: 132,
  },

  title: {
    color: '#0F172A',
    fontSize: 50,
    lineHeight: 72,
    fontWeight: '900',
    includeFontPadding: true,
  },

  description: {
    marginTop: 14,
    color: '#334155',
    fontSize: 28,
    lineHeight: 42,
    fontWeight: '700',
    includeFontPadding: true,
  },

  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 22,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: 'rgba(14,165,233,0.22)',
  },

  footerText: {
    color: '#0F3D8E',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: true,
  },

  footerLink: {
    marginTop: 4,
    color: '#F59E0B',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: true,
  },
});