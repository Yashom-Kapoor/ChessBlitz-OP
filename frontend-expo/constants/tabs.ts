/**
 * The main tabs, in the order the tab bars show them, with the name, SF Symbol icons and
 * colours the bars and page headings share.
 */
export const TAB_INFO = {
  lessons: { title: 'Lessons', icon: 'book', selectedIcon: 'book.fill', color: { dark: '#94CFFF', light: '#2e75c6' } },
  puzzles: { title: 'Puzzles', icon: 'puzzlepiece.extension', selectedIcon: 'puzzlepiece.extension.fill', color: { dark: '#93FF8F', light: '#29be31' } },
  home: { title: 'Home', icon: 'house', selectedIcon: 'house.fill', color: { dark: '#C9A7FF', light: '#8a4fd8' } },
  // Classroom keeps the trophy icon for now.
  classroom: { title: 'Classroom', icon: 'trophy', selectedIcon: 'trophy.fill', color: { dark: '#FFF37E', light: '#ffa90a' } },
  shop: { title: 'Shop', icon: 'cart', selectedIcon: 'cart.fill', color: { dark: '#6bddcd', light: '#0aa3a5' } },
} as const;

export type TabName = keyof typeof TAB_INFO;

export const TAB_ROUTES = Object.keys(TAB_INFO) as TabName[];

/** A tab's colour for the current theme. */
export function tabColor(tab: TabName, dark: boolean): string {
  return dark ? TAB_INFO[tab].color.dark : TAB_INFO[tab].color.light;
}

/**
 * Where a tab sits in the visible tab bar, or -1 if it isn't one of the main tabs.
 * Don't use the navigator state's index for this: expo-router keeps hidden routes in
 * that state, so its index can run ahead of the tabs you actually see.
 */
export function visibleTabIndex(routeName: string | undefined): number {
  return TAB_ROUTES.indexOf(routeName as TabName);
}
