import { TIMEOUTS , API_BASE_URL } from '../constants';
import { SurfConditions, SurfSpot, CheckIn , SurfSession } from '../types';
// REMOVED: Unused imports that were only needed for the duplicate surf likelihood function
import axios from 'axios';
import { addUserSession } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllGreatLakesData, fetchAllGreatLakesForecastData } from './greatLakesApi';
import { getSpotById, createSurfConditions, findNearbySpots } from '../utils/spotHelpers';
import { 
  getSurferCount,
  initializeMockBackend
} from './mockBackend';
// REMOVED: Unused import that was only needed for the duplicate surf likelihood function



// REMOVED: Duplicate calculateSurfLikelihood function that was causing inconsistent surf likelihood calculations
// The correct function is now in greatLakesApi.ts and handles all surf likelihood calculations consistently

// REMOVED: generateForecastSummary function that was using the old surf likelihood logic
// This functionality is now handled by the surf report generation in greatLakesApi.ts


// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.API_CALL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging and authentication
axiosInstance.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    const token = await AsyncStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request details in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and logging
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error) => {
    // Check if the error is an Axios error
    if (error && error.response) {
      // Log error details
      console.error('[API Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Handle specific error cases
      if (error.response?.status === 401) {
        // Handle unauthorized access
        await AsyncStorage.removeItem('auth_token');
        // Redirect to login or refresh token
      }

      // Implement retry logic for specific errors
      if (error.response?.status >= 500 && error.config && !error.config.__isRetry) {
        const retryConfig = { ...error.config, __isRetry: true };
        return axiosInstance(retryConfig);
      }
    }
    return Promise.reject(error);
  }
);

