import { supabase } from './SupabaseClient';
import { getApiUrl } from '@/constants/urls';

export interface Classroom {
  classroom_id: number;
  name: string;
}

async function membershipRequest(userId: string, path: string, method = 'GET', body?: object): Promise<Classroom | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== userId) {
    throw new Error('Your session changed. Please sign in and try again.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Could not update your enrollment. Please try again.');
    }
    if (data?.classroom === null) return null;
    if (!Number.isInteger(data?.classroom?.classroom_id) || typeof data?.classroom?.name !== 'string') {
      throw new Error('Could not load your classroom. Please try again.');
    }
    return data.classroom;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The request timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const getMyClassroom = (userId: string) => membershipRequest(userId, '/classrooms/me');
export const enrollInClassroom = (userId: string, code: string) =>
  membershipRequest(userId, '/classrooms/join', 'POST', { join_code: code.trim().toUpperCase() });
export const unenrollFromClassroom = (userId: string) => membershipRequest(userId, '/classrooms/me', 'DELETE');
