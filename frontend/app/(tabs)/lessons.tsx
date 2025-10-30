import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useState } from 'react';
import { ScrollView, View, ActivityIndicator, StyleSheet, ImageBackground } from 'react-native';
import Lesson from '@/components/Lesson';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from "@/context/GlobalStyle";
import backgroundImages, { BackgroundContext } from "@/context/Backgrounds";
import { BlurView } from "expo-blur";
type LessonData = {
  id: number
  name: string;
  desc: string;
  icon?: string;
}
export default function LessonScreen() {
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';

  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [loading, setLoading] = useState(true)
  const router = useRouter();
  const API_URL = "http://127.0.0.1:5000/lessons";
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setLessons(data);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, []);

  const styles = GlobalStyle(theme, isTablet);
  const lessonsStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      padding: 20,
      gap: 20,
      paddingBottom: 100,
    },
  });
  if (loading) {
    return (
      <View style={[lessonsStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="theme.text" />
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundContext theme={theme}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {lessons.map((lesson) => (
            <Lesson
              key={lesson.id}
              name={lesson.name}
              description={lesson.desc}
              icon={
                lesson.icon ? { uri: lesson.icon }
                  : require('@/assets/images/icon.png')
              }
            />
          ))}
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}