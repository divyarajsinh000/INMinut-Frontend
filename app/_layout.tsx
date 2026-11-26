import "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppState, LogBox, Platform } from "react-native";
import { useCallback, useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  HindVadodara_300Light,
  HindVadodara_400Regular,
  HindVadodara_500Medium,
  HindVadodara_600SemiBold,
  HindVadodara_700Bold,
} from "@expo-google-fonts/hind-vadodara";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import OTAUpdateManager from '@/components/OTAUpdateManager';
import PlayStoreUpdateManager from '@/components/PlayStoreUpdateManager';
import CustomSplashScreen from "@/components/CustomSplashScreen";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store";
import {
  registerGuestForPushNotifications,
  setupNotificationResponseListener,
} from "@/utils/notifications";

if (Platform.OS === "web") {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("props.pointerEvents is deprecated")
    ) {
      return;
    }
    originalWarn(...args);
  };
} else {
  LogBox.ignoreLogs(["props.pointerEvents is deprecated"]);
}

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const loadTheme = useAppStore((state) => state.loadTheme);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [playCheckFinished, setPlayCheckFinished] = useState(Platform.OS !== "android");

  const [loaded, error] = useFonts({
    HindVadodara_300Light,
    HindVadodara_400Regular,
    HindVadodara_500Medium,
    HindVadodara_600SemiBold,
    HindVadodara_700Bold,
  });

  useEffect(() => {
    if (!loaded && !error) return;

    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (hideError) {
        console.warn("Unable to hide native splash screen:", hideError);
      }
    };

    hideNativeSplash();
  }, [loaded, error]);

  useEffect(() => {
    loadTheme();
    const notificationResponseSubscription =
      setupNotificationResponseListener();

    return () => {
      notificationResponseSubscription?.remove?.();
    };
  }, [loadTheme]);

  useEffect(() => {
    if ((!loaded && !error) || showCustomSplash || !playCheckFinished) return;

    // Request only after the main screen and startup update check are ready.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const registerWhenActive = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (AppState.currentState === "active") {
          void registerGuestForPushNotifications();
        }
      }, 500);
    };
    registerWhenActive();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") registerWhenActive();
      else if (timer) clearTimeout(timer);
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [loaded, error, showCustomSplash, playCheckFinished]);

  const handleCustomSplashFinish = useCallback(() => {
    setShowCustomSplash(false);
  }, []);

  if (!loaded && !error) {
    return null;
  }

  if (showCustomSplash) {
    return <CustomSplashScreen onFinish={handleCustomSplashFinish} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="news/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="news/reader" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
          <PlayStoreUpdateManager onInitialCheckComplete={() => setPlayCheckFinished(true)} />
          {playCheckFinished && <OTAUpdateManager />}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
