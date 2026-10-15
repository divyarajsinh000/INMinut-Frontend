import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
type UpdateInfo = { immediateAllowed: boolean; flexibleAllowed: boolean; storeVersion?: string | number | null };
type Props = { onInitialCheckComplete?: () => void };

export default function PlayStoreUpdateManager({ onInitialCheckComplete }: Props) {
  const theme = useAppStore((state) => state.theme);
  const isDark = theme === 'dark';
  const [available, setAvailable] = useState<UpdateInfo | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const lastCheck = useRef(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const completed = useRef(false);

  const finishFirstCheck = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onInitialCheckComplete?.();
  }, [onInitialCheckComplete]);

  const check = useCallback(async () => {
    // Native Play Core is only meaningful for production, Google-Play-installed Android builds.
    if (__DEV__ || Platform.OS !== 'android') { finishFirstCheck(); return; }
    if (inFlight.current || Date.now() - lastCheck.current < CHECK_INTERVAL_MS) { finishFirstCheck(); return; }
    inFlight.current = true;
    lastCheck.current = Date.now();
    try {
      // Load the native module only in an Android release build.
      // Existing dev clients do not include ExpoInAppUpdates.
      const ExpoInAppUpdates = require('expo-in-app-updates') as typeof import('expo-in-app-updates');
      const info = await ExpoInAppUpdates.checkForUpdate();
      if (!mounted.current) return;
      if (info.updateAvailable && (info.flexibleAllowed || info.immediateAllowed)) {
        setAvailable({ flexibleAllowed: !!info.flexibleAllowed, immediateAllowed: !!info.immediateAllowed, storeVersion: info.storeVersion });
      } else {
        setAvailable(null);
        finishFirstCheck();
      }
    } catch (cause) {
      console.warn('[Google Play Update] Check failed:', cause);
      finishFirstCheck();
    } finally {
      inFlight.current = false;
    }
  }, [finishFirstCheck]);

  useEffect(() => {
    mounted.current = true;
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => { mounted.current = false; subscription.remove(); };
  }, [check]);

  const later = () => { setAvailable(null); setError(''); finishFirstCheck(); };

  const startUpdate = async () => {
    if (!available || working) return;
    setWorking(true);
    setError('');
    try {
      // Prefer flexible updates so readers can continue using the news feed.
      // If Play only allows immediate, use that native flow instead.
      const immediate = !available.flexibleAllowed && available.immediateAllowed;
      const ExpoInAppUpdates = require('expo-in-app-updates') as typeof import('expo-in-app-updates');
      const started = await ExpoInAppUpdates.startUpdate(immediate);
      if (!started) {
        setError('Google Play could not start the update. Please try again.');
      } else {
        setAvailable(null);
        finishFirstCheck();
      }
    } catch (cause) {
      console.warn('[Google Play Update] Start failed:', cause);
      setError('Unable to start Google Play update. Check your Play Store connection and retry.');
    } finally {
      setWorking(false);
    }
  };

  if (!available) return null;
  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={later}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: isDark ? '#172033' : '#FFFFFF' }]}>
          <View style={styles.iconBubble}><Ionicons name="logo-google-playstore" color="#EA580C" size={34} /></View>
          <Text style={[styles.heading, { color: isDark ? '#FFFFFF' : '#111827' }]}>INMinut update available</Text>
          <Text style={[styles.body, { color: isDark ? '#CBD5E1' : '#64748B' }]}>A newer Android version is available through Google Play. Update to get the latest improvements.</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.updateButton} disabled={working} onPress={startUpdate} accessibilityRole="button">
            {working ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.updateText}>Update with Google Play</Text>}
          </Pressable>
          <Pressable style={styles.laterButton} disabled={working} onPress={later} accessibilityRole="button"><Text style={[styles.laterText, { color: isDark ? '#CBD5E1' : '#64748B' }]}>Later</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 390, borderRadius: 26, padding: 24, alignItems: 'center' },
  iconBubble: { backgroundColor: '#FFF0E5', width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heading: { fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 9 },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  error: { color: '#DC2626', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  updateButton: { width: '100%', backgroundColor: '#EA580C', borderRadius: 14, padding: 14, alignItems: 'center', minHeight: 48 },
  updateText: { color: 'white', fontWeight: '900' },
  laterButton: { paddingVertical: 14, paddingHorizontal: 20 },
  laterText: { fontWeight: '800' },
});
