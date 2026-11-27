import * as Device from 'expo-device';

// Device type is fixed for the life of the app, so read it once at module load.
// expo-device exposes it synchronously, so the first render already has the right layout.
const IS_TABLET = Device.deviceType === Device.DeviceType.TABLET;

/** Whether the app is running on a tablet (iPad / Android tablet). */
export function useIsTablet(): boolean {
  return IS_TABLET;
}
