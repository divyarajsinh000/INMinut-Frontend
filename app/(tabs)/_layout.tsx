import { Tabs, router } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const active = Colors[colorScheme].tint;
  const insets = useSafeAreaInsets();

  // Keep the tab buttons above Android gesture / navigation controls.
  // On devices without a bottom inset we still keep a little visual padding.
  const bottomSafeSpace = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor:
          colorScheme === 'dark' ? '#64748B' : '#98A2B3',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: { overflow: 'visible' },
        tabBarStyle: {
          height: 68 + bottomSafeSpace,
          paddingTop: 8,
          paddingBottom: bottomSafeSpace,
          borderTopWidth: 0,
          backgroundColor:
            colorScheme === 'dark' ? '#111111' : '#FFFFFF',
          elevation: 10,
          shadowColor:
            colorScheme === 'dark' ? '#000000' : '#B91C1C',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: {
            width: 0,
            height: -6,
          },
        },
        tabBarItemStyle: {
          paddingTop: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="filter"
        listeners={{ tabPress: (event) => {
          event.preventDefault();
          router.navigate({ pathname: '/(tabs)', params: { openFilters: String(Date.now()) } });
        } }}
        options={{
          title: 'Filter',
          tabBarShowLabel: true,
          tabBarLabel: 'Filter',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '800', color: AppPalette.brightOrange, marginTop: 4 },
          tabBarItemStyle: { paddingTop: 0, overflow: 'visible' },
          tabBarAccessibilityLabel: 'Open news filters',
          tabBarIcon: () => (
            <View style={[styles.filterButton, { borderColor: colorScheme === 'dark' ? '#111111' : '#FFFFFF' }]}>
              <Ionicons name="options-outline" size={29} color="#FFFFFF" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'bookmark' : 'bookmark-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="contact"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  filterButton: { width: 62, height: 62, borderRadius: 31, backgroundColor: AppPalette.brightOrange,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginTop: -20,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
});
