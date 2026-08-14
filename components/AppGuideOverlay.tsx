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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppPalette } from '@/constants/theme';

export const APP_GUIDE_DONE_KEY = 'inminut_app_guide_done_v1';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface AppGuideOverlayProps {
  visible: boolean;
  onFinish: () => void;
}

type StepKey =
  | 'location'
  | 'help'
  | 'categories'
  | 'media'
  | 'actions'
  | 'refresh'
  | 'tabs';

interface GuideStep {
  key: StepKey;
  icon: IoniconName;
  title: string;
  body: string;
}

const guideSteps: GuideStep[] = [
  {
    key: 'location',
    icon: 'location-outline',
    title: 'Select your city',
    body: 'Tap the location icon to choose your preferred cities and personalize local news.',
  },
  {
    key: 'help',
    icon: 'help-circle-outline',
    title: 'Open help anytime',
    body: 'Tap the help icon whenever you want to view this app guide again.',
  },
  {
    key: 'categories',
    icon: 'options-outline',
    title: 'Filter by category',
    body: 'Use the category chips to quickly switch between different types of news.',
  },
  {
    key: 'media',
    icon: 'images-outline',
    title: 'Read news and media',
    body: 'News cards can contain images, videos and PDFs. Tap media to preview it.',
  },
  {
    key: 'actions',
    icon: 'bookmark-outline',
    title: 'Save and share news',
    body: 'Use bookmark to save news and the WhatsApp/share buttons to send it to others.',
  },
  {
    key: 'refresh',
    icon: 'refresh-outline',
    title: 'Refresh latest news',
    body: 'Pull the feed downward to refresh and load the newest available stories.',
  },
  {
    key: 'tabs',
    icon: 'grid-outline',
    title: 'Use bottom navigation',
    body: 'Use Home, Search, Saved and Profile to move around the app.',
  },
];

export const hasCompletedAppGuide = async () => {
  const value = await SecureStore.getItemAsync(APP_GUIDE_DONE_KEY);
  return value === 'true';
};

