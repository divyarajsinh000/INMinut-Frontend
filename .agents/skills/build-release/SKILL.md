---
name: inminut-build-release
description: Use for Expo configuration, EAS development/preview/production builds, Android/iOS release, environment variables, OTA updates, runtime compatibility or native module integration.
---
# Build, release and environment

## Current setup (verify installed versions before changes)
- Expo SDK 54 / Expo Router 6; `expo-dev-client` installed.
- `eas.json`: `development` internal APK/dev client; `preview` internal preview channel; `production` production channel with autoIncrement.
- `app.config.js`: CommonJS export, app version 1.0.0, `runtimeVersion.policy = appVersion`, EAS updates URL, `updates.checkAutomatically = NEVER`, Android `com.inminut`, iOS `com.news.brekingapp`.
- Native directories are not in tracked project snapshot. Preserve CNG approach and use config plugins rather than direct Gradle/Xcode edits unless user requests a switch.
- `components/PlayStoreUpdateManager.tsx` handles Android store update checks; `components/OTAUpdateManager.tsx` checks EAS updates; root layout coordinates both.

## Build matrix
- `npx expo start --dev-client -c`: JS development with installed custom dev client; not a native build.
- `eas build --platform android --profile development`: installable custom dev APK.
- `eas build --platform android --profile production`: production AAB (confirm current profile/build result).
- `eas build --platform ios --profile production`: signed iOS build (requires configured credentials).
- OTA JS/assets only if runtime compatible; native changes/permissions/new native modules require a new binary. Runtime version policy should reflect native compatibility.

## Environment
- `api/client.ts` reads `EXPO_PUBLIC_API_URL`, falling back to `EXPO_PUBLIC_API_BASE_URL`, then hardcoded LAN address. Public env values are bundled, not secrets.
- Physical phones cannot use PC `localhost`; use reachable LAN IP or public backend and correct HTTP/HTTPS/network setup.
- EAS environment values must be available in the relevant build/update environment; avoid promoting LAN URLs to production.

## Safety
- Before running Expo/Node tooling on a newly cloned/untrusted project, inspect `app.config.js`, package scripts and custom plugins for suspicious appended code. Past repository snapshots had obfuscated JavaScript concerns; current uploaded snapshot's app config appears clean at a basic textual inspection, not a security certification.
- Never include or print credentials, `google-services.json`, `.env`, signing keys, or sensitive repo config in an AI patch.
- Config-only inspections do not create native folders; `expo prebuild` and `expo run:android` can generate native files locally.
- Verify merged AAB manifest and app store results rather than assuming config introspection proves final manifest.
