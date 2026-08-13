import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '@/utils/storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { AppPalette } from '@/constants/theme';

export const APP_GUIDE_DONE_KEY = 'inminut_app_guide_done_v1';

type IoniconName = keyof typeof Ionicons.glyphMap;

type GuidePlacement =
  | 'cityButton'
  | 'helpButton'
  | 'categoryRow'
  | 'newsMedia'
  | 'saveShare'
  | 'bottomTabs'
  | 'pullRefresh';

interface GuideStep {
  icon: IoniconName;
  title: string;
  body: string;
  target: string;
  placement: GuidePlacement;
}

interface AppGuideOverlayProps {
  visible: boolean;
  onFinish: () => void;
  layouts?: Record<string, { x: number; y: number; width: number; height: number }>;
}

const guideSteps: GuideStep[] = [
  {
    icon: 'location-outline',
    title: 'Select your city',
    body: 'Tap here to choose your preferred cities. After this, your feed will show local news from those cities.',
    target: 'City filter',
    placement: 'cityButton',
  },
  {
    icon: 'help-circle-outline',
    title: 'Open help anytime',
    body: 'Tap this help button whenever you want to see this app guide again.',
    target: 'Help button',
    placement: 'helpButton',
  },
  {
    icon: 'options-outline',
    title: 'Filter by category',
    body: 'Use these category chips to quickly see only politics, sports, business, entertainment or local updates.',
    target: 'Category row',
    placement: 'categoryRow',
  },
  {
    icon: 'images-outline',
    title: 'Read news and media',
    body: 'News cards show images, videos and PDFs in one place. Tap media to preview it in full screen.',
    target: 'News card',
    placement: 'newsMedia',
  },
  {
    icon: 'bookmark-outline',
    title: 'Save and share news',
    body: 'Use the save button to keep important news for later, and the share button to send it to others.',
    target: 'Save / share buttons',
    placement: 'saveShare',
  },
  {
    icon: 'refresh-outline',
    title: 'Refresh latest news',
    body: 'Pull the news list downward to refresh and load the newest stories.',
    target: 'News list',
    placement: 'pullRefresh',
  },
  {
    icon: 'grid-outline',
    title: 'Use bottom tabs',
    body: 'Use the bottom tabs to move between home, saved news, notifications and other app sections.',
    target: 'Bottom navigation',
    placement: 'bottomTabs',
  },
];

