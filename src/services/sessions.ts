/**
 * Session service — surf session CRUD.
 * All data persists to Firestore (cross-device). Function signatures unchanged.
 */

import { SurfSession, User } from '../types';
import {
  firestoreSaveSession,
  firestoreGetUserSessions,
  firestoreUpdateSession,
  firestoreDeleteSession,
} from './firestore';
import { useAuthStore } from './auth';

// ─── Stats ───────────────────────────────────────────────────────────────────

const calculateDuration = (session: SurfSession): number => {
  const start = new Date(session.startTime);
  const end = session.endTime ? new Date(session.endTime) : new Date();
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

export const calculateUserStats = async (userId: string): Promise<User['stats']> => {
  const sessions = await firestoreGetUserSessions(userId);

  if (sessions.length === 0) {
    return { totalSessions: 0, averageSessionLength: 0, startDate: new Date().toISOString(), longestSession: 0 };
  }

  const durations = sessions.map(calculateDuration);
  const total = durations.reduce((s, d) => s + d, 0);

  const startDate = sessions
    .map((s) => new Date(s.startTime))
    .reduce((earliest, d) => (d < earliest ? d : earliest))
    .toISOString();

  const spotCounts = sessions.reduce((acc, s) => {
    acc[s.spotId] = (acc[s.spotId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const favoriteSurfSpot = Object.entries(spotCounts).reduce(
    (max, [id, count]) => (count > max.count ? { spotId: id, count } : max),
    { spotId: '', count: 0 }
  ).spotId;

  return {
    totalSessions: sessions.length,
    averageSessionLength: Math.round(total / sessions.length),
    startDate,
    favoriteSurfSpot: favoriteSurfSpot || undefined,
    longestSession: Math.max(...durations),
  };
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const addSession = async (
  session: Omit<SurfSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SurfSession> => {
  const newSession = await firestoreSaveSession(session);

  const stats = await calculateUserStats(session.userId);
  const authStore = useAuthStore.getState();
  if (authStore.user) {
    await authStore.updateUserProfile({ ...authStore.user, stats });
  }

  return newSession;
};

export const updateSession = async (
  sessionId: string,
  updates: Partial<SurfSession>
): Promise<SurfSession> => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id;
  if (!userId) throw new Error('User not authenticated');

  await firestoreUpdateSession(sessionId, updates);

  const sessions = await firestoreGetUserSessions(userId);
  const updated = sessions.find((s) => s.id === sessionId);
  if (!updated) throw new Error('Session not found after update');

  const stats = await calculateUserStats(userId);
  if (authStore.user) {
    await authStore.updateUserProfile({ ...authStore.user, stats });
  }

  return updated;
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id;
  if (!userId) throw new Error('User not authenticated');

  await firestoreDeleteSession(sessionId);

  const stats = await calculateUserStats(userId);
  if (authStore.user) {
    await authStore.updateUserProfile({ ...authStore.user, stats });
  }
};

export const getSessionById = async (sessionId: string): Promise<SurfSession | null> => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id;
  if (!userId) throw new Error('User not authenticated');

  const sessions = await firestoreGetUserSessions(userId);
  return sessions.find((s) => s.id === sessionId) ?? null;
};

export const getUserSessionsById = async (userId: string): Promise<SurfSession[]> => {
  return firestoreGetUserSessions(userId);
};
