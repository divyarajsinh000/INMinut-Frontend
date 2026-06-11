import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CityPreferenceModal from '@/components/CityPreferenceModal';
import { AppPalette } from '@/constants/theme';
import { useAppStore } from '@/store';
import {
  getNotificationsEnabled,
  registerGuestForPushNotifications,
  saveNotificationsEnabled,
  showLocalTestNotification,
} from '@/utils/notifications';

const CONTACT_EMAIL = 'inminut@gmail.com';
const CONTACT_PHONE = '+91 99999 99999';
const CONTACT_PHONE_DIAL = '+919999999999';

export default function NotificationsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showCityModal, setShowCityModal] = useState(false);
  const { cities, selectedCityPreferences, fetchCities, loadCityPreferences, saveCityPreferences } = useAppStore();

  useEffect(() => {
    getNotificationsEnabled().then(setNotificationsEnabled);
    fetchCities();
    loadCityPreferences();
  }, [fetchCities, loadCityPreferences]);

  const handleNotificationToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    await saveNotificationsEnabled(enabled);
    if (enabled) await registerGuestForPushNotifications();
  };

  const selectedCityNames = cities
    .filter((city) => selectedCityPreferences.includes(city._id))
    .map((city) => city.name)
    .join(', ');

  const openEmail = () => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=INMinut App Support`);
  const callPhone = () => Linking.openURL(`tel:${CONTACT_PHONE_DIAL}`);
  const openWhatsApp = () => Linking.openURL(`https://wa.me/${CONTACT_PHONE_DIAL.replace('+', '')}`);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage alerts, local preferences and support details.</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileTitle}>Guest Reader</Text>
            <Text style={styles.profileSub}>Personalized local news feed</Text>
          </View>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications-outline" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingTitle}>Push notifications</Text>
            <Text style={styles.settingSub}>Receive alerts for your selected cities.</Text>
          </View>
          <Switch value={notificationsEnabled} onValueChange={handleNotificationToggle} thumbColor={notificationsEnabled ? AppPalette.brightOrange : undefined} />
        </View>

        <Pressable style={styles.settingCard} onPress={showLocalTestNotification}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingTitle}>Test local notification</Text>
            <Text style={styles.settingSub}>Works in Expo Go for checking permission and local alert.</Text>
          </View>
          <Ionicons name="play-circle-outline" size={24} color={AppPalette.brightOrange} />
        </Pressable>

        <Pressable style={styles.settingCard} onPress={() => setShowCityModal(true)}>
          <View style={styles.settingIcon}>
            <Ionicons name="location-outline" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingTitle}>City preference</Text>
            <Text style={styles.settingSub} numberOfLines={2}>
              {selectedCityNames || 'Choose cities for your feed'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppPalette.muted} />
        </Pressable>

        <Text style={styles.sectionTitle}>Contact details</Text>

        <Pressable style={styles.settingCard} onPress={openEmail}>
          <View style={styles.settingIcon}>
            <Ionicons name="mail-outline" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingTitle}>Email</Text>
            <Text style={styles.settingSub}>{CONTACT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppPalette.muted} />
        </Pressable>

        <Pressable style={styles.settingCard} onPress={callPhone}>
          <View style={styles.settingIcon}>
            <Ionicons name="call-outline" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingTitle}>Phone</Text>
            <Text style={styles.settingSub}>{CONTACT_PHONE}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppPalette.muted} />
        </Pressable>

        <Pressable style={styles.settingCard} onPress={openWhatsApp}>
          <View style={styles.settingIcon}>
            <Ionicons name="logo-whatsapp" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingTitle}>WhatsApp</Text>
            <Text style={styles.settingSub}>Message us directly</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppPalette.muted} />
        </Pressable>

        <CityPreferenceModal
          visible={showCityModal}
          cities={cities}
          selectedCityIds={selectedCityPreferences}
          onClose={() => setShowCityModal(false)}
          onSave={async (cityIds) => {
            await saveCityPreferences(cityIds);
            setShowCityModal(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFF6FF' },
  container: { flex: 1, backgroundColor: '#EFF6FF', padding: 18, paddingTop: 12 },
  title: { fontSize: 28, fontWeight: '900', color: AppPalette.ink },
  subtitle: { fontSize: 14, color: AppPalette.slate, fontWeight: '600', marginTop: 5, marginBottom: 18 },
  profileCard: {
    backgroundColor: AppPalette.brightOrange,
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: { width: 58, height: 58, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  profileTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  profileSub: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 4 },
  sectionTitle: { color: AppPalette.ink, fontSize: 16, fontWeight: '900', marginTop: 6, marginBottom: 10 },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppPalette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  settingTextWrap: { flex: 1 },
  settingTitle: { color: AppPalette.ink, fontWeight: '900', fontSize: 16 },
  settingSub: { color: AppPalette.slate, fontWeight: '600', fontSize: 13, marginTop: 3 },
});
