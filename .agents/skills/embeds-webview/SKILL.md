---
name: inminut-embeds-webview
description: Use for embed cards, WebView navigation, provider URLs, click tracking and category targeting.
---
# Embed handling
Read components/EmbedCard.tsx, api/index.ts, store/index.ts and relevant home/search screen. Preserve card height and theme. Home sends category or all (global only); search is independent and searches all enabled embeds. Missing categories are not global. Backend must implement the category parameter. Reject unknown schemes; translate known Instagram intents to HTTPS, handle Spotify via Linking with content fallback, never execute arbitrary intent payloads. Keep HTTP mixed content disabled and file access disabled. Native HTML embeds depend on backend sanitization and approved scripts; web uses sandboxed iframe. Do not add sensitive data to the WebView bridge. Click tracking is best-effort with 900ms suppression, not exact cross-origin iframe analytics. Test real devices and provider restrictions; an iframe error may not reach the outer WebView. No native config change is required for this patch.
