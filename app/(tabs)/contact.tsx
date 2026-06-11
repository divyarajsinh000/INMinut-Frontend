import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppPalette } from '@/constants/theme';

const CONTACT_EMAIL = 'inminut@gmail.com';
const CONTACT_PHONE = '+91 99999 99999';
const CONTACT_PHONE_DIAL = '+919999999999';

export default function ContactScreen() {
  const openEmail = () => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=INMinut App Support`);
  const callPhone = () => Linking.openURL(`tel:${CONTACT_PHONE_DIAL}`);
  const openWhatsApp = () => Linking.openURL(`https://wa.me/${CONTACT_PHONE_DIAL.replace('+', '')}`);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="headset-outline" size={34} color="#fff" />
          </View>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.subtitle}>Need help with INMinut? Reach us using email, phone, or WhatsApp.</Text>
        </View>

        <Pressable style={styles.contactCard} onPress={openEmail}>
          <View style={styles.iconBox}>
            <Ionicons name="mail-outline" size={24} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{CONTACT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppPalette.muted} />
        </Pressable>

        <Pressable style={styles.contactCard} onPress={callPhone}>
          <View style={styles.iconBox}>
            <Ionicons name="call-outline" size={24} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{CONTACT_PHONE}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppPalette.muted} />
        </Pressable>

        <Pressable style={styles.contactCard} onPress={openWhatsApp}>
          <View style={styles.iconBox}>
            <Ionicons name="logo-whatsapp" size={24} color={AppPalette.brightOrange} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>WhatsApp</Text>
            <Text style={styles.value}>Message us directly</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={AppPalette.muted} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFF6FF' },
  container: { flex: 1, padding: 18, backgroundColor: '#EFF6FF' },
  headerCard: {
    backgroundColor: AppPalette.deepBlue,
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 30, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 21, fontWeight: '700', marginTop: 8 },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppPalette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  label: { color: AppPalette.ink, fontSize: 16, fontWeight: '900' },
  value: { color: AppPalette.slate, fontSize: 13, fontWeight: '700', marginTop: 4 },
});
