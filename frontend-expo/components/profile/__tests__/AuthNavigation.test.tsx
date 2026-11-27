/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import RootLayout from '@/app/_layout';

jest.mock('@/api/RandomPuzzleSet', () => ({ fetchRandomPuzzleSet: jest.fn() }));

let mockAuth = { authUserId: 'alice' as string | null, authReady: true };
const mockShopUnmount = jest.fn();
jest.mock('@/context/UserContext', () => ({ UserProvider: ({ children }: any) => children, useUser: () => mockAuth }));
jest.mock('@/context/ThemeContext', () => ({ ThemeProvider: ({ children }: any) => children, useTheme: () => ({ theme: {} }) }));
jest.mock('@/context/PuzzleSettingsContext', () => ({ PuzzleSettingsProvider: ({ children }: any) => children }));
jest.mock('@/context/ShopContext', () => ({ ShopProvider: ({ children }: any) => {
  require('react').useEffect(() => () => mockShopUnmount(), []);
  return children;
} }));
jest.mock('@/context/GlobalStyle', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@/components/GlassBlurView', () => () => null);
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-router/react-navigation', () => ({ getFocusedRouteNameFromRoute: jest.fn() }));
jest.mock('expo-router', () => {
  const Stack = ({ children }: any) => children;
  Stack.Screen = ({ name }: any) => require('react').createElement('screen', { name });
  // Model the documented Stack.Protected contract: denied routes leave the stack.
  Stack.Protected = ({ guard, children }: any) => guard ? children : null;
  return { Stack, useGlobalSearchParams: () => ({}), useNavigation: () => ({}), useRouter: () => ({}) };
});
let root: ReactTestRenderer;
const screens = () => root.root.findAllByType('screen' as any).map(s => s.props.name);
beforeEach(async () => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockAuth = { authUserId: 'alice', authReady: true };
  await act(async () => { root = create(<RootLayout />); });
});
afterEach(async () => { await act(async () => { root.unmount(); }); });
test('logout removes protected screens without remounting the navigator', async () => {
  expect(screens()).toEqual(expect.arrayContaining(['(tabs)', 'puzzles/demo_puzzle', 'lessons/[lesson]']));
  mockAuth = { authUserId: null, authReady: true };
  await act(async () => { root.update(<RootLayout />); });
  expect(screens()).toEqual(['index', 'auth/sign_up', 'auth/log_in', '+not-found']);
  expect(mockShopUnmount).not.toHaveBeenCalled();
});
test('waits for the initial auth session before deciding which routes are available', async () => {
  mockAuth = { authUserId: null, authReady: false };
  await act(async () => { root.update(<RootLayout />); });
  expect(screens()).toEqual([]);
});
