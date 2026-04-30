import React, { createContext, useContext, useState, useCallback } from 'react';
import { getCurrentUser } from '@/api/User';

interface UserData {
  name: string;
  email: string;
  joinDate: string;
  totalPuzzlesSolved: string;
  overallRating: string;
}

interface UserContextType {
  userData: UserData;
  loadUser: () => Promise<void>;
  updateUserData: (updates: Partial<UserData>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData>({
    name: 'Loading...',
    email: 'Loading...',
    joinDate: 'Loading...',
    totalPuzzlesSolved: 'Loading...',
    overallRating: 'Loading...',
  });

  const formatFullDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const loadUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      setUserData({
        name: data.name,
        email: data.email,
        joinDate: formatFullDate(data.created_at),
        totalPuzzlesSolved: data.puzzles_completed,
        overallRating: data.rating,
      });
    } catch (error) {
      console.log('Error loading user:', error);
    }
  }, []);

  const updateUserData = useCallback((updates: Partial<UserData>) => {
    setUserData((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <UserContext.Provider value={{ userData, loadUser, updateUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
