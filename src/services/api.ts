import { API, TIMEOUTS , API_BASE_URL } from '../constants';
import { SurfConditions, SurfSpot, WindyApiResponse, NoaaApiResponse, NdbcBuoyResponse, CheckIn , SurfSession } from '../types';
import { emitSurferCountUpdated, emitCheckInStatusChanged } from './events';
import { 
  globalSurferCounts, 
  updateGlobalSurferCount, 
  updateUserCheckedInStatus 
} from './globalState';
import webSocketService, { 
  WebSocketMessageType, 
  SurferCountUpdateMessage,
  CheckInStatusMessage
} from './websocket';
import axios from 'axios';
import { addUserSession } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLakeSuperiorWaterLevel, fetchLakeSuperiorBuoyData, fetchGreatLakesConditions, fetchAllGreatLakesData } from './greatLakesApi';

// Import helper functions for surf likelihood calculation
// Import surf spots configuration from greatLakesApi
import { surfSpotsConfig } from './greatLakesApi';

// Wind direction helper for Lake Superior surf spots
const isFavorableWindDirection = (spotId: string, windDirection: string): boolean => {
  if (!windDirection) return true; // If no direction data, assume favorable
  
  const direction = windDirection.toUpperCase();
  
  // Check if spot is in our configuration
  const spotConfig = surfSpotsConfig[spotId as keyof typeof surfSpotsConfig];
  
  if (!spotConfig) {
    // Default: assume favorable unless clearly offshore
    const defaultUnfavorable = ['SW', 'W', 'WSW'];
    return !defaultUnfavorable.includes(direction);
  }
  
  // Check if wind direction is in the offshore wind list for this spot
  const isOffshore = spotConfig.offshoreWind.includes(direction);
  
  return !isOffshore;
};

const calculateSurfLikelihood = (
  waveHeight: number,
  wavePeriod: number,
  windSpeed: number,
  windDirection?: string,
  spotId: string = 'duluth'
): 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' => {
  // Check wind direction first
  const isFavorableWind = isFavorableWindDirection(spotId, windDirection || '');
  
  // Calculate base likelihood without wind direction consideration
  let baseLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing';
  
  if (waveHeight < 0.5) {
    baseLikelihood = 'Flat';
  } else if (waveHeight >= 0.5 && waveHeight < 1.5 && wavePeriod >= 4) {
    baseLikelihood = 'Maybe Surf';
  } else if (waveHeight >= 1.5 && waveHeight < 3 && wavePeriod >= 5 && windSpeed < 12) {
    baseLikelihood = 'Good';
  } else if (waveHeight >= 3 && wavePeriod >= 6 && windSpeed < 12) {
    baseLikelihood = 'Firing';
  } else {
    baseLikelihood = 'Maybe Surf';
  }
  
  // If wind is unfavorable, downgrade by one tier
  if (!isFavorableWind) {
    switch (baseLikelihood) {
      case 'Firing':
        return 'Good';
      case 'Good':
        return 'Maybe Surf';
      case 'Maybe Surf':
        return 'Flat';
      case 'Flat':
        return 'Flat'; // Can't go lower
      default:
        return 'Maybe Surf';
    }
  }
  
  return baseLikelihood;
};

const generateForecastSummary = (
  surfLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing',
  dayOffset: number
): string => {
  const dayNames = [
    'today', 'tomorrow', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];
  
  const dayName = dayOffset < dayNames.length ? dayNames[dayOffset] : `day ${dayOffset + 1}`;
  
  switch (surfLikelihood) {
    case 'Flat':
      return `Flat conditions ${dayName}. No surf expected.`;
    case 'Maybe Surf':
      return `Maybe surf ${dayName}. Watch for a bump.`;
    case 'Good':
      return `Good conditions ${dayName} — grab your board.`;
    case 'Firing':
      return `Firing ${dayName}! Best window early.`;
    default:
      return `Check conditions ${dayName}.`;
  }
};
// Replace the import with require for JSON compatibility
const spotsDataRaw = require('../constants/spots.json');
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
function isValidDifficulty(value: any): value is typeof VALID_DIFFICULTIES[number] {
  return VALID_DIFFICULTIES.includes(value);
}

function validateSpots(rawSpots: any[]): SurfSpot[] {
  const validSpots: SurfSpot[] = [];
  const invalidSpots: any[] = [];
  for (const spot of rawSpots) {
    if (isValidDifficulty(spot.difficulty)) {
      validSpots.push(spot as SurfSpot);
    } else {
      invalidSpots.push(spot);
    }
  }
  if (invalidSpots.length > 0) {
    console.error('Invalid spots found in spots.json:', invalidSpots);
    throw new Error('Invalid spot data: some spots have invalid difficulty values.');
  }
  return validSpots;
}

