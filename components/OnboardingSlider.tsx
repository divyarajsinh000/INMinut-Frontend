import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { AppPalette } from '@/constants/theme';
import * as SecureStore from '@/utils/storage';
export const ONBOARDING_DONE_KEY = 'brekingapp_onboarding_done_v1';

interface Props {
  visible: boolean;
  onDone: () => void;
}

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'flash-outline' as const,
    title: 'Fast local updates',
    body: 'Read verified breaking stories and local updates without searching through noisy feeds.',
  },
  {
    icon: 'location-outline' as const,
    title: 'News from your cities',
    body: 'Pick multiple cities once and your home feed will stay focused on those locations.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Never miss alerts',
    body: 'Get timely alerts for important updates from your preferred cities and categories.',
  },
];

export const hasCompletedOnboarding = async () => {
  const value = await SecureStore.getItemAsync(ONBOARDING_DONE_KEY);
  return value === 'true';
};

const OnboardingSlider = ({ visible, onDone }: Props) => {
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const complete = async () => {
    await SecureStore.setItemAsync(ONBOARDING_DONE_KEY, 'true');
    onDone();
  };

  const next = () => {
    if (index >= slides.length - 1) {
      complete();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.screen}>
        <View style={styles.bgCircleOne} />
        <View style={styles.bgCircleTwo} />

        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../assets/images/logo-light.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <Pressable onPress={complete} hitSlop={12}>
            <ThemedText style={styles.skip}>Skip</ThemedText>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          data={slides}
          keyExtractor={(item) => item.title}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setIndex(nextIndex);
          }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={styles.illustrationWrap}>
                <View style={styles.iconOrbit}>
                  <Ionicons name={item.icon} size={74} color={AppPalette.brightOrange} />
                </View>
              </View>

              <ThemedText style={styles.title}>{item.title}</ThemedText>
              <ThemedText style={styles.body}>{item.body}</ThemedText>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((slide, dotIndex) => (
              <View
                key={slide.title}
                style={[styles.dot, dotIndex === index && styles.activeDot]}
              />
            ))}
          </View>

          <Pressable style={styles.nextButton} onPress={next}>
            <ThemedText style={styles.nextText}>
              {index === slides.length - 1 ? 'Choose City' : 'Next'}
            </ThemedText>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    overflow: 'hidden',
  },
  bgCircleOne: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#FECACA',
    opacity: 0.8,
  },
  bgCircleTwo: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#DBEAFE',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoImage: {
    width: 150,
    height: 42,
  },
  brand: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: AppPalette.ink,
  },
  skip: {
    fontSize: 14,
    fontWeight: '800',
    color: AppPalette.muted,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  illustrationWrap: {
    width: 220,
    height: 220,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
    shadowColor: '#FF3131',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 8,
  },
  iconOrbit: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    color: AppPalette.ink,
    marginBottom: 14,
  },
  body: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: AppPalette.slate,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7DD3FC',
    opacity: 0.5,
  },
  activeDot: {
    width: 28,
    opacity: 1,
    backgroundColor: AppPalette.brightOrange,
  },
  nextButton: {
    height: 58,
    borderRadius: 22,
    backgroundColor: AppPalette.brightOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#FF3131',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});

export default OnboardingSlider;
