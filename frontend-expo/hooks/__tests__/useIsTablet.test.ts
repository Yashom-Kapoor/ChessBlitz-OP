/// <reference types="jest" />
// useIsTablet reads the device type once at module load, so each case loads a fresh copy
// of the hook against a mocked expo-device.
const DeviceType = { UNKNOWN: 0, PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 };

function loadHookWith(deviceType: number | null): () => boolean {
  let hook!: () => boolean;
  jest.isolateModules(() => {
    jest.doMock('expo-device', () => ({ deviceType, DeviceType }));
    hook = require('@/hooks/useIsTablet').useIsTablet;
  });
  return hook;
}

afterEach(() => { jest.dontMock('expo-device'); });

test('a tablet reports true, so the iPad navbar and layout are used', () => {
  expect(loadHookWith(DeviceType.TABLET)()).toBe(true);
});

test('phones and unknown devices report false', () => {
  expect(loadHookWith(DeviceType.PHONE)()).toBe(false);
  expect(loadHookWith(DeviceType.UNKNOWN)()).toBe(false);
  expect(loadHookWith(null)()).toBe(false);
});
