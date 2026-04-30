import React, { createContext, useContext, useState, useCallback } from 'react';
import { getShopData, getShopPrices } from '@/api/HandleShop';

interface ShopContextType {
  currency: number;
  themePrices: Record<string, number>;
  boardStatus: Record<string, boolean>;
  loadShop: () => Promise<void>;
  loadPrices: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState(0);
  const [themePrices, setThemePrices] = useState<Record<string, number>>({});
  const [boardStatus, setBoardStatus] = useState<Record<string, boolean>>({});

  const loadShop = useCallback(async () => {
    try {
      const data = await getShopData();
      setCurrency(data.currency);
      setBoardStatus(data);
    } catch (error) {
      console.log('Error loading shop:', error);
    }
  }, []);

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
