import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { Image, Text } from 'react-native';
import Avatar from '../Avatar';

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { hintBubble: '#333', secondaryText: '#fff' } }),
}));
let root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

test('uses initials when the user has no photo', async () => {
  await act(async () => { root = create(<Avatar name="Alex Parker" />); });
  expect(root.root.findByType(Text).props.children).toBe('AP');
  expect(root.root.findAllByType(Image)).toHaveLength(0);
});

test('falls back after a failed download and displays a replacement URL', async () => {
  await act(async () => { root = create(<Avatar name="Alex Parker" uri="https://example.com/old.jpg" />); });
  await act(async () => { root.root.findByType(Image).props.onError(); });
  expect(root.root.findByType(Text).props.children).toBe('AP');
  expect(root.root.findAllByType(Image)).toHaveLength(0);
  await act(async () => { root.update(<Avatar name="Alex Parker" uri="https://example.com/new.jpg" />); });
  expect(root.root.findByType(Image).props.source.uri).toBe('https://example.com/new.jpg');
});