const spotsData: SurfSpot[] = validateSpots(spotsDataRaw);

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
    if (__DEV__) {
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
    if (__DEV__) {
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

// Add a mock database for storing active check-ins and surfer counts
let activeSurferCounts: Record<string, number> = {
  'stoneypoint': 0,
  'parkpoint': 0,
  'lesterriver': 0,
  'superiorentry': 0,
};

// Initialize with empty arrays for all spots to avoid undefined
let activeCheckIns: Record<string, CheckIn[]> = {
  'stoneypoint': [],
  'parkpoint': [],
  'lesterriver': [],
  'superiorentry': [],
};

// Clear all active check-ins and reset surfer counts
export const resetAllCheckInsAndCounts = () => {
  // Reset all surfer counts to 0
  Object.keys(activeSurferCounts).forEach(spotId => {
    activeSurferCounts[spotId] = 0;
    updateGlobalSurferCount(spotId, 0);
  });
  
  // Clear all active check-ins
  Object.keys(activeCheckIns).forEach(spotId => {
    activeCheckIns[spotId] = [];
  });
  
  // Broadcast updates via WebSocket
  Object.keys(activeSurferCounts).forEach(spotId => {
    webSocketService.send({
      type: WebSocketMessageType.SURFER_COUNT_UPDATE,
      payload: {
        spotId,
        count: 0,
        lastUpdated: new Date().toISOString()
      }
    });
  });
  
};

// Initialize the global state with our initial data
Object.keys(activeSurferCounts).forEach(spotId => {
  updateGlobalSurferCount(spotId, activeSurferCounts[spotId]);
});

// Reset everything on app initialization
resetAllCheckInsAndCounts();

// Function to update a spot's surfer count and emit the event
const updateSurferCount = (spotId: string, count: number) => {
  // Update the local count
  activeSurferCounts[spotId] = count;
  
  // Update the global state
  updateGlobalSurferCount(spotId, count);
  
  // Emit the event
  emitSurferCountUpdated(spotId, count);
};

/**
 * Fetches current surf conditions for a specific spot
 * This is a mock implementation that would be replaced with actual API calls
 */
export const fetchSurfConditions = async (spotId: string): Promise<SurfConditions | null> => {
  try {
    // Get current surfer count
    const surferCount = await getSurferCount(spotId);
    
    // Get spot coordinates for Great Lakes data
    const spot = spotsData.find(s => s.id === spotId);
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
      // Convert to SurfConditions format
      const conditions: SurfConditions = {
        spotId,
        timestamp: new Date().toISOString(),
        waveHeight: aggregated.waveHeight,
        wind: aggregated.wind,
        swell: aggregated.swell,
        weather: {
          temperature: aggregated.waterTemp.value,
          condition: 'partly-cloudy',
          unit: 'F'
        },
        rating: aggregated.rating,
        source: aggregated.waveHeight.sources.join(','),
        surferCount,
        // Map the new surf report fields
        surfLikelihood: aggregated.surfLikelihood,
        surfReport: aggregated.surfReport,
        notes: aggregated.notes,
      };
      
  
      
      return conditions;
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
    const spot = spotsData.find(s => s.id === spotId);
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
        'duluth'
      );
      
      // Generate forecast summary
      const forecastSummary = generateForecastSummary(forecastSurfLikelihood, day);
      
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
        notes: [], // Forecast doesn't include notes for now
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

    const nearbySpots = spotsData.filter((spot: any) =>
      isWithinRadius(latitude, longitude, spot.location.latitude, spot.location.longitude, radius)
    );

    return nearbySpots;
  } catch (error) {
    console.error('Error fetching nearby surf spots:', error);
    return null;
  }
};

/**
 * Get the current active surfer count for a spot
 * This is a mock implementation
 */
export const getSurferCount = async (spotId: string): Promise<number> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Make sure we're returning the most current count from global state
    const currentCount = globalSurferCounts[spotId] || 0;
    
    
    // Also update the local state to ensure it's in sync
    activeSurferCounts[spotId] = currentCount;
    
    // No need to emit events here, as they'll come through WebSocket events
    // This avoids duplicate updates
    
    return currentCount;
  } catch (error) {
    console.error('Error getting surfer count:', error);
    return 0;
  }
};

/**
 * Check in to a surf spot
 * This will increment the surfer count for the spot
 */
