import { SurfSession, User } from '../types';
import { storeUserSessions, getUserSessions as getUserSessionsFromStorage } from './storage';
import { useAuthStore } from './auth';

/**
 * Calculate session duration in minutes
 */
const calculateSessionDuration = (session: SurfSession): number => {
  const start = new Date(session.startTime);
  const end = session.endTime ? new Date(session.endTime) : new Date();
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

/**
 * Calculate user statistics from sessions
 */
export const calculateUserStats = async (userId: string): Promise<User['stats']> => {
  const sessions = await getUserSessionsFromStorage(userId);
  const userSessions = sessions.filter(session => session.userId === userId);

  if (userSessions.length === 0) {
    return {
      totalSessions: 0,
      averageSessionLength: 0,
      startDate: new Date().toISOString(),
      longestSession: 0
    };
  }

  // Calculate total sessions
  const totalSessions = userSessions.length;

  // Calculate session durations
  const sessionDurations = userSessions.map(calculateSessionDuration);
  const totalDuration = sessionDurations.reduce((sum, duration) => sum + duration, 0);
  const averageSessionLength = Math.round(totalDuration / totalSessions);
  const longestSession = Math.max(...sessionDurations);

  // Find start date (earliest session)
  const startDate = userSessions
    .map(session => new Date(session.startTime))
    .reduce((earliest, current) => current < earliest ? current : earliest)
    .toISOString();

  // Find favorite spot (most visited)
  const spotCounts = userSessions.reduce((counts, session) => {
    counts[session.spotId] = (counts[session.spotId] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const favoriteSurfSpot = Object.entries(spotCounts)
    .reduce((max, [spotId, count]) => 
      count > (max.count || 0) ? { spotId, count } : max,
      { spotId: '', count: 0 }
    ).spotId;

  return {
    totalSessions,
    averageSessionLength,
    startDate,
    favoriteSurfSpot: favoriteSurfSpot || undefined,
    longestSession
  };
};

/**
 * Add a new session and update user stats
 */
export const addSession = async (session: Omit<SurfSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<SurfSession> => {
  const now = new Date().toISOString();
  const newSession: SurfSession = {
    ...session,
    id: `session-${Date.now()}`,
    createdAt: now,
    updatedAt: now
  };

  const sessions = await getUserSessionsFromStorage(session.userId);
  sessions.unshift(newSession);
  await storeUserSessions(session.userId, sessions);

  // Update user stats
  const stats = await calculateUserStats(session.userId);
  const authStore = useAuthStore.getState();
  if (authStore.user) {
    await authStore.updateUserProfile({
      ...authStore.user,
      stats
    });
  }

  return newSession;
};

/**
 * Update an existing session and recalculate stats
 */
export const updateSession = async (sessionId: string, updates: Partial<SurfSession>): Promise<SurfSession> => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const sessions = await getUserSessionsFromStorage(userId);
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) {
    throw new Error('Session not found');
  }

  const updatedSession: SurfSession = {
    ...sessions[sessionIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  sessions[sessionIndex] = updatedSession;
  await storeUserSessions(userId, sessions);

  // Recalculate user stats
  const stats = await calculateUserStats(userId);
  if (authStore.user) {
    await authStore.updateUserProfile({
      ...authStore.user,
      stats
    });
  }

  return updatedSession;
};

/**
 * Delete a session and recalculate stats
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const sessions = await getUserSessionsFromStorage(userId);
  const updatedSessions = sessions.filter(s => s.id !== sessionId);
  
  if (updatedSessions.length === sessions.length) {
    throw new Error('Session not found');
  }

  await storeUserSessions(userId, updatedSessions);

  // Recalculate user stats
  const stats = await calculateUserStats(userId);
  if (authStore.user) {
    await authStore.updateUserProfile({
      ...authStore.user,
      stats
    });
  }
};

/**
 * Get a specific session by ID
 */
export const getSessionById = async (sessionId: string): Promise<SurfSession | null> => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const sessions = await getUserSessionsFromStorage(userId);
  return sessions.find(s => s.id === sessionId) || null;
};

/**
 * Get all sessions for the current user
 */
export const getUserSessionsById = async (userId: string): Promise<SurfSession[]> => {
  return await getUserSessionsFromStorage(userId);
}; 