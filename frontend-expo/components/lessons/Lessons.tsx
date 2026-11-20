export const lessonPackages = {
  skewer: {
    slug: 'skewer',
    puzzleTheme: 'skewer',
    name: 'Skewer',
  },
  back_rank_mate: {
    slug: 'back_rank_mate',
    puzzleTheme: 'backRankMate',
    name: 'Back Rank Mate',
  },
  zugzwang: {
    slug: 'zugzwang',
    puzzleTheme: 'zugzwang',
    name: 'Zugzwang',
  },
} as const;

export type LessonPackageSlug = keyof typeof lessonPackages;

export const lessonFiles: Record<string, any> = {
  skewer: require('@/lessons/skewer/skewer.md'),
  back_rank_mate: require('@/lessons/back_rank_mate/back_rank_mate.md'),
  zugzwang: require('@/lessons/zugzwang/zugzwang.md'),
  lesson1: require('@/lessons/lesson1.md'),
  lesson2: require('@/lessons/lesson2.md'),
  lesson3: require('@/lessons/lesson3.md'),
  lesson4: require('@/lessons/lesson4.md'),
  lesson5: require('@/lessons/lesson5.md'),
  lesson6: require('@/lessons/lesson6.md'),
  lesson7: require('@/lessons/lesson7.md'),
};

export function puzzleThemeForSlug(slug: string): string | undefined {
  const pack = lessonPackages[slug as LessonPackageSlug];
  return pack?.puzzleTheme;
}
