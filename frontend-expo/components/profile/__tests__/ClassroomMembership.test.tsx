/// <reference types="jest" />
import React, { act } from 'react';
import { create, ReactTestRenderer } from 'react-test-renderer';
import { Alert, TextInput, TouchableOpacity } from 'react-native';
import ClassroomMembership from '../ClassroomMembership';
import { enrollInClassroom, getMyClassroom, unenrollFromClassroom } from '@/api/Classrooms';

jest.mock('@/api/Classrooms', () => ({ enrollInClassroom: jest.fn(), getMyClassroom: jest.fn(), unenrollFromClassroom: jest.fn() }));
jest.mock('@/context/UserContext', () => ({ useUser: () => ({ authUserId: 'alice' }) }));
jest.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ theme: { primaryText: '#111111', primaryButton: '#eeeeee', buttonShadow: '#444444' } }) }));
jest.mock('@/context/GlobalStyle', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]) }));

let root: ReactTestRenderer;
const classroom = { classroom_id: 1, name: 'Chess Club' };
const button = (label: string) => root.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === label)!;
const text = () => JSON.stringify(root.toJSON());
async function render() { await act(async () => { root = create(<ClassroomMembership isTablet={false} refreshKey={0} />); }); }
async function enterCode() { await act(async () => { root.root.findByType(TextInput).props.onChangeText('ABC123'); }); }
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (getMyClassroom as jest.Mock).mockResolvedValue(null);
  (enrollInClassroom as jest.Mock).mockResolvedValue(classroom);
  (unenrollFromClassroom as jest.Mock).mockResolvedValue(null);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { await act(async () => { root?.unmount(); }); jest.restoreAllMocks(); });

test('loads the actual classroom rather than demo names and codes', async () => {
  (getMyClassroom as jest.Mock).mockResolvedValue(classroom);
  await render();
  expect(text()).toContain('Chess Club');
  expect(root.root.findAllByType(TextInput)).toHaveLength(0);
  expect(button('Unenroll from classroom')).toBeDefined();
});
test('enrolls only after a valid code and waits for persistence before changing the UI', async () => {
  let finish!: (value: typeof classroom) => void;
  (enrollInClassroom as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await render();
  expect(button('Enroll in classroom').props.disabled).toBe(true);
  await enterCode();
  await act(async () => { button('Enroll in classroom').props.onPress(); button('Enroll in classroom').props.onPress(); });
  expect(enrollInClassroom).toHaveBeenCalledTimes(1);
  expect(text()).not.toContain('Chess Club');
  expect(button('Enroll in classroom').props.disabled).toBe(true);
  await act(async () => { finish(classroom); });
  expect(text()).toContain('Chess Club');
});
test('keeps the code and shows an actionable error when enrollment fails', async () => {
  (enrollInClassroom as jest.Mock).mockRejectedValue(new Error('No active classroom matches that join code.'));
  await render(); await enterCode();
  await act(async () => { button('Enroll in classroom').props.onPress(); });
  expect(text()).toContain('No active classroom');
  expect(root.root.findByType(TextInput).props.value).toBe('ABC123');
  expect(button('Enroll in classroom').props.disabled).toBe(false);
});
test('requires confirmation, then removes only a successfully left classroom', async () => {
  (getMyClassroom as jest.Mock).mockResolvedValue(classroom);
  await render();
  await act(async () => { button('Unenroll from classroom').props.onPress(); });
  expect(unenrollFromClassroom).not.toHaveBeenCalled();
  const confirm = (Alert.alert as jest.Mock).mock.calls[0][2].find((b: any) => b.text === 'Unenroll');
  (unenrollFromClassroom as jest.Mock).mockRejectedValueOnce(new Error('Server unavailable'));
  await act(async () => { confirm.onPress(); });
  expect(text()).toContain('Chess Club');
  expect(text()).toContain('Server unavailable');
  await act(async () => { confirm.onPress(); });
  expect(unenrollFromClassroom).toHaveBeenCalledWith('alice');
  expect(text()).not.toContain('Chess Club');
  expect(root.root.findAllByType(TextInput)).toHaveLength(1);
});
test('a failed load offers retry without pretending the student is unenrolled', async () => {
  (getMyClassroom as jest.Mock).mockRejectedValueOnce(new Error('Could not connect'));
  await render();
  expect(text()).toContain('Could not connect');
  expect(root.root.findAllByType(TextInput)).toHaveLength(0);
  (getMyClassroom as jest.Mock).mockResolvedValue(classroom);
  await act(async () => { button('Retry loading classroom').props.onPress(); });
  expect(text()).toContain('Chess Club');
});
test('refreshing reloads persisted membership', async () => {
  await render();
  (getMyClassroom as jest.Mock).mockResolvedValue(classroom);
  await act(async () => { root.update(<ClassroomMembership isTablet={false} refreshKey={1} />); });
  expect(text()).toContain('Chess Club');
});

test('a refresh during enrollment reloads after the save instead of leaving a stale empty class', async () => {
  let finish!: (value: typeof classroom) => void;
  (enrollInClassroom as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await render(); await enterCode();
  await act(async () => { button('Enroll in classroom').props.onPress(); });
  await act(async () => { root.update(<ClassroomMembership isTablet={false} refreshKey={1} />); });
  (getMyClassroom as jest.Mock).mockResolvedValue(classroom);
  await act(async () => { finish(classroom); });
  expect(text()).toContain('Chess Club');
  expect(button('Unenroll from classroom').props.disabled).toBe(false);
});
