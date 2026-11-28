/// <reference types="jest" />
import React, { act } from 'react';
import { StyleSheet, Text } from 'react-native';
import { create, ReactTestRenderer } from 'react-test-renderer';
import PageHeading from '../PageHeading';

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { dark: true, primaryText: '#ffffff' } }),
}));
jest.mock('@/hooks/useIsTablet', () => ({ useIsTablet: () => false }));
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));

let root: ReactTestRenderer;
const texts = () => root.root.findAllByType(Text);
const header = () => root.root.findAll(node => node.props.accessibilityRole === 'header' && typeof node.type === 'string')[0];

beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { await act(async () => { root.unmount(); }); });

test("shows the tab's name as a header by default", async () => {
  await act(async () => { root = create(<PageHeading tab="classroom" />); });
  expect(texts().map(t => t.props.children)).toEqual(['Classroom']);
  expect(header().props.accessibilityLabel).toBe('Classroom');
});

test('shows a custom title and subtitle', async () => {
  await act(async () => {
    root = create(<PageHeading tab="puzzles" title="Rated Puzzles" subtitle="These count!" />);
  });
  expect(texts().map(t => t.props.children)).toEqual(['Rated Puzzles', 'These count!']);
  expect(header().props.accessibilityLabel).toBe('Rated Puzzles');
});

test("colours the name with the tab's colour", async () => {
  await act(async () => { root = create(<PageHeading tab="home" />); });
  expect(StyleSheet.flatten(texts()[0].props.style).color).toBe('#C9A7FF');
});