export const checkInToSpot = async (
  userId: string, 
  spotId: string, 
  data?: Partial<CheckIn>
): Promise<CheckIn | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate expiration time (2 hours from now by default)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    
    const checkIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      userId,
      spotId,
      timestamp: now.toISOString(),
      expiresAt,
      isActive: true,
      conditions: data?.conditions,
      comment: data?.comment,
      imageUrls: data?.imageUrls,
    };
    
    // Add to active check-ins
    if (!activeCheckIns[spotId]) {
      activeCheckIns[spotId] = [];
    }
    activeCheckIns[spotId].push(checkIn);
    
    // Increment surfer count
    if (!activeSurferCounts[spotId]) {
      activeSurferCounts[spotId] = 0;
    }
    activeSurferCounts[spotId]++;
    
    // Update the global user check-in status
    updateUserCheckedInStatus(spotId, true);
    

    
    // Create WebSocket messages
    const surferCountMsg: SurferCountUpdateMessage = {
      spotId,
      count: activeSurferCounts[spotId],
      lastUpdated: now.toISOString()
    };
    
    const checkInStatusMsg: CheckInStatusMessage = {
      userId,
      spotId,
      isCheckedIn: true,
      timestamp: now.toISOString()
    };
    
    // Send WebSocket messages to notify all clients
    webSocketService.send({
      type: WebSocketMessageType.SURFER_COUNT_UPDATE,
      payload: surferCountMsg
    });
    
    webSocketService.send({
      type: WebSocketMessageType.CHECK_IN_STATUS_CHANGE,
      payload: checkInStatusMsg
    });
    
    // For backward compatibility, still emit events
    emitCheckInStatusChanged(spotId, true);
    emitSurferCountUpdated(spotId, activeSurferCounts[spotId]);
    
    return checkIn;
  } catch (error) {
    console.error('Error checking in to spot:', error);
    return null;
  }
};

/**
 * Check out from a surf spot
 * This will decrement the surfer count for the spot
 */
export const checkOutFromSpot = async (checkInId: string): Promise<boolean> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
 
    
    // Find the check-in
    let foundSpotId: string | null = null;
    let foundCheckIn: CheckIn | null = null;
    
    for (const spotId in activeCheckIns) {
      const checkInIndex = activeCheckIns[spotId].findIndex(checkin => checkin.id === checkInId);
      if (checkInIndex >= 0) {
        foundSpotId = spotId;
        foundCheckIn = activeCheckIns[spotId][checkInIndex];
        // Remove from active check-ins
        activeCheckIns[spotId].splice(checkInIndex, 1);
        break;
      }
    }
    
    if (foundSpotId && foundCheckIn) {
      // Update the global user check-in status
      updateUserCheckedInStatus(foundSpotId, false);
      
      // Decrement surfer count
      if (activeSurferCounts[foundSpotId] > 0) {
        activeSurferCounts[foundSpotId]--;
      }
      
   
      
      const now = new Date();
      
      // Create WebSocket messages
      const surferCountMsg: SurferCountUpdateMessage = {
        spotId: foundSpotId,
        count: activeSurferCounts[foundSpotId],
        lastUpdated: now.toISOString()
      };
      
      const checkInStatusMsg: CheckInStatusMessage = {
        userId: foundCheckIn.userId,
        spotId: foundSpotId,
        isCheckedIn: false,
        timestamp: now.toISOString()
      };
      
      // Send WebSocket messages to notify all clients
      webSocketService.send({
        type: WebSocketMessageType.SURFER_COUNT_UPDATE,
        payload: surferCountMsg
      });
      
      webSocketService.send({
        type: WebSocketMessageType.CHECK_IN_STATUS_CHANGE,
        payload: checkInStatusMsg
      });
      
      // For backward compatibility, still emit events
      emitCheckInStatusChanged(foundSpotId, false);
      emitSurferCountUpdated(foundSpotId, activeSurferCounts[foundSpotId]);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking out from spot:', error);
    return false;
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

/**
 * Get active check-in for a user at a specific spot
 * This is used to retrieve the current check-in state
 */
export const getActiveCheckInForUser = async (
  userId: string, 
  spotId: string
): Promise<CheckIn | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if this spot has active check-ins
    if (!activeCheckIns[spotId]) {
      return null;
    }
    
    // Find active check-in for this user at this spot
    const activeCheckIn = activeCheckIns[spotId].find(
      checkin => checkin.userId === userId && checkin.isActive
    );
    
    return activeCheckIn || null;
  } catch (error) {
    console.error('Error getting active check-in:', error);
    return null;
  }
};

/**
 * Get active check-in for a user at any spot
 * This is used to prevent a user from being checked in at multiple spots
 */
export const getActiveCheckInForUserAnywhere = async (
  userId: string
): Promise<CheckIn | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check all spots for an active check-in by this user
    for (const spotId in activeCheckIns) {
      const checkIn = activeCheckIns[spotId].find(
        checkin => checkin.userId === userId && checkin.isActive
      );
      
      if (checkIn) {
        return checkIn;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting active check-in anywhere:', error);
    return null;
  }
}; 