const AppGuideOverlay = ({ visible, onFinish }: AppGuideOverlayProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible]);

  const complete = async () => {
    await SecureStore.setItemAsync(APP_GUIDE_DONE_KEY, 'true');
    onFinish();
  };

  const step = guideSteps[stepIndex];
  const isLast = stepIndex === guideSteps.length - 1;

  const metrics = useMemo(() => {
    const side = 16;
    const contentWidth = width - side * 2;
    const headerTop = insets.top + 10;
    const headerHeight = 58;
    const categoryTop = headerTop + headerHeight + 10;
    const categoryHeight = 40;
    const cardTop = categoryTop + categoryHeight + 10;
    const cardWidth = contentWidth;
    const cardMediaHeight = Math.min(210, Math.max(150, height * 0.24));
    const cardBodyHeight = 170;
    const cardHeight = cardMediaHeight + cardBodyHeight;
    const tabHeight = Math.max(70, insets.bottom + 58);
    const tabTop = height - tabHeight;

    const locationSize = 38;
    const helpSize = 38;
    const locationLeft = width - side - locationSize;
    const helpLeft = locationLeft - 10 - helpSize;

    const actionRowTop = cardTop + cardMediaHeight + cardBodyHeight - 58;
    const actionWidth = 160;
    const actionLeft = side + cardWidth - actionWidth - 12;

    const target = {
      location: {
        top: headerTop + 8,
        left: locationLeft,
        width: locationSize,
        height: locationSize,
        radius: 14,
      },
      help: {
        top: headerTop + 8,
        left: helpLeft,
        width: helpSize,
        height: helpSize,
        radius: 14,
      },
      categories: {
        top: categoryTop,
        left: side,
        width: contentWidth,
        height: categoryHeight,
        radius: 18,
      },
      media: {
        top: cardTop,
        left: side,
        width: cardWidth,
        height: cardMediaHeight,
        radius: 22,
      },
      actions: {
        top: actionRowTop,
        left: actionLeft,
        width: actionWidth,
        height: 46,
        radius: 16,
      },
      refresh: {
        top: cardTop,
        left: side,
        width: cardWidth,
        height: Math.min(cardHeight, tabTop - cardTop - 8),
        radius: 24,
      },
      tabs: {
        top: tabTop,
        left: 0,
        width,
        height: tabHeight,
        radius: 0,
      },
    } as const;

    return {
      side,
      contentWidth,
      headerTop,
      headerHeight,
      categoryTop,
      categoryHeight,
      cardTop,
      cardWidth,
      cardMediaHeight,
      cardBodyHeight,
      cardHeight,
      tabTop,
      tabHeight,
      helpLeft,
      locationLeft,
      actionRowTop,
      actionLeft,
      actionWidth,
      target,
    };
  }, [height, insets.bottom, insets.top, width]);

  const target = metrics.target[step.key];

  const tooltip = useMemo(() => {
    const tooltipWidth = Math.min(width - 24, 350);
    const estimatedHeight = 220;
    const gap = 14;
    const safeTop = insets.top + 8;
    const safeBottom = height - insets.bottom - 8;

    let top = target.top + target.height + gap;

    if (top + estimatedHeight > safeBottom) {
      top = target.top - estimatedHeight - gap;
    }

    if (top < safeTop) {
      top = Math.max(
        safeTop,
        Math.min(
          safeBottom - estimatedHeight,
          target.top + target.height / 2 - estimatedHeight / 2,
        ),
      );
    }

    const left = Math.max(
      12,
      Math.min(
        width - tooltipWidth - 12,
        target.left + target.width / 2 - tooltipWidth / 2,
      ),
    );

    return {
      top,
      left,
      width: tooltipWidth,
    };
  }, [height, insets.bottom, insets.top, target, width]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={complete}
    >
      <SafeAreaView style={styles.root} edges={['left', 'right']}>
        {/* Demo Home screen */}
        <View style={styles.demoScreen}>
          <View
            style={[
              styles.demoHeader,
              {
                top: metrics.headerTop,
                left: metrics.side,
                right: metrics.side,
                height: metrics.headerHeight,
              },
            ]}
          >
            <View style={styles.demoLogoWrap}>
              <View style={styles.demoLogoMark}>
                <Ionicons
                  name="newspaper"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View>
                <Text style={styles.demoLogoTitle}>INMinut</Text>
                <Text style={styles.demoLogoSub}>News in a minute</Text>
              </View>
            </View>

            <View style={styles.demoHeaderActions}>
              <View style={styles.demoIconButton}>
                <Ionicons
                  name="help-circle-outline"
                  size={24}
                  color={AppPalette.brightOrange}
                />
              </View>

              <View style={styles.demoIconButton}>
                <Ionicons
                  name="location-outline"
                  size={24}
                  color={AppPalette.brightOrange}
                />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.demoCategories,
              {
                top: metrics.categoryTop,
                left: metrics.side,
                width: metrics.contentWidth,
                height: metrics.categoryHeight,
              },
            ]}
          >
            {['All', 'Local', 'Sports', 'Business'].map((item, index) => (
              <View
                key={item}
                style={[
                  styles.demoCategoryChip,
                  index === 0 && styles.demoCategoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.demoCategoryText,
                    index === 0 && styles.demoCategoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.demoCard,
              {
                top: metrics.cardTop,
                left: metrics.side,
                width: metrics.cardWidth,
                height: metrics.cardHeight,
              },
            ]}
          >
            <View
              style={[
                styles.demoMedia,
                { height: metrics.cardMediaHeight },
              ]}
            >
              <View style={styles.demoMediaBadge}>
                <Ionicons name="flash" size={12} color="#FFFFFF" />
                <Text style={styles.demoMediaBadgeText}>Breaking</Text>
              </View>

              <View style={styles.demoMediaContent}>
                <Ionicons
                  name="images-outline"
                  size={46}
                  color="#CBD5E1"
                />
                <Text style={styles.demoMediaText}>Demo news image</Text>
              </View>
            </View>

            <View style={styles.demoCardBody}>
              <View style={styles.demoMetaRow}>
                <View style={styles.demoNewsBadge}>
                  <Text style={styles.demoNewsBadgeText}>NEWS</Text>
                </View>
                <Text style={styles.demoDate}>Today</Text>
              </View>

              <Text style={styles.demoTitle} numberOfLines={2}>
                This is a demo news story used for the INMinut app guide
              </Text>

              <Text style={styles.demoDescription} numberOfLines={2}>
                Learn how to read, save, share and refresh news using the main
                controls in the app.
              </Text>

              <View style={styles.demoFooter}>
                <Text style={styles.demoReporter}>INMinut</Text>

                <View style={styles.demoActions}>
                  <View style={styles.demoActionButton}>
                    <Ionicons
                      name="heart-outline"
                      size={18}
                      color={AppPalette.ink}
                    />
                  </View>
                  <View style={styles.demoActionButton}>
                    <Ionicons
                      name="bookmark-outline"
                      size={18}
                      color={AppPalette.ink}
                    />
                  </View>
                  <View
                    style={[
                      styles.demoActionButton,
                      styles.demoWhatsappButton,
                    ]}
                  >
                    <Ionicons
                      name="logo-whatsapp"
                      size={19}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.demoActionButton}>
                    <Ionicons
                      name="share-social-outline"
                      size={18}
                      color={AppPalette.ink}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.demoTabs,
              {
                top: metrics.tabTop,
                height: metrics.tabHeight,
              },
            ]}
          >
            {[
              ['home', 'Home'],
              ['search-outline', 'Search'],
              ['bookmark-outline', 'Saved'],
              ['person-outline', 'Profile'],
            ].map(([icon, label], index) => (
              <View key={label} style={styles.demoTabItem}>
                <Ionicons
                  name={icon as IoniconName}
                  size={22}
                  color={index === 0 ? AppPalette.brightOrange : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.demoTabText,
                    index === 0 && styles.demoTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Spotlight dim layer */}
        <View pointerEvents="none" style={styles.dimLayer} />

        <View
          pointerEvents="none"
          style={[
            styles.targetHighlight,
            {
              top: target.top - 5,
              left: target.left - 5,
              width: target.width + 10,
              height: target.height + 10,
              borderRadius: target.radius + 5,
            },
          ]}
        >
          <View style={styles.pulseOuter}>
            <View style={styles.pulseInner} />
          </View>
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.handWrap,
            {
              top: Math.min(
                height - 64,
                target.top + target.height - 3,
              ),
              left: Math.max(
                4,
                Math.min(
                  width - 60,
                  target.left + target.width / 2 - 28,
                ),
              ),
            },
          ]}
        >
          <Text style={styles.hand}>☝️</Text>
        </View>

        <View style={[styles.tooltipCard, tooltip]}>
          <View style={styles.tooltipHeader}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={step.icon}
                size={22}
                color={AppPalette.brightOrange}
              />
            </View>

            <View style={styles.tooltipTitleWrap}>
              <Text style={styles.counter}>
                Step {stepIndex + 1} / {guideSteps.length}
              </Text>
              <Text style={styles.tooltipTitle}>{step.title}</Text>
            </View>

            <Pressable
              onPress={complete}
              hitSlop={10}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={AppPalette.muted} />
            </Pressable>
          </View>

          <Text style={styles.tooltipBody}>{step.body}</Text>

          <View style={styles.dots}>
            {guideSteps.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.dot,
                  index === stepIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>

          <View style={styles.footerRow}>
            <Pressable
              onPress={() =>
                setStepIndex((prev) => Math.max(0, prev - 1))
              }
              disabled={stepIndex === 0}
              style={[
                styles.backButton,
                stepIndex === 0 && styles.disabledButton,
              ]}
            >
              <Text
                style={[
                  styles.backButtonText,
                  stepIndex === 0 && styles.disabledText,
                ]}
              >
                Back
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (isLast) {
                  complete();
                } else {
                  setStepIndex((prev) => prev + 1);
                }
              }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>
                {isLast ? 'Start using app' : 'Next'}
              </Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={complete} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip guide</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },

  demoScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF5F5',
  },

  demoHeader: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  demoLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  demoLogoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppPalette.brightOrange,
  },

  demoLogoTitle: {
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '900',
    color: AppPalette.ink,
  },

  demoLogoSub: {
    marginTop: 1,
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
    color: AppPalette.muted,
  },

  demoHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  demoIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  demoCategories: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  demoCategoryChip: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  demoCategoryChipActive: {
    backgroundColor: AppPalette.brightOrange,
    borderColor: AppPalette.brightOrange,
  },

  demoCategoryText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: AppPalette.ink,
  },

  demoCategoryTextActive: {
    color: '#FFFFFF',
  },

  demoCard: {
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  demoMedia: {
    width: '100%',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },

  demoMediaContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  demoMediaText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },

  demoMediaBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderTopLeftRadius: 23,
    borderBottomRightRadius: 16,
    backgroundColor: '#EF4444',
  },

  demoMediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  demoCardBody: {
    flex: 1,
    padding: 13,
  },

  demoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  demoNewsBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: AppPalette.brightOrange,
  },

  demoNewsBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  demoDate: {
    fontSize: 10.5,
    fontWeight: '700',
    color: AppPalette.muted,
  },

  demoTitle: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    color: AppPalette.ink,
  },

  demoDescription: {
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    color: AppPalette.slate,
  },

  demoFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  demoReporter: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '900',
    color: AppPalette.ink,
  },

  demoActions: {
    flexDirection: 'row',
    gap: 6,
  },

  demoActionButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  demoWhatsappButton: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },

  demoTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 9,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  demoTabItem: {
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  demoTabText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
  },

  demoTabTextActive: {
    color: AppPalette.brightOrange,
  },

  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.70)',
  },

  targetHighlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: AppPalette.brightOrange,
    backgroundColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pulseOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,49,49,0.24)',
  },

  pulseInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AppPalette.brightOrange,
  },

  handWrap: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hand: {
    fontSize: 43,
  },

  tooltipCard: {
    position: 'absolute',
    borderRadius: 24,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.23,
    shadowRadius: 20,
    elevation: 18,
  },

  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  tooltipTitleWrap: {
    flex: 1,
  },

  counter: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: AppPalette.brightOrange,
  },

  tooltipTitle: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    color: AppPalette.ink,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  tooltipBody: {
    marginTop: 11,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '700',
    color: AppPalette.slate,
  },

  dots: {
    marginTop: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FECACA',
  },

  activeDot: {
    width: 24,
    backgroundColor: AppPalette.brightOrange,
  },

  footerRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 9,
  },

  backButton: {
    flex: 0.9,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: AppPalette.ink,
  },

  disabledButton: {
    opacity: 0.45,
  },

  disabledText: {
    color: AppPalette.muted,
  },

  nextButton: {
    flex: 1.35,
    height: 46,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: AppPalette.brightOrange,
  },

  nextButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  skipButton: {
    position: 'absolute',
    top: 46,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  skipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});

export default AppGuideOverlay;
