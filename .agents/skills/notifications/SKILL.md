---
name: inminut-notifications
description: Use for Expo push notifications, guest device registration, notification permissions/channels, notification taps and opening news from notifications.
---
# Notifications and guest devices

## Read first
`utils/notifications.ts`, `app/_layout.tsx`, then `api/index.ts` and relevant notification UI.

## What exists
- Guest/device IDs persisted using `utils/storage.ts` / Expo storage.
- `registerGuestForPushNotifications` registers a guest, with push token optional when permissions are denied/unavailable.
- `setupAndroidNotificationChannel`, `setupNotificationResponseListener`, `showLocalTestNotification`.
- Notification press data routes to news; related home screen handles notification-opened article.
- Root layout registers notifications on startup/foreground and removes subscriptions on cleanup.
- Backend methods for guest registration and updating preferences are in `api/index.ts`.

## Do not break
- No forced permission request before appropriate UX; handle permission denied gracefully.
- Token may be undefined/null; guest registration should still succeed.
- Guard duplicate registration and listener cleanup; do not add repeated listeners in render.
- `expo-notifications` Android remote push does **not** work fully in Expo Go with SDK 54; test in a compatible development/production build.
- For changes to notification payload, verify backend contract; frontend repo alone cannot prove push payload format.
- Test foreground, background, cold start, tap navigation, denied permission, Android channel.
