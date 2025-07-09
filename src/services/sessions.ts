import { SurfSession, User } from '../types';
import { getUserSessions, storeUserSessions } from './storage';
import { useAuthStore } from './auth';

/**
 * Calculate session duration in minutes
 */
const calculateSessionDuration = (session: SurfSession): number => {
  if (!session.endTime) return 0;
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  return Math.round((end - start) / (1000 * 60)); // Convert ms to minutes
};

/**
 * Calculate user statistics from sessions
 */
export const calculateUserStats = async (userId: string): Promise<User['stats']> => {
  const sessions = await getUserSessions();
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

  const sessions = await getUserSessions();
  sessions.unshift(newSession);
  await storeUserSessions(sessions);

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
  const sessions = await getUserSessions();
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
  await storeUserSessions(sessions);

  // Update user stats
  const stats = await calculateUserStats(updatedSession.userId);
  const authStore = useAuthStore.getState();
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
  const sessions = await getUserSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }

  const updatedSessions = sessions.filter(s => s.id !== sessionId);
  await storeUserSessions(updatedSessions);

  // Update user stats
  const stats = await calculateUserStats(session.userId);
  const authStore = useAuthStore.getState();
  if (authStore.user) {
    await authStore.updateUserProfile({
      ...authStore.user,
      stats
    });
  }
};

/**
 * Get a single session by ID
 */
export const getSessionById = async (sessionId: string): Promise<SurfSession | null> => {
  const sessions = await getUserSessions();
  return sessions.find(s => s.id === sessionId) || null;
};

/**
 * Get all sessions for a user
 */
export const getUserSessionsById = async (userId: string): Promise<SurfSession[]> => {
  const sessions = await getUserSessions();
  return sessions.filter(s => s.userId === userId);
}; 