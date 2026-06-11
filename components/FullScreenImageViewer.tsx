import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MediaItem } from '@/api';
import { AppPalette, Colors } from '@/constants/theme';
import { getImageMedia, getMediaUrl } from '@/utils/media';

interface Props {
  visible: boolean;
  media: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

function ZoomableImage({ uri }: { uri: string }) {
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;

    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [uri]);

  const resetZoom = () => {
    'worklet';

    scale.value = withTiming(1);
    savedScale.value = 1;

    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      scale.value = clamp(nextScale, 1, 5);
    })
    .onEnd(() => {
      if (scale.value <= 1.03) {
        resetZoom();
        return;
      }

      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .minDistance(2)
    .onUpdate((event) => {
      if (scale.value <= 1.01) return;

      const maxX = ((scale.value - 1) * width) / 2;
      const maxY = ((scale.value - 1) * height) / 2;

      const nextX = savedTranslateX.value + event.translationX;
      const nextY = savedTranslateY.value + event.translationY;

      translateX.value = clamp(nextX, -maxX, maxX);
      translateY.value = clamp(nextY, -maxY, maxY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .onEnd((event) => {
      if (scale.value > 1.05) {
        resetZoom();
        return;
      }

      scale.value = withTiming(2.6);
      savedScale.value = 2.6;

      const tapX = event.x - width / 2;
      const tapY = event.y - height / 2;

      const maxX = ((2.6 - 1) * width) / 2;
      const maxY = ((2.6 - 1) * height) / 2;

      translateX.value = withTiming(clamp(-tapX, -maxX, maxX));
      translateY.value = withTiming(clamp(-tapY, -maxY, maxY));

      savedTranslateX.value = clamp(-tapX, -maxX, maxX);
      savedTranslateY.value = clamp(-tapY, -maxY, maxY);
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.zoomCanvas, animatedStyle]}>
        <Image source={{ uri }} style={styles.image} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

export default function FullScreenImageViewer({
  visible,
  media,
  initialIndex = 0,
  onClose,
}: Props) {
  const images = getImageMedia(media);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setIndex(
        Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0))
      );
    }
  }, [visible, initialIndex, images.length]);

  if (!images.length) return null;

  const current = images[index];
  const hasMultiple = images.length > 1;

  const goPrevious = () => {
    setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goNext = () => {
    setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Important: Modal needs its own GestureHandlerRootView */}
      <GestureHandlerRootView style={styles.modalRoot}>
        <View style={styles.overlay}>
          <View style={styles.topBar} pointerEvents="box-none">
            <Text style={styles.counter}>
              {index + 1} / {images.length}
            </Text>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={26} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.viewerArea}>
            <ZoomableImage uri={getMediaUrl(current.url)} />
          </View>

          <Text style={styles.zoomHint}>
            Pinch or double tap to zoom. Drag after zoom.
          </Text>

          {hasMultiple && (
            <>
              <Pressable
                style={[styles.navButton, styles.leftButton]}
                onPress={goPrevious}
              >
                <Ionicons name="chevron-back" size={34} color={Colors.white} />
              </Pressable>

              <Pressable
                style={[styles.navButton, styles.rightButton]}
                onPress={goNext}
              >
                <Ionicons
                  name="chevron-forward"
                  size={34}
                  color={Colors.white}
                />
              </Pressable>
            </>
          )}

          {hasMultiple && (
            <View style={styles.dotsRow} pointerEvents="box-none">
              {images.map((_, dotIndex) => (
                <Pressable
                  key={dotIndex}
                  onPress={() => setIndex(dotIndex)}
                  style={[
                    styles.dot,
                    dotIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
  },

  topBar: {
    position: 'absolute',
    top: 48,
    left: 18,
    right: 18,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  counter: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewerArea: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomCanvas: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  zoomHint: {
    position: 'absolute',
    bottom: 78,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
  },

  navButton: {
    position: 'absolute',
    top: '47%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },

  leftButton: {
    left: 14,
  },

  rightButton: {
    right: 14,
  },

  dotsRow: {
    position: 'absolute',
    bottom: 42,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 12,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  activeDot: {
    width: 22,
    backgroundColor: AppPalette.brightOrange,
  },
});