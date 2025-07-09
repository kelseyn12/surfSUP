/**
 * Utilities for local storage operations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  USER_PROFILE: 'user_profile',
  AUTH_TOKEN: 'auth_token',
  FAVORITE_SPOTS: 'favorite_spots',
  RECENT_SPOTS: 'recent_spots',
  RECENT_SESSIONS: 'recent_sessions',
  USER_PREFERENCES: 'user_preferences',
  LAST_LOCATION: 'last_location',
  CACHE_TIMESTAMP: 'cache_timestamp',
  CACHED_FORECAST: 'cached_forecast',
  CACHED_CONDITIONS: 'cached_conditions',
  APP_SETTINGS: 'app_settings',
};

/**
 * Save data to local storage
 * @param key Storage key
 * @param data Data to store
 * @returns Promise that resolves when data is saved
 */
export const saveData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error('Error saving data to storage:', error);
    throw error;
  }
};

/**
 * Retrieve data from local storage
 * @param key Storage key
 * @returns Promise that resolves with the retrieved data, or null if not found
 */
export const getData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) as T : null;
  } catch (error) {
    console.error('Error retrieving data from storage:', error);
    throw error;
  }
};

/**
 * Remove data from local storage
 * @param key Storage key
 * @returns Promise that resolves when data is removed
 */
export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing data from storage:', error);
    throw error;
  }
};

/**
 * Clear all app data from local storage
 * @returns Promise that resolves when all data is cleared
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all data from storage:', error);
    throw error;
  }
};

/**
 * Save user profile to local storage
 * @param userProfile User profile data
 * @returns Promise that resolves when data is saved
 */
export const saveUserProfile = async (userProfile: any): Promise<void> => {
  return saveData(STORAGE_KEYS.USER_PROFILE, userProfile);
};

/**
 * Get user profile from local storage
 * @returns Promise that resolves with the user profile, or null if not found
 */
export const getUserProfile = async (): Promise<any | null> => {
  return getData(STORAGE_KEYS.USER_PROFILE);
};

/**
 * Save authentication token to local storage
 * @param token Authentication token
 * @returns Promise that resolves when token is saved
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  return saveData(STORAGE_KEYS.AUTH_TOKEN, { token, timestamp: Date.now() });
};

/**
 * Get authentication token from local storage
 * @returns Promise that resolves with the token, or null if not found
 */
export const getAuthToken = async (): Promise<string | null> => {
  const data = await getData<{ token: string; timestamp: number }>(STORAGE_KEYS.AUTH_TOKEN);
  return data ? data.token : null;
};

/**
 * Save favorite spots to local storage
 * @param spots Array of favorite surf spots
 * @returns Promise that resolves when data is saved
 */
export const saveFavoriteSpots = async (spots: any[]): Promise<void> => {
  return saveData(STORAGE_KEYS.FAVORITE_SPOTS, spots);
};

/**
 * Get favorite spots from local storage
 * @returns Promise that resolves with favorite spots, or empty array if not found
 */
export const getFavoriteSpots = async (): Promise<any[]> => {
  const spots = await getData<any[]>(STORAGE_KEYS.FAVORITE_SPOTS);
  return spots || [];
};

/**
 * Add a spot to the user's favorites
 * @param spot Surf spot to add to favorites
 * @returns Promise that resolves when spot is added
 */
export const addFavoriteSpot = async (spot: any): Promise<void> => {
  const favorites = await getFavoriteSpots();
  // Check if spot already exists in favorites
  if (!favorites.some(fav => fav.id === spot.id)) {
    favorites.push(spot);
    await saveFavoriteSpots(favorites);
  }
};

/**
 * Remove a spot from the user's favorites
 * @param spotId ID of the spot to remove
 * @returns Promise that resolves when spot is removed
 */
