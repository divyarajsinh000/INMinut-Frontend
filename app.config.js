// app.config.js
// Expo SDK 54-compatible security-focused configuration.
// IMPORTANT: Never place private API keys, service-account JSON, signing keys,
// backend secrets, database credentials, or Expo access tokens in `extra`.

export default ({ config }) => ({
  ...config,

  name: "INMinut",
  slug: "inminut",
  scheme: "inminut",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  runtimeVersion: {
    policy: "appVersion",
  },

  updates: {
    url: "https://u.expo.dev/42677210-2162-4706-9726-10b3c163210b",
    fallbackToCacheTimeout: 0,
    checkAutomatically: "ON_LOAD",
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.news.brekingapp",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["remote-notification"],
      LSApplicationQueriesSchemes: ["whatsapp", "whatsapp-business"],
    },
  },

  android: {
    jsEngine: "hermes",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: false,
    softwareKeyboardLayoutMode: "resize",
    predictiveBackGestureEnabled: false,
    package: "com.news.brekingapp",
    googleServicesFile: "./google-services.json",

    permissions: ["NOTIFICATIONS", "RECEIVE_BOOT_COMPLETED", "VIBRATE"],

    // Prevent dependencies from silently adding permissions the news app does
    // not need. Remove an entry only when that feature is intentionally added.
    blockedPermissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.FOREGROUND_SERVICE_LOCATION",
      "android.permission.READ_CONTACTS",
      "android.permission.WRITE_CONTACTS",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_AUDIO",
      "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
    ],
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
     [
        "react-native-share",
        {
          "ios": ["whatsapp"],
          "android": ["com.whatsapp"]
        }
      ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 220,
        resizeMode: "contain",
        backgroundColor: "#FFF7ED",
        dark: {
          image: "./assets/images/splash-icon-dark.png",
          backgroundColor: "#0F172A",
        },
      },
    ],
    [
      "expo-notifications",
      {
        // Add a dedicated monochrome notification icon when available:
        // icon: "./assets/images/notification-icon.png",
        color: "#0F172A",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableMinifyInReleaseBuilds: true,
        },
      },
    ],
    "expo-secure-store",
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  backgroundColor: "#FFF7ED",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#FFF7ED",
  },

  extra: {
    router: {},
    eas: {
      // Public project identifier, not a secret.
      projectId: "42677210-2162-4706-9726-10b3c163210b",
    },

    // Only public client configuration belongs here, for example:
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    // Never put server tokens, private API keys, or service credentials here.
  },

  owner: "herryjoshi",
});
