import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { ShopProvider, useShop } from '../ShopContext';
import { getShopData } from '@/api/HandleShop';

let mockUserId = 'alice';
jest.mock('../UserContext', () => ({ useUser: () => ({ authUserId: mockUserId }) }));
jest.mock('@/api/HandleShop', () => ({ getShopData: jest.fn(), getShopPrices: jest.fn() }));
let root, context;
function Probe() { context = useShop(); return null; }
beforeEach(async () => {
  jest.clearAllMocks();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  mockUserId = 'alice';
  getShopData.mockResolvedValue({ currency: 100, winter: true });
  await act(async () => { root = create(<ShopProvider><Probe /></ShopProvider>); });
  await act(async () => { await context.loadShop(); });
});
afterEach(async () => { await act(async () => { root.unmount(); }); });
test('logout clears account-specific cached data and rejects an old response', async () => {
  let finish;
  getShopData.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = context.loadShop();
  mockUserId = null;
  await act(async () => { root.update(<ShopProvider><Probe /></ShopProvider>); });
  expect(context.currency).toBe(0);
  expect(context.boardStatus).toEqual({});
  await act(async () => { finish({ currency: 999, winter: true }); await pending; });
  expect(context.currency).toBe(0);
  expect(context.boardStatus).toEqual({});
});
test('switching accounts starts with empty account data', async () => {
  mockUserId = 'bob';
  await act(async () => { root.update(<ShopProvider><Probe /></ShopProvider>); });
  expect(context.currency).toBe(0);
  getShopData.mockResolvedValue({ currency: 5, winter: false });
  await act(async () => { await context.loadShop(); });
  expect(context.currency).toBe(5);
});
