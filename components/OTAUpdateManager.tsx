import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useAppStore } from '@/store';

// Avoid repeated checks when switching between apps. Expo may rate-limit frequent checks.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
type Phase = 'hidden' | 'available' | 'downloading' | 'ready' | 'restarting' | 'error';

export default function OTAUpdateManager() {
  const theme = useAppStore((state) => state.theme);
  const isDark = theme === 'dark';
  const [phase, setPhase] = useState<Phase>('hidden');
  const [errorText, setErrorText] = useState('');
  const lastCheckAt = useRef(0);
  const checking = useRef(false);
  const busy = useRef(false);
  const hasDownloaded = useRef(false);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;
    if (checking.current || busy.current || hasDownloaded.current) return;
    if (Date.now() - lastCheckAt.current < CHECK_INTERVAL_MS) return;

    checking.current = true;
    lastCheckAt.current = Date.now();
    try {
      // checkForUpdateAsync only checks metadata; it doesn't download anything.
      const result = await Updates.checkForUpdateAsync();
      if (mounted.current && result.isAvailable) setPhase('available');
    } catch (error) {
      // Don't block news reading when the app is offline or the check times out.
      console.warn('[OTA] Check failed:', error);
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // On initial launch, check only after native and JS navigation are ready.
    void check();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void check();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [check]);

  const download = async () => {
    if (busy.current) return;
    busy.current = true;
    setErrorText('');
    setPhase('downloading');
    try {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        hasDownloaded.current = true;
        setPhase('ready');
      } else {
        // A rollback or an update no longer available should not show a false success.
        setPhase('hidden');
        lastCheckAt.current = 0;
      }
    } catch (error) {
      console.warn('[OTA] Download failed:', error);
      setErrorText('Could not download the update. Please check your internet connection and retry.');
      setPhase('error');
    } finally {
      busy.current = false;
    }
  };

  const restart = async () => {
    if (busy.current) return;
    busy.current = true;
    setPhase('restarting');
    try {
      await Updates.reloadAsync();
      // reloadAsync replaces the running JS. Do not perform work after success.
    } catch (error) {
      console.warn('[OTA] Restart failed:', error);
      setErrorText('The update was downloaded but could not restart. Close and reopen the app to apply it.');
      setPhase('error');
      busy.current = false;
    }
  };

  const dismiss = () => {
    if (busy.current || phase === 'downloading' || phase === 'restarting') return;
    setPhase('hidden');
  };

  const downloaded = hasDownloaded.current;
  const canDismiss = phase === 'available' || phase === 'ready' || phase === 'error';
  const isBusy = phase === 'downloading' || phase === 'restarting';
  const bg = isDark ? '#172033' : '#FFFFFF';
  const textColor = isDark ? '#F8FAFC' : '#111827';
  const secondary = isDark ? '#BAC7D8' : '#64748B';
  const border = isDark ? '#334155' : '#FEE2E2';

  if (phase === 'hidden') return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
          <View style={styles.iconCircle}>
            {isBusy ? (
              <ActivityIndicator color="#EA580C" size="large" />
            ) : (
              <Ionicons name={phase === 'ready' ? 'checkmark-circle-outline' : 'cloud-download-outline'} size={34} color="#EA580C" />
            )}
          </View>

          <Text style={[styles.title, { color: textColor }]}>
            {phase === 'available' ? 'New update available' :
             phase === 'downloading' ? 'Downloading update' :
             phase === 'ready' ? 'Update ready!' :
             phase === 'restarting' ? 'Restarting INMinut' :
             'Update interrupted'}
          </Text>
          <Text style={[styles.description, { color: secondary }]}>
            {phase === 'available' ? 'A new INMinut update is available. Download it to get the latest improvements.' :
             phase === 'downloading' ? 'Downloading the latest changes. Please keep the app open.' :
             phase === 'ready' ? 'The update is downloaded. Restart to start using the latest version.' :
             phase === 'restarting' ? 'Applying your update…' : errorText}
          </Text>
          {phase === 'downloading' && (
            <View style={[styles.progressTrack, { backgroundColor: border }]}>
              <View style={styles.progressIndeterminate} />
            </View>
          )}

          {(phase === 'available' || phase === 'ready' || phase === 'error') && (
            <Pressable
              accessibilityRole="button"
              onPress={phase === 'ready' || (phase === 'error' && downloaded) ? restart : download}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>
                {phase === 'ready' || (phase === 'error' && downloaded) ? 'Restart to Update' :
                 phase === 'error' ? 'Retry Download' : 'Download Update'}
              </Text>
            </Pressable>
          )}
          {canDismiss && (
            <Pressable accessibilityRole="button" onPress={dismiss} style={styles.secondaryButton}>
              <Text style={[styles.secondaryText, { color: secondary }]}>Later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)', paddingHorizontal: 22,
  },
  card: {
    width: '100%', maxWidth: 390, paddingHorizontal: 24, paddingTop: 28,
    paddingBottom: 16, borderRadius: 26, borderWidth: 1, alignItems: 'center',
  },
  iconCircle: {
    width: 74, height: 74, backgroundColor: '#FFF0E5', borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 9 },
  description: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  primaryButton: {
    width: '100%', backgroundColor: '#EA580C', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { fontWeight: '900', color: '#FFFFFF', fontSize: 14 },
  secondaryButton: { paddingVertical: 14, paddingHorizontal: 18 },
  secondaryText: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 6, width: '100%', borderRadius: 99, overflow: 'hidden', marginBottom: 20 },
  progressIndeterminate: { height: '100%', width: '45%', borderRadius: 99, backgroundColor: '#EA580C' },
});
