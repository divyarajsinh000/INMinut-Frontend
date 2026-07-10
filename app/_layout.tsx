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
    registerGuestForPushNotifications();

    const notificationResponseSubscription =
      setupNotificationResponseListener();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          registerGuestForPushNotifications();
        }
      },
    );

    return () => {
      notificationResponseSubscription?.remove?.();
      appStateSubscription?.remove?.();
    };
  }, [loadTheme]);

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
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
