/**
 * The main tabs, in the order the tab bars show them.
 * Keep in sync with the screen order in IpadPagesBar and NativePagesBar.
 */
export const TAB_ROUTES = ['puzzles', 'lessons', 'ranking', 'shop', 'profile'] as const;

/**
 * Where a tab sits in the visible tab bar, or -1 if it isn't one of the main tabs.
 * Don't use the navigator state's index for this: expo-router keeps hidden routes in
 * that state, so its index can run ahead of the tabs you actually see.
 */
export function visibleTabIndex(routeName: string | undefined): number {
  return TAB_ROUTES.indexOf(routeName as (typeof TAB_ROUTES)[number]);
}
