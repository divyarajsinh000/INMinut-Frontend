---
name: inminut-change-workflow
description: Use for any INMinut frontend bugfix/feature request to minimize repository scanning, preserve behavior, validate safely and deliver a small patch instead of a full project zip.
---
# Efficient change protocol

1. Read `AGENTS.md` and `docs/ai/PROJECT_MAP.md` only. Select 1–2 relevant task skills.
2. Identify user-specified behavior and affected screen/component. Search specific symbols and imports; open only those files and critical callers/types.
3. Check existing contracts/edge cases; do not infer backend endpoints or silently replace functionality.
4. Make focused edits. Use existing TypeScript, Expo Router, Zustand and shared API client.
5. Validate syntax/types (`npx tsc --noEmit`) and lint (`npm run lint`) when environment is trusted and tools available. Report any pre-existing failures separately.
6. Check relevant UX: initial loading, offline/API errors, navigation, dark mode, permission denial, Android/iOS behavior.
7. Document exactly the paths changed and a short why; for an archive, include only added/modified files in correct relative paths. Never bundle original full project.
8. If architecture/contracts change, update the task skill and `docs/ai/PROJECT_MAP.md`; do not rewrite all documentation.

## Common pitfalls noticed in the supplied snapshot
- `app/(tabs)/index.tsx` is large; avoid rewriting it to change one news card.
- Expo Router route warnings can be cascading effects of missing native modules in Expo Go.
- `react-native-pdf` / `react-native-blob-util` and Android remote push require a compatible custom binary.
- `api/client.ts` has a LAN-IP default; a production environment should use an explicitly validated backend URL.
- Both store-release and OTA update managers exist; do not confuse AAB releases with JS OTA updates.
- Never trust obfuscated content in app config, scripts, or generated files; review before execution.
