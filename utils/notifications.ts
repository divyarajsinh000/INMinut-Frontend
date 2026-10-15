import * as SecureStore from '@/utils/storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { logger } from '@/utils/logger';
import { api } from '@/api';
import uuid from 'react-native-uuid';
const GUEST_ID_KEY = 'guest_id';
const DEVICE_ID_KEY = 'device_id';
const CITY_PREFERENCES_KEY = 'city_preferences';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const createDeviceId = () => {
  return uuid.v4();
};

export const getOrCreateDeviceId = async () => {
  const existingDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId = createDeviceId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, newDeviceId);
  return newDeviceId;
};

export const getOrCreateGuestId = async () => {
  const deviceId = await getOrCreateDeviceId();
  const expectedGuestId = `guest_${deviceId}`;
  const existingGuestId = await SecureStore.getItemAsync(GUEST_ID_KEY);

  // Force device based guestId so every physical phone has a separate identity.
  // Old random guest ids can make tracking/registration confusing across clears.
  if (existingGuestId !== expectedGuestId) {
    await SecureStore.setItemAsync(GUEST_ID_KEY, expectedGuestId);
  }

  return expectedGuestId;
};

let lastHandledNotificationIdentifier: string | null = null;

const openNotificationNews = (
  response: Notifications.NotificationResponse | null | undefined
) => {
  if (!response) return;

  const identifier = response.notification.request.identifier;
  if (identifier && lastHandledNotificationIdentifier === identifier) return;

  const data = response.notification.request.content.data as {
    type?: unknown;
    newsId?: unknown;
  };

  const newsId = typeof data?.newsId === 'string' ? data.newsId.trim() : '';
  const type = typeof data?.type === 'string' ? data.type : '';

  logger('Notification clicked:', data);

  if (type !== 'news' || !newsId) {
    logger('Notification does not contain a valid newsId.');
    return;
  }

  lastHandledNotificationIdentifier = identifier || newsId;

  // Open Home and pass the exact news ID. Home fetches /api/news/:id.
  setTimeout(() => {
    router.replace({
      pathname: '/(tabs)',
      params: {
        newsId,
        newsSource: 'notification',
      },
    });
  }, 100);
};

export const setupNotificationResponseListener = () => {
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener(openNotificationNews);

  const receivedSubscription =
    Notifications.addNotificationReceivedListener((notification) => {
      logger(
        'Notification received:',
        JSON.stringify(notification, null, 2)
      );
    });

  // Handles a notification that launched the app from a fully closed state.
  Notifications.getLastNotificationResponseAsync()
    .then(openNotificationNews)
    .catch((error) => logger('Unable to read last notification response:', error));

  return {
    remove: () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    },
  };
};

export const setupAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('breaking_news', {
    name: 'Breaking News',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0EA5E9',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0EA5E9',
    sound: 'default',
  });
};

// Register an installation even if notification permissions are denied.
// A push token is an optional property, not proof that the app was installed.
let registeringGuest: Promise<string | null> | null = null;
let lastSuccessfulRegistrationAt = 0;
export const registerGuestForPushNotifications = (): Promise<string | null> => {
  if (registeringGuest) return registeringGuest;
  if (Date.now() - lastSuccessfulRegistrationAt < 30 * 60 * 1000) return Promise.resolve(null);
  registeringGuest = (async () => {
    const deviceId = await getOrCreateDeviceId();
    const guestId = await getOrCreateGuestId();
    let expoPushToken: string | undefined;
    let notificationsEnabled = false;
    try {
      await setupAndroidNotificationChannel();
      if (Device.isDevice) {
        const permission = await Notifications.getPermissionsAsync();
        let status = permission.status;
        if (status === 'undetermined') {
          status = (await Notifications.requestPermissionsAsync()).status;
        }
        notificationsEnabled = status === 'granted';
        const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
        if (notificationsEnabled && projectId) {
          expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
      }
    } catch (error) {
      logger('Push token unavailable; registering installation without notifications:', error);
    }
    try {
      const saved = await SecureStore.getItemAsync(CITY_PREFERENCES_KEY);
      let cityPreferences: string[] = [];
      try {
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) cityPreferences = parsed;
      } catch { /* ignore corrupt local preferences */ }
      await api.registerGuestUser({
        guestId, deviceId, expoPushToken,
        platform: Platform.OS,
        deviceName: Device.deviceName || undefined,
        appVersion: Constants.nativeAppVersion || Constants.expoConfig?.version,
        notificationsEnabled,
        cityPreferences,
      });
      lastSuccessfulRegistrationAt = Date.now();
    } catch (error) {
      logger('Guest device registration failed:', error);
    }
    return expoPushToken || null;
  })().finally(() => { registeringGuest = null; });
  return registeringGuest;
};

export const showLocalTestNotification = async () => {
  await setupAndroidNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const permissionResponse = await Notifications.requestPermissionsAsync();
    finalStatus = permissionResponse.status;
  }

  if (finalStatus !== 'granted') {
    logger('Notification permission not granted for local test.');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'INMinut Test Notification',
      body: 'Local notification is working.',
      sound: 'default',
    },
    trigger: null,
  });
};

