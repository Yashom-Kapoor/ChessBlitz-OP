import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, View, StyleSheet, Easing, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemeProvider } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        tabBarInactiveBackgroundColor: theme.headerBackground,
        tabBarActiveBackgroundColor: theme.headerBackground,
        tabBarInactiveTintColor: theme.primaryText,
        headerStyle: {
          backgroundColor: theme.headerBackground,
        },
        headerTitleStyle: {
          color: theme.titleText,
        },
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            paddingBottom: 0,
          },
          default: {
            paddingBottom: 0,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="daily"
        options={{
          title: 'Daily',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "clock.fill" : "clock"} color={color} />,
          tabBarActiveTintColor: theme.dark ? '#93FF8F' : '#388E3C'
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "puzzlepiece.extension.fill" : "puzzlepiece.extension"} color={color} />,
          tabBarActiveTintColor: theme.dark ? '#94CFFF' : '#1565C0'
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "trophy.fill" : "trophy"} color={color} />,
          tabBarActiveTintColor: theme.dark ? '#FFF37E' : '#F9A825'
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "person.fill" : "person"} color={color} />,
          tabBarActiveTintColor: theme.dark ? '#FF7E7E' : '#D32F2F'
        }}
      />
      <Tabs.Screen
        name="themes"
        options={{
          title: 'Themes',
          tabBarIcon: ({ color, focused }) => <IconSymbol size={28} name={focused ? "paintbrush.fill" : "paintbrush"} color={color} />,
          tabBarActiveTintColor: theme.dark ? '#fff' : '#616161'
        }}
      />
    </Tabs>
  );
}