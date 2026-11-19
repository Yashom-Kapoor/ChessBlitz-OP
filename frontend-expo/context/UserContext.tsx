import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/api/User';
import { uploadAvatar } from '@/api/Avatars';
import { updateLeaderboardName } from '@/api/LeaderboardName';
import { supabase } from '@/api/SupabaseClient';

interface UserData {
  userId: string;
  avatarUrl: string | null;
  name: string;
  leaderboardName: string | null;
  email: string;
  joinDate: string;
  totalPuzzlesSolved: string;
  overallRating: string;
}

interface UserContextType {
  authUserId: string | null;
  authReady: boolean;
  userData: UserData;
  loadUser: () => Promise<void>;
  updateUserData: (updates: Partial<UserData>) => void;
  saveAvatar: (base64: string, userId: string) => Promise<void>;
  saveLeaderboardName: (nickname: string | null, userId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const emptyUser: UserData = {
    userId: '',
    avatarUrl: null,
    name: 'Loading...',
    leaderboardName: null,
    email: 'Loading...',
    joinDate: 'Loading...',
    totalPuzzlesSolved: 'Loading...',
    overallRating: 'Loading...',
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
  const [userData, setUserData] = useState<UserData>(emptyUser);
  const requestVersion = useRef(0);
  const currentUserId = useRef<string | null>(null);

  const formatFullDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const loadUser = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const data = await getCurrentUser();
      if (version !== requestVersion.current) return;
      setUserData(previous => ({
        userId: data.user_id,
        avatarUrl: data.avatar_url === undefined && previous.userId === data.user_id
          ? previous.avatarUrl : data.avatar_url ?? null,
        name: data.name,
        leaderboardName: data.leaderboard_name ?? null,
        email: data.email,
        joinDate: formatFullDate(data.created_at),
        totalPuzzlesSolved: data.puzzles_completed,
        overallRating: data.rating,
      }));
    } catch (error) {
      console.log('Error loading user:', error);
    }
  }, []);

  useEffect(() => {
    let pendingLoad: ReturnType<typeof setTimeout> | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null;
      if (currentUserId.current === id && event !== 'INITIAL_SESSION') return;
      currentUserId.current = id;
      setAuthState({ userId: id, ready: true });
      requestVersion.current += 1;
      setUserData(emptyUser);
      clearTimeout(pendingLoad);
      // Leave the auth callback before making further Supabase requests.
      if (id) pendingLoad = setTimeout(() => { void loadUser(); }, 0);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(pendingLoad);
      requestVersion.current += 1;
    };
  }, [loadUser]);

  const updateUserData = useCallback((updates: Partial<UserData>) => {
    requestVersion.current += 1;
    setUserData((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveAvatar = useCallback(async (base64: string, userId: string) => {
    const avatarUrl = await uploadAvatar(base64, userId);
    if (currentUserId.current !== userId) return;
    requestVersion.current += 1;
    setUserData(previous => previous.userId === userId ? { ...previous, avatarUrl } : previous);
  }, []);

  const saveLeaderboardName = useCallback(async (nickname: string | null, userId: string) => {
    const leaderboardName = await updateLeaderboardName(userId, nickname);
    if (currentUserId.current !== userId) return;
    requestVersion.current += 1;
    setUserData(previous => previous.userId === userId ? { ...previous, leaderboardName } : previous);
  }, []);

  return (
    <UserContext.Provider value={{ authUserId: authState.userId, authReady: authState.ready, userData, loadUser, updateUserData, saveAvatar, saveLeaderboardName }}>
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
