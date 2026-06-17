import { Platform } from 'react-native';

const skyBlue = '#FF3131';
const deepBlue = '#B91C1C';
const navyBlue = '#0B0B0D';
const lightBlue = '#FEE2E2';
const softBg = '#FFF5F5';
const ink = '#111111';
const slate = '#475569';
const card = '#FFFFFF';
const white = '#FFFFFF';

export const AppPalette = {
  brightOrange: skyBlue,
  deepOrange: deepBlue,
  yellowishOrange: '#FF6B6B',
  skyBlue,
  deepBlue,
  navyBlue,
  ink,
  slate,
  softBg,
  card,
  success: '#16A34A',
  danger: '#EF4444',
  border: '#FECACA',
  muted: '#64748B',
  blueSurface: lightBlue,
};

export const Colors = {
  brightOrange: skyBlue,
  yellowishOrange: '#FF6B6B',
  skyBlue,
  deepBlue,
  darkCharcoal: navyBlue,
  white,
  light: {
    text: ink,
    background: softBg,
    tint: skyBlue,
    icon: slate,
    tabIconDefault: '#94A3B8',
    tabIconSelected: skyBlue,
  },
  dark: {
    text: white,
    background: navyBlue,
    tint: '#FF6B6B',
    icon: white,
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#FF6B6B',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
