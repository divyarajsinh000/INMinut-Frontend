import { Platform } from 'react-native';

const skyBlue = '#0EA5E9';
const deepBlue = '#0F3D8E';
const navyBlue = '#0B1E3F';
const lightBlue = '#E0F2FE';
const softBg = '#EFF6FF';
const ink = '#0F172A';
const slate = '#475569';
const card = '#FFFFFF';
const white = '#FFFFFF';

export const AppPalette = {
  brightOrange: skyBlue,
  deepOrange: deepBlue,
  yellowishOrange: '#38BDF8',
  skyBlue,
  deepBlue,
  navyBlue,
  ink,
  slate,
  softBg,
  card,
  success: '#16A34A',
  danger: '#EF4444',
  border: '#BAE6FD',
  muted: '#64748B',
  blueSurface: lightBlue,
};

export const Colors = {
  brightOrange: skyBlue,
  yellowishOrange: '#38BDF8',
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
    tint: '#38BDF8',
    icon: white,
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#38BDF8',
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
