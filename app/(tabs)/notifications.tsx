import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CityPreferenceModal from '@/components/CityPreferenceModal';
import { AppPalette } from '@/constants/theme';
import { useAppStore } from '@/store';

const CONTACT_EMAIL = 'inminut@gmail.com';
const INSTAGRAM_URL = 'https://www.instagram.com/inminut_app/';
const FACEBOOK_URL = 'https://www.facebook.com/INMinut/';
const YOUTUBE_URL = 'https://www.youtube.com/@INMinut';
const X_URL = 'https://x.com/INMinut_app';

export default function NotificationsScreen() {
  const [showCityModal, setShowCityModal] = useState(false);
  const { cities, selectedCityPreferences, fetchCities, loadCityPreferences, saveCityPreferences, theme, setTheme } = useAppStore();

  useEffect(() => {
    fetchCities();
    loadCityPreferences();
  }, [fetchCities, loadCityPreferences]);


  const isDark = theme === 'dark';

  const themeStyles = {
    bg: isDark ? '#111111' : '#FFF5F5',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#111111',
    border: isDark ? '#334155' : '#FECACA',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    iconBg: isDark ? '#334155' : '#FFF5F5',
  };

  const selectedCityNames = cities
    .filter((city) => selectedCityPreferences.includes(city._id))
    .map((city) => city.name)
    .join(', ');

  const openEmail = () => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=INMinut App Support`);
  const openInstagram = () => Linking.openURL(INSTAGRAM_URL);
  const openFacebook = () => Linking.openURL(FACEBOOK_URL);
  const openYoutube = () => Linking.openURL(YOUTUBE_URL);
  const openX = () => Linking.openURL(X_URL);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.bg }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: themeStyles.bg, paddingBottom: 120 }]} showsVerticalScrollIndicator>
        <Text style={[styles.title, { color: themeStyles.text }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: themeStyles.textSecondary }]}>Manage local preferences and support details.</Text>

        

        <View style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: themeStyles.iconBg }]}>
            <Ionicons name="moon-outline" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingTitle, { color: themeStyles.text }]}>Dark mode</Text>
            <Text style={[styles.settingSub, { color: themeStyles.textSecondary }]}>Enable dark colors for theme layout.</Text>
          </View>
          <Switch value={theme === 'dark'} onValueChange={(val) => setTheme(val ? 'dark' : 'light')} thumbColor={theme === 'dark' ? AppPalette.brightOrange : undefined} />
        </View>

        <Pressable style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={() => setShowCityModal(true)}>
          <View style={[styles.settingIcon, { backgroundColor: themeStyles.iconBg }]}>
            <Ionicons name="location-outline" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingTitle, { color: themeStyles.text }]}>City preference</Text>
            <Text style={[styles.settingSub, { color: themeStyles.textSecondary }]} numberOfLines={2}>
              {selectedCityNames || 'Choose cities for your feed'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={themeStyles.textSecondary} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: themeStyles.text }]}>Contact details</Text>

        <Pressable style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={openEmail}>
          <View style={[styles.settingIcon, { backgroundColor: themeStyles.iconBg }]}>
            <Ionicons name="mail-outline" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingTitle, { color: themeStyles.text }]}>Email</Text>
            <Text style={[styles.settingSub, { color: themeStyles.textSecondary }]}>{CONTACT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={themeStyles.textSecondary} />
        </Pressable>

        <Pressable style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={openInstagram}>
          <View style={[styles.settingIcon, { backgroundColor: themeStyles.iconBg }]}>
            <Ionicons name="logo-instagram" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingTitle, { color: themeStyles.text }]}>Instagram</Text>
            <Text style={[styles.settingSub, { color: themeStyles.textSecondary }]}>{'@inminut_app'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={themeStyles.textSecondary} />
        </Pressable>

        <Pressable style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={openFacebook}>
          <View style={[styles.settingIcon, { backgroundColor: themeStyles.iconBg }]}>
            <Ionicons name="logo-facebook" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingTitle, { color: themeStyles.text }]}>Facebook</Text>
            <Text style={[styles.settingSub, { color: themeStyles.textSecondary }]}>{'INMinut'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={themeStyles.textSecondary} />
        </Pressable>

        <Pressable style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={openYoutube}>
          <View style={[styles.settingIcon, { backgroundColor: themeStyles.iconBg }]}>
            <Ionicons name="logo-youtube" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingTitle, { color: themeStyles.text }]}>YouTube</Text>
            <Text style={[styles.settingSub, { color: themeStyles.textSecondary }]}>{'INMinut'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={themeStyles.textSecondary} />
        </Pressable>

        <Pressable style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]} onPress={openX}>
          <View style={[styles.settingIcon, { backgroundColor: themeStyles.iconBg }]}>
            <Ionicons name="logo-twitter" size={22} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingTitle, { color: themeStyles.text }]}>X</Text>
            <Text style={[styles.settingSub, { color: themeStyles.textSecondary }]}>{'@INMinut_app'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={themeStyles.textSecondary} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF5F5' },
  container: { flex: 1, backgroundColor: '#FFF5F5', padding: 18, paddingTop: 12 },
  title: { fontSize: 28, fontWeight: '900', color: AppPalette.ink },
  subtitle: { fontSize: 14, color: AppPalette.slate, fontWeight: '600', marginTop: 5, marginBottom: 18 },
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
  settingIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center' },
  settingTextWrap: { flex: 1 },
  settingTitle: { color: AppPalette.ink, fontWeight: '900', fontSize: 16 },
  settingSub: { color: AppPalette.slate, fontWeight: '600', fontSize: 13, marginTop: 3 },
});
