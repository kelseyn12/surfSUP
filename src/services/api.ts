import { TIMEOUTS , API_BASE_URL } from '../constants';
import { SurfConditions, SurfSpot, CheckIn , SurfSession } from '../types';
import { SurfLikelihood, DEFAULT_SURF_THRESHOLDS, SPOT_SURF_THRESHOLDS } from '../types/surfLikelihood';
import axios from 'axios';
import { addUserSession } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllGreatLakesData } from './greatLakesApi';
import { getSpotById, createSurfConditions, findNearbySpots } from '../utils/spotHelpers';
import { 
  getSurferCount,
  initializeMockBackend
} from './mockBackend';
import { 
  checkWindDirection
} from '../config/surfConfig';



const calculateSurfLikelihood = (
  waveHeight: number,
  wavePeriod: number,
  windSpeed: number,
  windDirection?: string,
  spotId: string = 'duluth'
): SurfLikelihood => {
  // Check wind direction first - surf is only possible if wind is from ideal direction
  const windCheck = checkWindDirection(spotId, windDirection || '');
  
  // If wind is blocked, return Flat
  if (windCheck.isBlocked) {
    return SurfLikelihood.FLAT;
  }
  
  // Get spot-specific thresholds or use defaults
  const thresholds = SPOT_SURF_THRESHOLDS[spotId] || {};
  const finalThresholds = { ...DEFAULT_SURF_THRESHOLDS, ...thresholds };
  
  // Handle missing wave period (0 or undefined)
  const hasValidPeriod = wavePeriod > 0;
  
  // If no valid period data, return Flat (can't determine surf quality)
  if (!hasValidPeriod) {
    return SurfLikelihood.FLAT;
  }
  
  // Apply spot-specific thresholds
  if (waveHeight < finalThresholds.flatMax) {
    return SurfLikelihood.FLAT;
  }
  
  if (waveHeight < finalThresholds.maybeMin && wavePeriod >= finalThresholds.maybePeriodMin) {
    return SurfLikelihood.MAYBE_SURF;
  }
  
  if (waveHeight < finalThresholds.goodMin && wavePeriod >= finalThresholds.goodPeriodMin && windSpeed < finalThresholds.goodWindMax) {
    return SurfLikelihood.GOOD;
  }
  
  if (waveHeight >= finalThresholds.firingMin && wavePeriod >= finalThresholds.firingPeriodMin && windSpeed < finalThresholds.firingWindMax) {
    return SurfLikelihood.FIRING;
  }
  
  // If wave height is good but period is too short
  return SurfLikelihood.FLAT;
};

const generateForecastSummary = (
  surfLikelihood: SurfLikelihood,
  dayOffset: number
): string => {
  const dayNames = [
    'today', 'tomorrow', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];
  
  const dayName = dayOffset < dayNames.length ? dayNames[dayOffset] : `day ${dayOffset + 1}`;
  
  switch (surfLikelihood) {
    case SurfLikelihood.FLAT:
      return `Flat conditions ${dayName}. No surf expected.`;
    case SurfLikelihood.MAYBE_SURF:
      return `Maybe surf ${dayName}. Watch for a bump.`;
    case SurfLikelihood.GOOD:
      return `Good conditions ${dayName} — grab your board.`;
    case SurfLikelihood.FIRING:
      return `Firing ${dayName}! Best window early.`;
    default:
      return `Check conditions ${dayName}.`;
  }
};


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

const ENDPOINTS = {
  WINDY: {
    FORECAST: '/forecast',
  },
  NOAA: {
    FORECAST: '/forecasts/point',
  },
  NDBC: {
    REALTIME: '/realtime2',
  },
};

// Helper function to handle fetch requests with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = TIMEOUTS.API_CALL) => {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

// Initialize mock backend
initializeMockBackend();

/**
 * Fetches current surf conditions for a specific spot
 * This is a mock implementation that would be replaced with actual API calls
 */
export const fetchSurfConditions = async (spotId: string): Promise<SurfConditions | null> => {
  try {
    // Get current surfer count
    const surferCount = await getSurferCount(spotId);
    
    // Get spot coordinates for Great Lakes data
    const spot = getSpotById(spotId);
    if (!spot) {
      console.error('❌ Spot not found:', spotId);
      return null;
    }
    
    // Use the comprehensive ALL sources data aggregation
    const aggregated = await fetchAllGreatLakesData(
      spotId,
      spot.location.latitude,
      spot.location.longitude
    );
    
    if (aggregated) {
      // Use the new helper function to create SurfConditions
      return createSurfConditions(spotId, aggregated, surferCount);
    }
    
    console.log('❌ No conditions available');
    return null;
  } catch (error) {
    console.error('Error fetching surf conditions:', error);
    return null;
  }
};

