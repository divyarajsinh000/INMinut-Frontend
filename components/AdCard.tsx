import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ad } from '@/api';
import { API_BASE_URL } from '@/api/client';
import * as WebBrowser from 'expo-web-browser';

interface AdCardProps {
  item: Ad;
}

export default function AdCard({ item }: AdCardProps) {
  const handlePress = async () => {
    try {
      await WebBrowser.openBrowserAsync(item.redirectUrl);
    } catch (error) {
      console.error('Error opening ad:', error);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image
        source={{ uri: item.bannerImage?.startsWith('http') ? item.bannerImage : `${API_BASE_URL}${item.bannerImage}` }}
        style={styles.image}
        contentFit="cover"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
});
