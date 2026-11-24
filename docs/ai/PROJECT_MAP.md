# INMinut frontend — concise source map

This index reflects the uploaded repository snapshot (2026-11-24). Check source when details matter.

## Boot and navigation
- `package.json`: Expo Router entry `expo-router/entry`.
- `app.config.js`: Expo config; scheme `inminut`; Android `com.inminut`; iOS `com.news.brekingapp`; deep-link intent `https://inminut.com/news`; runtime policy `appVersion`; EAS project configuration.
- `app/_layout.tsx`: font loading, splash, theme, app initialization, notification listeners, `PlayStoreUpdateManager`, `OTAUpdateManager`, root Stack.
- `app/(tabs)/_layout.tsx`: bottom tabs/icons and safe-area spacing.
- `app/(tabs)/index.tsx`: main news feed, categories, city filters/preferences, news/ad/embed feed mixing, onboarding, notification-opened news.
- `app/(tabs)/explore.tsx`: search over news and embeds.
- `app/(tabs)/saved.tsx`: saved news filtered from in-memory news list.
- `app/(tabs)/notifications.tsx`: preferences/theme and contact/social links (despite route name).
- `app/(tabs)/contact.tsx`: contact tab.
- `app/news/[id].tsx`: news deep-link route.
- `app/modal.tsx`: modal route.

## Network and shared state
- `api/client.ts`: Axios base URL, request/error logs. Env precedence `EXPO_PUBLIC_API_URL` -> `EXPO_PUBLIC_API_BASE_URL` -> hardcoded local fallback. Verify current behavior before changing.
- `api/index.ts`: `NewsItem`, `MediaItem`, `City`, `Category`, `Ad`, `EmbedItem`, `Settings`, guest payload types; news/categories/cities/settings/ads/embeds/guest/tracking endpoint methods.
- `store/index.ts`: Zustand `useAppStore`; fetch actions; selected category, query, theme, city preferences, saved and liked article IDs; persistent storage coordination.
- `utils/storage.ts`: cross-platform storage facade using SecureStore/native and web fallback.

## Notifications, media and sharing
- `utils/notifications.ts`: guest ID/device ID, push token registration, Android channel, permission logic, notification navigation.
- `components/NewsCard.tsx`, `components/AdCard.tsx`, `components/EmbedCard.tsx`: feed cards.
- `components/MediaDisplay.tsx`: images, `expo-video`, native `react-native-pdf` and full-screen media.
- `components/FullScreenImageViewer.tsx`, `components/NewsShareModal.tsx`, `components/BrandedShareImage.tsx`: viewing/sharing presentation.
- `utils/media.ts`: URL/name normalization and media filters.
- `utils/share.ts`: text/file sharing, downloads, printable documents.

## Updates and releases
- `components/PlayStoreUpdateManager.tsx`: Android in-app store update checks.
- `components/OTAUpdateManager.tsx`: EAS OTA update checks/download/reload.
- `eas.json`: dev APK, internal preview, production channel with auto increment.
- `.env.example`: documented variable template (never mistake placeholder LAN address for production).

## Search shortcuts
| User asks about | First files to inspect |
| --- | --- |
| Home feed, ad placement, city filters | `app/(tabs)/index.tsx`, `store/index.ts`, `components/NewsCard.tsx` |
| Search | `app/(tabs)/explore.tsx`, `api/index.ts`, `store/index.ts` |
| Saved/liked | `store/index.ts`, `app/(tabs)/saved.tsx`, `components/NewsCard.tsx` |
| Push/click opens article | `utils/notifications.ts`, `app/_layout.tsx`, `app/news/[id].tsx` |
| PDF/video/media | `components/MediaDisplay.tsx`, `utils/media.ts`, `utils/share.ts` |
| API URL / backend errors | `api/client.ts`, `.env.example`, `api/index.ts` |
| Startup/splash/theme | `app/_layout.tsx`, `components/CustomSplashScreen.tsx`, `store/index.ts` |
| Store/OTA update | `components/PlayStoreUpdateManager.tsx`, `components/OTAUpdateManager.tsx`, `app.config.js`, `eas.json` |

## Limits
This is **frontend only**. Backend implementation and admin workflows are not in this archive. Confirm backend contracts from supplied API examples/source, do not fabricate fields or endpoints.
