import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/api';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
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
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateDeviceId = async () => {
  const existingDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId = createDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  return newDeviceId;
};

export const getOrCreateGuestId = async () => {
  const deviceId = await getOrCreateDeviceId();
  const expectedGuestId = `guest_${deviceId}`;
  const existingGuestId = await AsyncStorage.getItem(GUEST_ID_KEY);

  // Force device based guestId so every physical phone has a separate identity.
  // Old random guest ids can make tracking/registration confusing across clears.
  if (existingGuestId !== expectedGuestId) {
    await AsyncStorage.setItem(GUEST_ID_KEY, expectedGuestId);
  }

  return expectedGuestId;
};

export const getNotificationsEnabled = async () => {
  const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);

  if (value === null) {
    return true;
  }

  return value === 'true';
};

export const setupNotificationResponseListener = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    console.log('Notification clicked:', data);
  });

  return subscription;
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

export const saveNotificationsEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));

  const guestId = await getOrCreateGuestId();
  const deviceId = await getOrCreateDeviceId();

  try {
    await api.updateGuestNotificationPreference(guestId, enabled, deviceId);
  } catch (error: any) {
    console.log('updateGuestNotificationPreference error:', {
      guestId,
      deviceId,
      enabled,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
  }
};

export const registerGuestForPushNotifications = async () => {
  try {
    await setupAndroidNotificationChannel();

    const deviceId = await getOrCreateDeviceId();
    const guestId = await getOrCreateGuestId();

    if (!Device.isDevice) {
      console.log('Push notifications need a physical device.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const permissionResponse = await Notifications.requestPermissionsAsync();
      finalStatus = permissionResponse.status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted.');
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');

      try {
        await api.updateGuestNotificationPreference(guestId, false, deviceId);
      } catch (error: any) {
        console.log('permission denied preference update skipped:', {
          guestId,
          deviceId,
          status: error?.response?.status,
          data: error?.response?.data,
        });
      }

      return null;
    }

    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.log('Missing EAS projectId. Run eas init first.');
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResponse.data;

    const savedCities = await AsyncStorage.getItem(CITY_PREFERENCES_KEY);
    const cityPreferences = savedCities ? JSON.parse(savedCities) : [];

    console.log('Expo Push Token generated:', expoPushToken);
    console.log('Sending token to backend:', {
      guestId,
      deviceId,
      expoPushToken,
      platform: Platform.OS,
      projectId,
      deviceName: Device.deviceName,
    });

    const registeredGuest = await api.registerGuestUser({
      guestId,
      deviceId,
      expoPushToken,
      platform: Platform.OS,
      deviceName: Device.deviceName || undefined,
      appVersion: Constants.expoConfig?.version,
      notificationsEnabled: true,
      cityPreferences: Array.isArray(cityPreferences) ? cityPreferences : [],
    });

    const deviceMatched = Array.isArray(registeredGuest?.devices)
      ? registeredGuest.devices.find((device: any) => device.deviceId === deviceId || device.expoPushToken === expoPushToken)
      : null;

    console.log('Guest registered successfully:', {
      id: registeredGuest?._id,
      guestId: registeredGuest?.guestId,
      deviceId,
      expoPushToken,
      matchedDeviceId: deviceMatched?.deviceId,
      devicesCount: Array.isArray(registeredGuest?.devices) ? registeredGuest.devices.length : 0,
      notificationsEnabled: registeredGuest?.notificationsEnabled,
    });

    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');

    return expoPushToken;
  } catch (error: any) {
    console.log('registerGuestForPushNotifications error:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    return null;
  }
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
    console.log('Notification permission not granted for local test.');
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