export const removeFavoriteSpot = async (spotId: string): Promise<void> => {
  const favorites = await getFavoriteSpots();
  const updatedFavorites = favorites.filter(spot => spot.id !== spotId);
  await saveFavoriteSpots(updatedFavorites);
};

/**
 * Save user preferences to local storage
 * @param preferences User preferences object
 * @returns Promise that resolves when preferences are saved
 */
export const saveUserPreferences = async (preferences: any): Promise<void> => {
  return saveData(STORAGE_KEYS.USER_PREFERENCES, preferences);
};

/**
 * Get user preferences from local storage
 * @returns Promise that resolves with user preferences, or default preferences if not found
 */
export const getUserPreferences = async (): Promise<any> => {
  const preferences = await getData<any>(STORAGE_KEYS.USER_PREFERENCES);
  
  // Return default preferences if none are stored
  return preferences || {
    useImperialUnits: true,
    enableNotifications: true,
    darkMode: false,
    favoriteSpots: [],
    preferredConditions: {
      minWaveHeight: 1,
      maxWaveHeight: 6,
      preferredWindDirection: ['offshore'],
      preferredTideLevel: ['rising', 'falling'],
    },
  };
};

/**
 * Save cached forecast data with timestamp
 * @param spotId Surf spot ID
 * @param forecastData Forecast data to cache
 * @returns Promise that resolves when cache is saved
 */
export const cacheForecastData = async (spotId: string, forecastData: any): Promise<void> => {
  const now = Date.now();
  const cache = await getData<Record<string, any>>(STORAGE_KEYS.CACHED_FORECAST) || {};
  
  cache[spotId] = {
    timestamp: now,
    data: forecastData,
  };
  
  await saveData(STORAGE_KEYS.CACHED_FORECAST, cache);
  await saveData(`${STORAGE_KEYS.CACHE_TIMESTAMP}_forecast_${spotId}`, now);
};

/**
 * Get cached forecast data if it's not expired
 * @param spotId Surf spot ID
 * @param maxAge Maximum age of cache in milliseconds
 * @returns Promise that resolves with cached data, or null if expired/not found
 */
export const getCachedForecast = async (
  spotId: string,
  maxAge: number = 60 * 60 * 1000 // Default: 1 hour
): Promise<any | null> => {
  const cache = await getData<Record<string, any>>(STORAGE_KEYS.CACHED_FORECAST);
  
  if (!cache || !cache[spotId]) {
    return null;
  }
  
  const { timestamp, data } = cache[spotId];
  const now = Date.now();
  
  // Return data if it's not expired
  if (now - timestamp <= maxAge) {
    return data;
  }
  
  return null;
};

/**
 * Clear expired cache entries
 * @param maxAge Maximum age of cache in milliseconds
 * @returns Promise that resolves when expired cache is cleared
 */
export const clearExpiredCache = async (
  maxAge: number = 24 * 60 * 60 * 1000 // Default: 24 hours
): Promise<void> => {
  const now = Date.now();
  
  // Clear expired forecast cache
  const forecastCache = await getData<Record<string, any>>(STORAGE_KEYS.CACHED_FORECAST);
  if (forecastCache) {
    const updatedCache: Record<string, any> = {};
    
    Object.entries(forecastCache).forEach(([key, entry]) => {
      if (now - entry.timestamp <= maxAge) {
        updatedCache[key] = entry;
      }
    });
    
    await saveData(STORAGE_KEYS.CACHED_FORECAST, updatedCache);
  }
  
  // Clear expired conditions cache
  const conditionsCache = await getData<Record<string, any>>(STORAGE_KEYS.CACHED_CONDITIONS);
  if (conditionsCache) {
    const updatedCache: Record<string, any> = {};
    
    Object.entries(conditionsCache).forEach(([key, entry]) => {
      if (now - entry.timestamp <= maxAge) {
        updatedCache[key] = entry;
      }
    });
    
    await saveData(STORAGE_KEYS.CACHED_CONDITIONS, updatedCache);
  }
}; 