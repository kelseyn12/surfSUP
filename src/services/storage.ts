import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { User, SurfSpot, SurfSession, CheckIn } from '../types';

/**
 * Storage Service
 * Utility for persisting and retrieving data from AsyncStorage
 */

// User related storage functions
export const storeUserProfile = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (error) {
    console.error('Error storing auth token:', error);
    throw error;
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Error removing auth token:', error);
    throw error;
  }
};

// Favorite spots storage functions
export const storeFavoriteSpots = async (spots: SurfSpot[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_SPOTS, JSON.stringify(spots));
  } catch (error) {
    console.error('Error storing favorite spots:', error);
    throw error;
  }
};

export const getFavoriteSpots = async (): Promise<SurfSpot[]> => {
  try {
    const spotsJson = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_SPOTS);
    return spotsJson ? JSON.parse(spotsJson) : [];
  } catch (error) {
    console.error('Error getting favorite spots:', error);
    return [];
  }
};

export const addFavoriteSpot = async (spot: SurfSpot): Promise<SurfSpot[]> => {
  try {
    const spots = await getFavoriteSpots();
    
    // Check if spot already exists
    if (!spots.some(s => s.id === spot.id)) {
      spots.push(spot);
      await storeFavoriteSpots(spots);
    }
    
    return spots;
  } catch (error) {
    console.error('Error adding favorite spot:', error);
    throw error;
  }
};

export const removeFavoriteSpot = async (spotId: string): Promise<SurfSpot[]> => {
  try {
    const spots = await getFavoriteSpots();
    const updatedSpots = spots.filter(spot => spot.id !== spotId);
    await storeFavoriteSpots(updatedSpots);
    return updatedSpots;
  } catch (error) {
    console.error('Error removing favorite spot:', error);
    throw error;
  }
};

// Recent spots storage functions
export const storeRecentSpots = async (spots: SurfSpot[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_SPOTS, JSON.stringify(spots));
  } catch (error) {
    console.error('Error storing recent spots:', error);
    throw error;
  }
};

export const getRecentSpots = async (): Promise<SurfSpot[]> => {
  try {
    const spotsJson = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_SPOTS);
    return spotsJson ? JSON.parse(spotsJson) : [];
  } catch (error) {
    console.error('Error getting recent spots:', error);
    return [];
  }
};

export const addRecentSpot = async (spot: SurfSpot): Promise<SurfSpot[]> => {
  try {
    const spots = await getRecentSpots();
    
    // Remove the spot if it already exists
    const filteredSpots = spots.filter(s => s.id !== spot.id);
    
    // Add the spot to the beginning of the array
    filteredSpots.unshift(spot);
    
    // Keep only the last MAX_RECENT_SPOTS spots
    const updatedSpots = filteredSpots.slice(0, 10);
    
    await storeRecentSpots(updatedSpots);
    return updatedSpots;
  } catch (error) {
    console.error('Error adding recent spot:', error);
    throw error;
  }
};

// User sessions storage functions
export const storeUserSessions = async (sessions: SurfSession[]): Promise<void> => {
  try {
    console.log('[DEBUG] Storing sessions:', sessions);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSIONS, JSON.stringify(sessions));
    const verifyStorage = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSIONS);
    console.log('[DEBUG] Verified stored sessions:', verifyStorage);
  } catch (error) {
    console.error('Error storing user sessions:', error);
    throw error;
  }
};

export const getUserSessions = async (): Promise<SurfSession[]> => {
  try {
    const sessionsJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSIONS);
    console.log('[DEBUG] Retrieved sessions from storage:', sessionsJson);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
};

export const addUserSession = async (session: SurfSession): Promise<SurfSession[]> => {
  try {
    console.log('[DEBUG] Adding new session:', session);
    const sessions = await getUserSessions();
    console.log('[DEBUG] Current sessions:', sessions);
    sessions.unshift(session);
    await storeUserSessions(sessions);
    return sessions;
  } catch (error) {
    console.error('Error adding user session:', error);
    throw error;
  }
};

export const updateUserSession = async (updatedSession: SurfSession): Promise<SurfSession[]> => {
  try {
    const sessions = await getUserSessions();
    const updatedSessions = sessions.map(session => 
      session.id === updatedSession.id ? updatedSession : session
    );
    
    await storeUserSessions(updatedSessions);
    return updatedSessions;
  } catch (error) {
    console.error('Error updating user session:', error);
    throw error;
  }
};

export const deleteUserSession = async (sessionId: string): Promise<SurfSession[]> => {
  try {
    const sessions = await getUserSessions();
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    await storeUserSessions(updatedSessions);
    return updatedSessions;
  } catch (error) {
    console.error('Error deleting user session:', error);
    throw error;
  }
};

// Settings storage functions
export const storeUserSettings = async (settings: Record<string, any>): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error storing user settings:', error);
    throw error;
  }
};

export const getUserSettings = async (): Promise<Record<string, any>> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    return settingsJson ? JSON.parse(settingsJson) : {};
  } catch (error) {
    console.error('Error getting user settings:', error);
    return {};
  }
};

export const updateUserSettings = async (key: string, value: any): Promise<Record<string, any>> => {
  try {
    const settings = await getUserSettings();
    settings[key] = value;
    await storeUserSettings(settings);
    return settings;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

// Onboarding status
export const setOnboardingComplete = async (isComplete: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, JSON.stringify(isComplete));
  } catch (error) {
    console.error('Error setting onboarding status:', error);
    throw error;
  }
};

export const isOnboardingComplete = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return false;
  }
};

// Clear all app data
export const clearAllData = async (): Promise<void> => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
};

// Clear all storage data
export const clearAllStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log('All storage cleared successfully');
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
};

// Initialize storage with empty data
export const initializeStorage = async (): Promise<void> => {
  try {
    const sessions = await getUserSessions();
    if (!sessions) {
      await storeUserSessions([]);
    }
    console.log('Storage initialized successfully');
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
};

// Export functions but don't auto-initialize
export { 
  storeUserProfile,
  getUserProfile,
  storeAuthToken,
  getAuthToken,
  removeAuthToken,
  storeFavoriteSpots,
  getFavoriteSpots,
  addFavoriteSpot,
  removeFavoriteSpot,
  storeRecentSpots,
  getRecentSpots,
  addRecentSpot,
  storeUserSessions,
  getUserSessions,
  addUserSession,
  updateUserSession,
  deleteUserSession,
  storeUserSettings,
  getUserSettings,
  updateUserSettings,
  setOnboardingComplete,
  isOnboardingComplete,
  clearAllData,
  clearAllStorage,
  initializeStorage
}; 