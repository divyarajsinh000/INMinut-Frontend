---
name: inminut-screens-navigation
description: Use when changing the INMinut Expo Router tabs, home news feed, search, saved items, navigation, filters, onboarding, or UI theme.
---
# Screens and navigation

Start with `docs/ai/PROJECT_MAP.md`. For a tab change read `app/(tabs)/_layout.tsx` + the relevant screen only; for app startup use `app/_layout.tsx`.

## Current routes
- `(tabs)/index` home news feed (large file; prefer search for symbol/feature before reading it entirely).
- `(tabs)/explore` search news and embeds.
- `(tabs)/saved` saved news list.
- `(tabs)/notifications` settings/preferences/support/social page.
- `(tabs)/contact` contact.
- `/news/[id]` deep link news redirect.
- `/modal` auxiliary route.

## Home feed specifics
- `index.tsx` merges news items with advertisements and embeds, with per-item positioning and category targeting. Preserve sponsored content ordering, scroll logic, refresh and view/impression tracking.
- City preferences and feed city selections are separate concepts. Check `store/index.ts`, `CityPreferenceModal`, `CityFilter` before altering filtering.
- `NewsCard`, `AdCard`, `EmbedCard` are reusable renderers: modify there for card-only changes instead of rewriting home screen.
- Search screen updates `searchQuery`; check matching API/store behavior for network requests and embed matching.
- Saved screen derives saved articles from currently fetched `news`; if changing persistence or pagination, check implications.

## Guardrails and checks
- Expo Router screens must default-export a React component. Route warnings may be secondary to import-time native-module failures; inspect logs before rewriting routes.
- Match dark/light theme and safe-area tab navigation; preserve app deep-link routes.
- Verify initial load, pull-to-refresh, filter reset, empty states, tab navigation, save/like updates, notification-opened news.