export const hasCompletedAppGuide = async () => {
  const value = await SecureStore.getItemAsync(APP_GUIDE_DONE_KEY);
  return value === 'true';
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const AppGuideOverlay = ({ visible, onFinish, layouts = {} }: AppGuideOverlayProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const { width, height } = useWindowDimensions();

  const step = guideSteps[stepIndex];
  const isLast = stepIndex === guideSteps.length - 1;

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible]);

  const complete = async () => {
    await SecureStore.setItemAsync(APP_GUIDE_DONE_KEY, 'true');
    onFinish();
  };

  const goNext = () => {
    if (isLast) {
      complete();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  const insets = useSafeAreaInsets();

  const layout = useMemo(() => {
    const cardWidth = Math.min(width - 24, 340);
    const screenPad = 12;
    const tooltipHeight = 240;
    const safeTop = insets.top + 12;
    const safeBottom = height - insets.bottom - 12;

    const getLeft = (targetLeft: number, targetWidth: number) => {
      const centerLeft = targetLeft + targetWidth / 2 - cardWidth / 2;
      return clamp(centerLeft, screenPad, width - cardWidth - screenPad);
    };

    const tooltipForTarget = (targetTop: number, targetLeft: number, targetWidth: number, targetHeight: number) => {
      const targetCenterY = targetTop + targetHeight / 2;
      const spaceBelow = safeBottom - (targetTop + targetHeight + 16);
      const spaceAbove = targetTop - 16 - safeTop;

      let top = clamp(
        targetCenterY - tooltipHeight / 2,
        safeTop,
        Math.max(safeTop, safeBottom - tooltipHeight),
      );

      if (spaceBelow >= tooltipHeight + 20) {
        top = targetTop + targetHeight + 16;
      } else if (spaceAbove >= tooltipHeight + 20) {
        top = targetTop - tooltipHeight - 16;
      }

      return {
        top: clamp(top, safeTop, Math.max(safeTop, safeBottom - tooltipHeight)),
        left: getLeft(targetLeft, targetWidth),
        width: cardWidth,
      };
    };

    const measured = layouts[step.placement];

    const refineWithMeasured = (baseLayout: { targetStyle: any; handStyle: any; tooltipStyle: any }) => {
      if (!measured || !Number.isFinite(measured.x) || !Number.isFinite(measured.y) || !Number.isFinite(measured.width) || !Number.isFinite(measured.height)) {
        return baseLayout;
      }

      const baseWidth = Number(baseLayout.targetStyle.width || 0);
      const baseHeight = Number(baseLayout.targetStyle.height || 0);
      const baseLeft = Number(baseLayout.targetStyle.left || 0);
      const baseTop = Number(baseLayout.targetStyle.top ?? (baseLayout.targetStyle.bottom ? (height - (Number(baseLayout.targetStyle.bottom || 0) + baseHeight)) : 0));

      const widthDelta = Math.abs(measured.width - baseWidth);
      const heightDelta = Math.abs(measured.height - baseHeight);
      const leftDelta = Math.abs(measured.x - baseLeft);
      const topDelta = Math.abs(measured.y - baseTop);

      // Loosen thresholds so measured layouts are accepted more often across devices
      const shouldUseMeasured = widthDelta < 140 && heightDelta < 120 && leftDelta < 140 && topDelta < 220;
      if (!shouldUseMeasured) {
        return baseLayout;
      }

      const refinedTargetStyle = {
        ...baseLayout.targetStyle,
        top: measured.y,
        left: measured.x,
        width: measured.width,
        height: measured.height,
      };

      return {
        ...baseLayout,
        targetStyle: refinedTargetStyle,
        handStyle: {
          ...baseLayout.handStyle,
          top: measured.y + measured.height - 5,
          left: measured.x + measured.width / 2 - 20,
        },
        tooltipStyle: tooltipForTarget(measured.y, measured.x, measured.width, measured.height),
      };
    };

    // Prefer the stable fallback positions used for the guide design.
    // Only accept measured coordinates when they are close to the intended target to avoid jumpy drift.
    let baseLayout: { targetStyle: any; handStyle: any; tooltipStyle: any };

    switch (step.placement) {
      case 'cityButton': {
        const targetWidth = Math.min(118, width * 0.36);
        const targetHeight = 42;
        const targetTop = insets.top + 8;
        const targetLeft = width - 16 - targetWidth;
        baseLayout = {
          targetStyle: {
            top: targetTop,
            left: targetLeft,
            width: targetWidth,
            height: targetHeight,
            borderRadius: 22,
          },
          handStyle: { top: targetTop + targetHeight - 5, left: targetLeft + targetWidth - 46 },
          tooltipStyle: tooltipForTarget(targetTop, targetLeft, targetWidth, targetHeight),
        };
        break;
      }
      case 'helpButton': {
        const targetWidth = 42;
        const targetHeight = 42;
        const targetTop = insets.top + 8;
        const targetLeft = width - 66 - Math.min(118, width * 0.36);
        baseLayout = {
          targetStyle: { top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight, borderRadius: 21 },
          handStyle: { top: targetTop + targetHeight - 5, left: targetLeft + 8 },
          tooltipStyle: tooltipForTarget(targetTop, targetLeft, targetWidth, targetHeight),
        };
        break;
      }
      case 'categoryRow': {
        const targetTop = insets.top + 54;
        const targetLeft = 12;
        const targetWidth = Math.max(220, width - 24);
        const targetHeight = 40;
        baseLayout = {
          targetStyle: { top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight, borderRadius: 18 },
          handStyle: { top: targetTop + targetHeight - 10, left: 44 },
          tooltipStyle: tooltipForTarget(targetTop, targetLeft, targetWidth, targetHeight),
        };
        break;
      }
      case 'newsMedia': {
        const targetTop = insets.top + 102;
        const targetLeft = 16;
        const targetWidth = width - 32;
        const targetHeight = Math.min(215, height * 0.29);
        baseLayout = {
          targetStyle: { top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight, borderRadius: 24 },
          handStyle: { top: targetTop + targetHeight - 48, left: 52 },
          tooltipStyle: tooltipForTarget(targetTop, targetLeft, targetWidth, targetHeight),
        };
        break;
      }
      case 'saveShare': {
        const targetWidth = 90;
        const targetHeight = 46;
        const targetTop = insets.top + 340;
        const targetLeft = width - 32 - targetWidth;
        baseLayout = {
          targetStyle: { top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight, borderRadius: 14 },
          handStyle: { top: targetTop + targetHeight - 8, left: targetLeft + targetWidth - 48 },
          tooltipStyle: tooltipForTarget(targetTop, targetLeft, targetWidth, targetHeight),
        };
        break;
      }
      case 'pullRefresh': {
        const targetTop = insets.top + 102;
        const targetLeft = 16;
        const targetWidth = width - 32;
        const targetHeight = Math.min(315, height * 0.42);
        baseLayout = {
          targetStyle: { top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight, borderRadius: 26 },
          handStyle: { top: targetTop + 24, left: width / 2 - 25 },
          tooltipStyle: tooltipForTarget(targetTop, targetLeft, targetWidth, targetHeight),
        };
        break;
      }
      case 'bottomTabs':
      default: {
        const targetHeight = 74;
        const targetLeft = 10;
        const targetWidth = width - 20;
        const targetBottom = insets.bottom + 8;
        const targetTop = height - targetBottom - targetHeight;
        baseLayout = {
          // Use `top` so measured window coordinates compare correctly in refineWithMeasured
          targetStyle: { top: targetTop, left: targetLeft, width: targetWidth, height: targetHeight, borderRadius: 28 },
          handStyle: { top: targetTop - 8, left: width / 2 - 27 },
          tooltipStyle: tooltipForTarget(targetTop, targetLeft, targetWidth, targetHeight),
        };
        break;
      }
    }

    return refineWithMeasured(baseLayout);
  }, [height, step.placement, width, insets, layouts]);

  const progressText = `${stepIndex + 1} / ${guideSteps.length}`;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View pointerEvents="none" style={[styles.targetHighlight, layout.targetStyle]}>
          <View style={styles.pulseOuter}>
            <View style={styles.pulseInner} />
          </View>
        </View>

        <View pointerEvents="none" style={[styles.handWrap, layout.handStyle]}>
          <Text style={styles.hand}>☝️</Text>
        </View>

        <View style={[styles.tooltipCard, layout.tooltipStyle]}>
          <View style={styles.tooltipHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={23} color={AppPalette.brightOrange} />
            </View>
            <View style={styles.tooltipTitleWrap}>
              <ThemedText style={styles.counter}>Step {progressText}</ThemedText>
              <ThemedText style={styles.title}>{step.title}</ThemedText>
              <ThemedText style={styles.targetText}>{step.target}</ThemedText>
            </View>
            <Pressable onPress={complete} hitSlop={12} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={AppPalette.muted} />
            </Pressable>
          </View>

          <ThemedText style={styles.body}>{step.body}</ThemedText>

          <View style={styles.dots}>
            {guideSteps.map((item, index) => (
              <View key={item.title} style={[styles.dot, index === stepIndex && styles.activeDot]} />
            ))}
          </View>

          <View style={styles.footerRow}>
            <Pressable
              onPress={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={stepIndex === 0}
              style={[styles.secondaryButton, stepIndex === 0 && styles.disabledButton]}
            >
              <ThemedText style={[styles.secondaryText, stepIndex === 0 && styles.disabledText]}>Back</ThemedText>
            </Pressable>

            <Pressable onPress={goNext} style={styles.nextButton}>
              <ThemedText style={styles.nextText}>{isLast ? 'Start using app' : 'Next'}</ThemedText>
              <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={19} color="#fff" />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={complete} style={styles.skipButton}>
          <ThemedText style={styles.skipText}>Skip guide</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
  },
  targetHighlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: AppPalette.brightOrange,
    backgroundColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 49, 49, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppPalette.brightOrange,
  },
  handWrap: {
    position: 'absolute',
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hand: {
    fontSize: 48,
  },
  tooltipCard: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 16,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  iconWrap: {
    height: 50,
    width: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  tooltipTitleWrap: { flex: 1 },
  counter: {
    fontSize: 10.5,
    color: AppPalette.brightOrange,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    marginTop: 2,
    fontSize: 19,
    lineHeight: 24,
    color: AppPalette.ink,
    fontWeight: '900',
  },
  targetText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: AppPalette.slate,
    fontWeight: '800',
  },
  closeButton: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  body: {
    marginTop: 13,
    fontSize: 14.5,
    lineHeight: 22,
    color: AppPalette.slate,
    fontWeight: '700',
  },
  dots: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FECACA',
  },
  activeDot: {
    width: 26,
    backgroundColor: AppPalette.brightOrange,
  },
  footerRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 11,
  },
  secondaryButton: {
    flex: 0.9,
    height: 49,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: AppPalette.ink,
  },
  disabledButton: { opacity: 0.45 },
  disabledText: { color: AppPalette.muted },
  nextButton: {
    flex: 1.35,
    height: 49,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: AppPalette.brightOrange,
  },
  nextText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '900',
  },
  skipButton: {
    position: 'absolute',
    top: 46,
    right: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  skipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
});

export default AppGuideOverlay;
