/**
 * TypeScript interfaces for the SurfSUP app
 */

// User profile and preferences
export interface User {
  id: string;
  username?: string;
  email: string;
  name: string;
  profileImageUrl?: string;
  stats?: {
    totalSessions: number;
    averageSessionLength: number; // in minutes
    startDate: string;
    favoriteSurfSpot?: string;
    longestSession?: number; // in minutes
  };
  preferences?: {
    favoriteSpots: string[];
    preferredBoard?: 'shortboard' | 'longboard' | 'fish' | 'funboard' | 'sup' | 'other';
    units: 'imperial' | 'metric';
    notifications: boolean;
    homeSpot?: string;
    privacyMode: 'public' | 'friends' | 'private';
  };
  createdAt: string;
  updatedAt?: string;
}

// Surf spot information
export interface SurfSpot {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  type: string[]; // ['beach-break', 'reef', 'point-break', etc.]
  amenities?: string[]; // ['parking', 'restrooms', 'showers', etc.]
  description?: string;
  imageUrls?: string[];
  buoyIds?: string[]; // IDs of nearby buoys for data
  createdAt: string;
  updatedAt: string;
  // Real-time data
  currentSurferCount?: number; // Number of active check-ins
  lastActivityUpdate?: string; // Timestamp of last activity update
}

// Current or forecasted surf conditions
export interface SurfConditions {
  spotId: string;
  timestamp: string;
  waveHeight: {
    min: number;
    max: number;
    unit: 'ft' | 'm';
  };
  wind: {
    speed: number;
    direction: string; // compass direction (N, NE, E, etc.)
    unit: 'mph' | 'kts' | 'kph';
  };
  swell: {
    height: number;
    period: number;
    direction: string;
  }[];
  tide: {
    current: number;
    nextHighTime?: string;
    nextHighHeight?: number;
    nextLowTime?: string;
    nextLowHeight?: number;
    unit: 'ft' | 'm';
  };
  weather: {
    temperature: number;
    condition: string; // 'sunny', 'cloudy', 'rainy', etc.
    unit: 'F' | 'C';
  };
  rating: number; // 1-10 rating of overall conditions
  source: string; // 'windy', 'noaa', 'buoy', etc.
  surferCount?: number; // Number of current surfers at the spot
}

// User check-ins at surf spots
export interface CheckIn {
  id: string;
  userId: string;
  spotId: string;
  timestamp: string;
  expiresAt?: string; // When the check-in automatically expires
  isActive: boolean; // Whether the user is still at the spot
  conditions?: {
    waveHeight: number;
    crowdLevel: 'empty' | 'uncrowded' | 'moderate' | 'crowded' | 'very-crowded';
    windQuality: 'poor' | 'fair' | 'good' | 'excellent';
    overallRating: number; // 1-5 rating
  };
  comment?: string;
  imageUrls?: string[];
}

// Detailed surf session logs
export interface SurfSession {
  id: string;
  userId: string;
  spotId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  board?: {
    type: 'shortboard' | 'longboard' | 'fish' | 'funboard' | 'sup' | 'other';
    details?: string;
  };
  conditions?: {
    waveHeight: number;
    quality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  performance?: {
    wavesRidden: number;
    longestRide?: number; // in seconds
    bestWave?: number; // rating 1-10
  };
  notes?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

// App-wide state interface
export interface AppState {
  user: User | null;
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  favoriteSpots: SurfSpot[];
  nearbySpots: SurfSpot[];
  recentSpots: SurfSpot[];
  selectedSpot: SurfSpot | null;
  currentConditions: Record<string, SurfConditions>; // Keyed by spotId
  forecast: Record<string, SurfConditions[]>; // Keyed by spotId
  recentCheckIns: CheckIn[];
  recentSessions: SurfSession[];
  isLoading: boolean;
  error: string | null;
}

// Map region for React Native Maps
export interface CoordinateRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// API response types
export interface WindyApiResponse {
  data: {
    waves: {
      height: number;
      period: number;
      direction: number;
    };
    wind: {
      speed: number;
      direction: number;
      gusts: number;
    };
    timestamp: number;
  }[];
}

export interface NoaaApiResponse {
  properties: {
    periods: {
      number: number;
      startTime: string;
      endTime: string;
      temperature: number;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      detailedForecast: string;
    }[];
  };
}

export interface NdbcBuoyResponse {
  time: string[];
  wvht: number[]; // significant wave height
  dpd: number[]; // dominant wave period
  mwd: number[]; // mean wave direction
  wspd: number[]; // wind speed
  wdir: number[]; // wind direction
  gst: number[]; // gust speed
  wtemp: number[]; // water temperature
  steepness: string[]; // wave steepness
} 