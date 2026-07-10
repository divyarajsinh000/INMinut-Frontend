// app.config.js
export default ({ config }) => ({
  ...config,

  name: "INMinut",
  slug: "inminut",
  scheme: "inminut",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/inminut-app-icon.png",
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
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/images/inminut-adaptive-foreground.png",
    },
    edgeToEdgeEnabled: false,
    softwareKeyboardLayoutMode: "resize",
    predictiveBackGestureEnabled: false,
    package: "com.news.brekingapp",
    googleServicesFile: "./google-services.json",
    permissions: ["NOTIFICATIONS", "RECEIVE_BOOT_COMPLETED", "VIBRATE"],
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
    favicon: "./assets/images/inminut-app-icon.png",
  },

  plugins: [
    "expo-router",
    [
      "react-native-share",
      {
        ios: ["whatsapp"],
        android: ["com.whatsapp"],
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/inminut-native-splash.png",
        imageWidth: 120,
        resizeMode: "contain",
        backgroundColor: "#FFF7ED",
        dark: {
          image: "./assets/images/inminut-native-splash.png",
          backgroundColor: "#0F172A",
        },
      },
    ],
    [
      "expo-notifications",
      {
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

  extra: {
    router: {},
    eas: {
      projectId: "42677210-2162-4706-9726-10b3c163210b",
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  },

  owner: "herryjoshi",
});
