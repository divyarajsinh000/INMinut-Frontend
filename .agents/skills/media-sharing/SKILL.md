---
name: inminut-media-sharing
description: Use for image/video/PDF rendering, media URLs, fullscreen previews, saving/downloading or sharing INMinut news content.
---
# Media and sharing

## Read first
`components/MediaDisplay.tsx`, `utils/media.ts`, `utils/share.ts`. For card UX also `components/NewsCard.tsx`, `components/NewsShareModal.tsx`, `components/FullScreenImageViewer.tsx`, `components/BrandedShareImage.tsx`.

## Current design
- Media model: `MediaItem` from `api/index.ts` with `type: image | video | pdf`, `url`, optional `originalName`.
- Images use `expo-image`; video uses `expo-video`; PDF viewer uses `react-native-pdf` (via native blob utility).
- `utils/media.ts` normalizes media URLs/names and filters image media.
- `utils/share.ts` builds news text and provides file download/share/print utilities; uses Expo FileSystem legacy API, Clipboard, Print and Sharing.
- Fullscreen preview and branded share output are separate components.

## Guardrails
- `react-native-pdf` and `react-native-blob-util` need a custom development/production binary; Expo Go errors do not mean a regular JS route is broken.
- Do not replace `expo-video` with deprecated `expo-av`.
- Check null/empty media, remote URLs, MIME/types, file download errors, permissions and platform behavior.
- Keep tracking/counters where news-card share interactions call API.
- Do not hardcode secrets in URLs or share internal API authentication data.
