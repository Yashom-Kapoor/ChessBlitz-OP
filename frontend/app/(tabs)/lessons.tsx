import { GestureHandlerRootView, Pressable } from "react-native-gesture-handler";
import React, { useEffect, useState } from 'react';
import { ScrollView, View, ActivityIndicator, StyleSheet, ImageBackground, Text, TouchableWithoutFeedback } from 'react-native';
import Lesson from '@/components/lessons/Lesson';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import GlobalStyle from "@/context/GlobalStyle";
import backgroundImages, { BackgroundContext } from "@/context/Backgrounds";
import { BlurView } from "expo-blur";
import getEquidistantSinePoints from "@/utils/EquidistantSinePoints";
import LessonBubble from "@/components/lessons/LessonBubble";

type LessonData = {
  id: number
  name: string;
  desc: string;
  icon?: string;
}

const LESSON_ICONS: Record<string, any> = {
  'default': require('@/assets/images/lessons/default.png'),
}

export default function LessonScreen() {
  const { theme } = useTheme();
  const isTablet = useGlobalSearchParams().isTablet === 'true';

  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false);
  const router = useRouter();
  const API_URL = "http://127.0.0.1:5000/lessons";

  const [lessonBubble, setLessonBubble] = useState<number>(-1);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setLessons(data);
      } catch (error) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, []);

  const completedLessons = 0; // Placeholder for completed lessons logic

  const styles = GlobalStyle(theme, isTablet);
  const localStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      padding: 20,
      gap: 20,
      paddingBottom: 100,
    },
  });
  if (loading) {
    return (
      <View style={[localStyles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="theme.text" />
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundContext theme={theme}>
        <ScrollView contentContainerStyle={{...styles.scrollContainer, height: lessons.length * 300 + 200 }}>
          <Pressable style={{flex: 1}} onPress={() => setLessonBubble(-1)}/>
          {error && (
            <Text style={{ ...styles.b, color: theme.primaryText }} >
              Error loading lessons oopsie daisies i dont think its implemented in backend yet but pretend this works
            </Text>
          )}
          {getEquidistantSinePoints(isTablet ? 220 : 130, 2.5, lessons.length * 7, lessons.length * (isTablet ? 300 : 250), isTablet ? 60 : 35).map((point, i) => {
            if (i % 7 == 0) {
              const lesson = lessons[Math.floor(i / 7)];
              const isAvailable = Math.floor(i / 7) < completedLessons + 1;
              return (
                <View key={i} style={{position: 'static'}}>
                  <Lesson
                    name={lesson.name}
                    description={lesson.desc}
                    id={lesson.id}
                    icon={LESSON_ICONS[lesson.icon || 'default']}
                    offset={{ x: point.y, y: point.x }}
                    available={isAvailable}
                    onPress={() => setLessonBubble(lesson.id)}
                  />
                  {(lessonBubble == lesson.id) && (
                    <LessonBubble
                      name={lessons[lessonBubble - 1].name} 
                      description={lessons[lessonBubble - 1].desc} 
                      offset={{ x: point.y / (isTablet ? 2 : 5), y: point.x }} 
                      available={isAvailable}
                    />
                  )}
                </View>
                
              );
            }
            const isAvailable = Math.floor(i / 7) < completedLessons;
            return <View key={i} style={{ opacity: (i % 7 == 1 || i % 7 == 6 || i > lessons.length * 7 - 6) ? 0 : (isAvailable ? 1 : 0.3), height: isTablet ? 24 : 18, width: isTablet ? 24 : 18, borderRadius: '100%', backgroundColor: theme.secondaryButton, position: 'absolute', 
                left: '50%', top: 60, transform: `translate(${point.y - (isTablet ? 12 : 9)}px, ${point.x - (isTablet ? 12 : 9)}px)`, transformOrigin: 'center', pointerEvents: 'none' }} />;
          })}
        </ScrollView>
      </BackgroundContext>
    </GestureHandlerRootView>
  );
}