// API service with typed methods and error handling
export const api = {
  post: async <T = any>(endpoint: string, data: any): Promise<T> => {
    try {
      const response = await axiosInstance.post<T>(endpoint, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  patch: async <T = any>(endpoint: string, data: any): Promise<T> => {
    try {
      const response = await axiosInstance.patch<T>(endpoint, data);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  get: async <T = any>(endpoint: string): Promise<T> => {
    try {
      const response = await axiosInstance.get<T>(endpoint);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  delete: async <T = any>(endpoint: string): Promise<T> => {
    try {
      const response = await axiosInstance.delete<T>(endpoint);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

// Helper function to handle API errors
const handleApiError = (error: unknown) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    if (response?.status) {
      switch (response.status) {
        case 400:
          throw new Error('Invalid request. Please check your input.');
        case 401:
          throw new Error('Unauthorized. Please log in again.');
        case 403:
          throw new Error('Forbidden. You do not have permission to access this resource.');
        case 404:
          throw new Error('Resource not found.');
        case 429:
          throw new Error('Too many requests. Please try again later.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  }
  throw error;
};

/**
 * API Service
 * Handles all external API calls for surf conditions data
 */

// Removed unused ENDPOINTS and fetchWithTimeout

// Initialize mock backend
initializeMockBackend();

/**
 * Fetches current surf conditions for a specific spot
 * This is a mock implementation that would be replaced with actual API calls
 */
export const fetchSurfConditions = async (spotId: string): Promise<SurfConditions | null> => {
  try {
    // Fetching current conditions
    
    // Get current surfer count
    const surferCount = await getSurferCount(spotId);
    
    // Get spot coordinates for Great Lakes data
    const spot = getSpotById(spotId);
    if (!spot) {
      console.error('❌ Spot not found:', spotId);
      return null;
    }
    
    console.log(`📍 Spot coordinates: ${spot.location.latitude}, ${spot.location.longitude}`);
    
    // Use the comprehensive ALL sources data aggregation
    const aggregated = await fetchAllGreatLakesData(
      spotId,
      spot.location.latitude,
      spot.location.longitude
    );
    
    if (aggregated) {
      console.log('📊 Aggregated data received:', {
        waveHeight: aggregated.waveHeight,
        swell: aggregated.swell,
        surfLikelihood: aggregated.surfLikelihood
      });
      
      // Use the new helper function to create SurfConditions
      const conditions = createSurfConditions(spotId, aggregated, surferCount);
      
      console.log('🏄 Final SurfConditions:', {
        waveHeight: conditions.waveHeight,
        swell: conditions.swell,
        surfLikelihood: conditions.surfLikelihood
      });
      
      return conditions;
    }
    
    // No conditions available
    return null;
  } catch (error) {
    console.error('❌ Error fetching surf conditions:', error);
    return null;
  }
};

/**
 * Fetches a forecast for multiple days for a specific spot
 */
export const fetchSurfForecast = async (spotId: string, days = 14): Promise<SurfConditions[] | null> => {
  try {
    console.log(`📆 Fetching forecast for ${spotId} (${days} days)`);
    
    // Get spot coordinates for Great Lakes data
    const spot = getSpotById(spotId);
    if (!spot) {
      console.error('❌ Spot not found:', spotId);
      return null;
    }
    
    console.log(`📍 Forecast coordinates: ${spot.location.latitude}, ${spot.location.longitude}`);
    
    // Use the new forecast data function that uses Windy + NOAA
    const forecastData = await fetchAllGreatLakesForecastData(
      spotId,
      spot.location.latitude,
      spot.location.longitude
    );
    
    if (forecastData && forecastData.length > 0) {
      console.log(`📊 Received ${forecastData.length} forecast data points`);
      
      // Convert AggregatedConditions to SurfConditions
      const forecast: SurfConditions[] = forecastData.map((data: any, index: number) => {
        console.log(`📊 Converting forecast point ${index}:`, {
          waveHeight: data.waveHeight,
          wind: data.wind,
          timestamp: data.timestamp
        });
        
        return createSurfConditions(spotId, data, 0); // 0 surfer count for forecast
      });
      
      console.log(`📊 Final forecast array length: ${forecast.length}`);
      return forecast;
    }
    
    // No forecast data available
    return null;
  } catch (error) {
    console.error('❌ Error fetching surf forecast:', error);
    return null;
  }
};

/**
 * Fetches nearby surf spots based on location
 */
export const fetchNearbySurfSpots = async (
  latitude: number,
  longitude: number,
  radius = 50, // radius in km
): Promise<SurfSpot[] | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // Use real data from spots.json
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371; // km
    // Removed unused isWithinRadius function

    const nearbySpots = findNearbySpots(latitude, longitude, radius);

    return nearbySpots;
  } catch (error) {
    console.error('Error fetching nearby surf spots:', error);
    return null;
  }
};







/**
 * Submits a check-in to the backend
 * This is a mock implementation
 */
export const submitCheckIn = async (checkInData: Omit<CheckIn, 'id' | 'timestamp' | 'expiresAt' | 'isActive'>): Promise<CheckIn | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // In a real implementation, this would post to a backend API
    // For now, we'll create a mock response
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    
    const checkIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      userId: checkInData.userId,
      spotId: checkInData.spotId,
      timestamp: now.toISOString(),
      expiresAt,
      isActive: true,
      conditions: checkInData.conditions,
      comment: checkInData.comment,
      imageUrls: checkInData.imageUrls,
    };
    
    return checkIn;
  } catch (error) {
    console.error('Error submitting check-in:', error);
    return null;
  }
};

/**
 * Logs a surf session to storage
 */
export const logSurfSession = async (sessionData: Omit<SurfSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<SurfSession | null> => {
  try {
    const now = new Date().toISOString();
    
    const session: SurfSession = {
      id: `session-${Date.now()}`,
      userId: sessionData.userId,
      spotId: sessionData.spotId,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      duration: sessionData.duration,
      board: sessionData.board,
      conditions: sessionData.conditions,
      performance: sessionData.performance,
      notes: sessionData.notes,
      imageUrls: sessionData.imageUrls,
      createdAt: now,
      updatedAt: now,
    };
    
    // Save to local storage
    await addUserSession(session.userId, session);
    
    return session;
  } catch (error) {
    console.error('Error logging surf session:', error);
    throw error; // Throw the error so the UI can handle it
  }
};

 