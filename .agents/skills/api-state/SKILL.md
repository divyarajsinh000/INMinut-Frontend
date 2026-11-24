---
name: inminut-api-state
description: Use for INMinut mobile API endpoints, TypeScript response types, Axios URL handling, guest registration, Zustand state, local preferences and saved/liked data.
---
# API and Zustand state

## Source of truth
- `api/client.ts`: Axios client + env precedence and development logs.
- `api/index.ts`: exported API methods and response interfaces.
- `store/index.ts`: `useAppStore`, fetch/loading state and actions.
- `utils/storage.ts`: native/web storage bridge.

## Current endpoint map (verify current code before editing)
- `GET /api/news`, `GET /api/news/:id`
- `GET /api/advertisements`, `GET /api/embeds`, `GET /api/categories`, `GET /api/locations/cities`, `GET /api/settings`
- `POST /api/guest-users`
- `PATCH /api/guest-users/:guestId/notifications`, `PATCH /api/guest-users/:guestId/cities`
- `POST /api/news/:newsId/track`, `POST /api/advertisements/:adId/track`, `POST /api/embeds/:embedId/track`

## Conventions
- Add/change network calls in `api/index.ts`, reuse shared `apiClient`; update `NewsItem`/related interfaces where needed.
- Put shared async state transitions in the existing store; avoid duplicating server fetches in UI without reason.
- `getNews` uses category/search and serializes `cityIds` as JSON in query params. Confirm contract for changes.
- Preserve guest IDs and interaction tracking; `toggleSavedNews`, `toggleLikedNews`, city preferences and theme use persistence.
- Env variables are **publicly inlined** for Expo clients: never put backend secrets there.
- Config currently checks `EXPO_PUBLIC_API_URL` first, then `EXPO_PUBLIC_API_BASE_URL`, then a LAN IP fallback. Avoid accidentally building with a local fallback, and never assume the `.env.example` IP is universal.
- When debugging `//api/` URLs, examine both baseURL trailing slash and endpoint leading slash; normalize carefully without breaking paths.

## Verification
- Confirm payload names and response nesting from real source/examples.
- Test loading/error/empty states, store persistence across restart, offline failures and unhandled API errors.
