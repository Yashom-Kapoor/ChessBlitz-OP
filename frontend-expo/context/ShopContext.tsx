import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getShopData, getShopPrices } from '@/api/HandleShop';
import { useUser } from './UserContext';

interface ShopContextType {
  currency: number;
  themePrices: Record<string, number>;
  boardStatus: Record<string, boolean>;
  loadShop: () => Promise<void>;
  loadPrices: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { authUserId } = useUser();
  const currentUserId = useRef(authUserId);
  currentUserId.current = authUserId;
  const [currency, setCurrency] = useState(0);
  const [themePrices, setThemePrices] = useState<Record<string, number>>({});
  const [boardStatus, setBoardStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCurrency(0);
    setBoardStatus({});
  }, [authUserId]);

  const loadShop = useCallback(async () => {
    if (!authUserId) return;
    try {
      const data = await getShopData();
      if (currentUserId.current !== authUserId) return;
      setCurrency(data.currency);
      setBoardStatus(data);
    } catch (error) {
      console.log('Error loading shop:', error);
    }
  }, [authUserId]);

  const loadPrices = useCallback(async () => {
    try {
      const data = await getShopPrices();
      setThemePrices(data);
    } catch (error) {
      console.log('Error loading prices:', error);
    }
  }, []);

  return (
    <ShopContext.Provider value={{ currency, themePrices, boardStatus, loadShop, loadPrices }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
