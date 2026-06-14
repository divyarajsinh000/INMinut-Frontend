import 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, LogBox, Platform } from 'react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store';
import {
  registerGuestForPushNotifications,
  setupNotificationResponseListener,
} from '@/utils/notifications';

if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('props.pointerEvents is deprecated')) {
      return;
    }
    originalWarn(...args);
  };
} else {
  LogBox.ignoreLogs(['props.pointerEvents is deprecated']);
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const loadTheme = useAppStore((state) => state.loadTheme);

  useEffect(() => {
    loadTheme();
    registerGuestForPushNotifications();

    const notificationResponseSubscription = setupNotificationResponseListener();

    // Expo can rotate/refresh push tokens and Expo Go can be cleared. Re-register
    // whenever app becomes active so every physical device keeps its own device row alive.
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        registerGuestForPushNotifications();
      }
    });

    return () => {
      notificationResponseSubscription?.remove?.();
      appStateSubscription?.remove?.();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
