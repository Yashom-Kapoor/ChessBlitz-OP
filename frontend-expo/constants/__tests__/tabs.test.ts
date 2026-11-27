import { TAB_ROUTES, visibleTabIndex } from '@/constants/tabs';

describe('visibleTabIndex', () => {
  it("returns each tab's position in the visible bar", () => {
    TAB_ROUTES.forEach((name, i) => expect(visibleTabIndex(name)).toBe(i));
  });

  it('returns -1 for routes that are not tabs', () => {
    expect(visibleTabIndex('+not-found')).toBe(-1);
    expect(visibleTabIndex(undefined)).toBe(-1);
  });
});
