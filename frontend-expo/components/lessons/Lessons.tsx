import { Image } from 'react-native';
import { LessonMeta, parseLesson } from '@/utils/lessonMeta';

// To add a lesson: create lessons/lessonN.md and add a line here.
export const lessonFiles: Record<string, any> = {
    lesson1: require('@/lessons/lesson1.md'),
    lesson2: require('@/lessons/lesson2.md'),
    lesson3: require('@/lessons/lesson3.md'),
    lesson4: require('@/lessons/lesson4.md'),
    lesson5: require('@/lessons/lesson5.md'),
    lesson6: require('@/lessons/lesson6.md'),
    lesson7: require('@/lessons/lesson7.md'),
    lesson8: require('@/lessons/lesson8.md'),
};

export async function loadLesson(id: number): Promise<LessonMeta | null> {
    const asset = lessonFiles[`lesson${id}`];
    if (!asset) return null;
    const uri = Image.resolveAssetSource(asset)?.uri;
    if (!uri) return null;
    const text = await (await fetch(uri)).text();
    return parseLesson(text, id);
}

export async function loadAllLessons(): Promise<LessonMeta[]> {
    const ids = Object.keys(lessonFiles)
        .map(key => parseInt(key.replace('lesson', ''), 10))
        .sort((a, b) => a - b);
    const lessons = await Promise.all(ids.map(loadLesson));
    return lessons.filter((l): l is LessonMeta => l !== null);
}