/**
 * Fetches a forecast for multiple days for a specific spot
 */
export const fetchSurfForecast = async (spotId: string, days = 14): Promise<SurfConditions[] | null> => {
  try {
    // Get spot coordinates for Great Lakes data
    const spot = getSpotById(spotId);
    if (!spot) {
      console.error('Spot not found:', spotId);
      return null;
    }
    
    // For now, create a simple forecast based on current conditions
    // In the future, this would fetch forecast data from multiple sources
    const currentConditions = await fetchSurfConditions(spotId);
    
    if (!currentConditions) {
      console.log('❌ No current conditions available for forecast');
      return null;
    }
    
    // Create a simple forecast based on current conditions with some variation
    const forecast: SurfConditions[] = [];
    const now = new Date();
    
    for (let day = 0; day < days; day++) {
      const forecastTime = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
      
      // Add some variation to the forecast
      const waveVariation = Math.round((Math.sin(day / 2) * 0.5) * 10) / 10; // ±0.5ft variation, rounded to 1 decimal
      const windVariation = Math.round((Math.sin(day / 3) * 2) * 10) / 10; // ±2mph variation, rounded to 1 decimal
      
      // Calculate forecast wave height and period
      const forecastWaveHeight = Math.round(Math.max(0, (currentConditions.waveHeight.min + currentConditions.waveHeight.max) / 2 + waveVariation) * 10) / 10;
      const forecastWavePeriod = currentConditions.swell[0]?.period || 0;
      const forecastWindSpeed = Math.round(Math.max(0, currentConditions.wind.speed + windVariation) * 10) / 10;
      
      // Calculate surf likelihood for this forecast day
      const forecastSurfLikelihood = calculateSurfLikelihood(
        forecastWaveHeight, 
        forecastWavePeriod, 
        forecastWindSpeed, 
        currentConditions.wind.direction,
        spotId
      );
      
      // Generate forecast summary
      const forecastSummary = generateForecastSummary(forecastSurfLikelihood, day);
      
      // Generate forecast-specific notes
      const forecastNotes: string[] = [];
      
      // Add wind-related notes
      if (forecastWindSpeed > 15) {
        forecastNotes.push('Strong wind — may cause chop');
      }
      if (forecastWindSpeed > 25) {
        forecastNotes.push('High winds — challenging conditions');
      }
      
      // Add wave-related notes
      if (forecastWaveHeight < 0.5) {
        forecastNotes.push('Very small waves — minimal surf');
      } else if (forecastWaveHeight > 3) {
        forecastNotes.push('Large waves — experienced surfers only');
      }
      
      // Add period-related notes
      if (forecastWavePeriod < 4) {
        forecastNotes.push('Short period — choppy conditions');
      } else if (forecastWavePeriod > 8) {
        forecastNotes.push('Long period — clean waves');
      }
      
      // Add wind direction notes if available
      if (currentConditions.wind.direction) {
        const windCheck = checkWindDirection(spotId, currentConditions.wind.direction);
        if (windCheck.isBlocked) {
          forecastNotes.push('Unfavorable wind direction');
        } else if (windCheck.isIdeal) {
          forecastNotes.push('Ideal wind direction');
        }
      }
      
      const forecastConditions: SurfConditions = {
        spotId,
        timestamp: forecastTime.toISOString(),
        waveHeight: {
          min: Math.round(Math.max(0, currentConditions.waveHeight.min + waveVariation - 0.5) * 10) / 10,
          max: Math.round((currentConditions.waveHeight.max + waveVariation + 0.5) * 10) / 10,
          unit: 'ft',
        },
        wind: {
          speed: Math.round(Math.max(0, currentConditions.wind.speed + windVariation) * 10) / 10,
          direction: currentConditions.wind.direction,
          unit: 'mph',
        },
        swell: currentConditions.swell.map(swell => ({
          height: swell.height + waveVariation,
          period: swell.period,
          direction: swell.direction,
        })),
        weather: {
          temperature: currentConditions.weather.temperature,
          condition: 'partly-cloudy',
          unit: 'F',
        },
        rating: Math.max(1, Math.min(10, currentConditions.rating + Math.round(waveVariation))),
        source: 'forecast-estimate',
        surferCount: day === 0 ? currentConditions.surferCount : undefined,
        // Add surf likelihood and summary for forecast
        surfLikelihood: forecastSurfLikelihood,
        surfReport: forecastSummary,
        notes: forecastNotes,
      };
      
      forecast.push(forecastConditions);
    }
    
    return forecast;
  } catch (error) {
    console.error('Error fetching surf forecast:', error);
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
    const isWithinRadius = (lat1: number, lon1: number, lat2: number, lon2: number, r: number) => {
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return earthRadius * c <= r;
    };

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

 