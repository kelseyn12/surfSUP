/**
 * Application constants
 */

// Colors used throughout the app
export const COLORS = {
  primary: '#0077B6', // Ocean Blue
  secondary: '#00B4D8', // Light Blue
  tertiary: '#90E0EF', // Sky Blue
  background: '#F8F9FA', // Light Gray
  white: '#FFFFFF', 
  black: '#000000',
  gray: '#6C757D',
  lightGray: '#CED4DA',
  error: '#DC3545', // Red
  success: '#28A745', // Green
  warning: '#FFC107', // Yellow
  info: '#17A2B8', // Teal
  text: {
    primary: '#212529', // Dark Gray
    secondary: '#6C757D', // Medium Gray
    light: '#F8F9FA', // Light Gray
  },
  surfConditions: {
    surfPoor: '#DC3545', // Red
    surfFair: '#FFC107', // Yellow
    surfGood: '#28A745', // Green
    surfExcellent: '#17A2B8', // Teal
  },
  transparent: 'transparent',
};

// Font sizes
export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  title: 28,
  header: 32,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  circle: 9999,
};

// Route names for navigation
export const ROUTES = {
  // Auth related routes
  AUTH: 'Auth',
  SIGN_IN: 'SignIn',
  SIGN_UP: 'SignUp',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main tabs
  MAIN: 'Main',
  HOME: 'Home',
  MAP: 'Map',
  FAVORITES: 'Favorites',
  PROFILE: 'Profile',
  
  // Content screens
  SPOT_DETAILS: 'SpotDetails',
  CHECK_IN: 'CheckIn',
  SESSION_LOG: 'SessionLog',
  SESSION_DETAILS: 'SessionDetails',
  SETTINGS: 'Settings',
  ON_BOARDING: 'OnBoarding',
};

// API endpoints
export const API = {
  WINDY: 'https://api.windy.com',
  NOAA: 'https://api.weather.gov',
  NDBC: 'https://www.ndbc.noaa.gov/data/realtime2',
};

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  USER_PROFILE: 'user_profile',
  AUTH_TOKEN: 'auth_token',
  FAVORITE_SPOTS: 'favorite_spots',
  RECENT_SPOTS: 'recent_spots',
  USER_SESSIONS: 'user_sessions',
  USER_SETTINGS: 'user_settings',
  ONBOARDING_COMPLETE: 'onboarding_complete',
};

// Message constants
export const MESSAGES = {
  ERRORS: {
    GENERAL: 'Something went wrong. Please try again.',
    NETWORK: 'Network error. Please check your connection.',
    AUTH: 'Authentication failed. Please login again.',
    LOCATION_PERMISSION: 'Location permissions are required to use this feature.',
    LOCATION_UNAVAILABLE: 'Could not determine your location.',
  },
  SUCCESS: {
    CHECK_IN: 'Successfully checked in!',
    SESSION_LOGGED: 'Session logged successfully!',
    SPOT_ADDED: 'Spot added to favorites!',
    SPOT_REMOVED: 'Spot removed from favorites!',
  },
};

// Timeouts in milliseconds
export const TIMEOUTS = {
  LOCATION: 10000, // 10 seconds
  API_CALL: 15000, // 15 seconds
  REFRESH_INTERVAL: 900000, // 15 minutes
};

// Define surf condition thresholds
export const CONDITION_THRESHOLDS = {
  WAVE_HEIGHT: {
    POOR: 0.5, // Less than 0.5m is poor
    FAIR: 1.0, // 0.5-1.0m is fair
    GOOD: 2.0, // 1.0-2.0m is good
    // Above 2.0m is excellent
  },
  WIND_SPEED: {
    LIGHT: 5, // Less than 5 knots
    MODERATE: 15, // 5-15 knots
    STRONG: 25, // 15-25 knots
    // Above 25 knots is very strong
  },
};

// App configuration
export const APP_CONFIG = {
  // Default map region (San Diego area as an example)
  DEFAULT_REGION: {
    latitude: 32.7157,
    longitude: -117.1611,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  
  // Radius in km to search for nearby spots
  NEARBY_SPOT_RADIUS: 50,
  
  // Refresh intervals in minutes
  FORECAST_REFRESH_INTERVAL: 60, // 1 hour
  BUOY_DATA_REFRESH_INTERVAL: 30, // 30 minutes
  LOCATION_REFRESH_INTERVAL: 5, // 5 minutes
  
  // Maximum number of items
  MAX_FAVORITE_SPOTS: 20,
  MAX_RECENT_SPOTS: 10,
  MAX_SURF_SESSIONS: 50,
  
  // Time intervals for forecast display
  FORECAST_DAYS: 7,
  FORECAST_HOURS_INTERVAL: 3,
};

// Wave height categorization
export const WAVE_HEIGHT = {
  FLAT: { min: 0, max: 0.5, label: 'Flat', color: COLORS.lightGray },
  SMALL: { min: 0.5, max: 2, label: 'Small', color: COLORS.surfFair },
  MEDIUM: { min: 2, max: 4, label: 'Medium', color: COLORS.surfGood },
  LARGE: { min: 4, max: 6, label: 'Large', color: COLORS.surfFair },
  EPIC: { min: 6, max: 10, label: 'Epic', color: COLORS.surfGood },
  HUGE: { min: 10, max: 100, label: 'Huge', color: COLORS.surfPoor },
};

// Wind quality thresholds in mph
export const WIND = {
  OFFSHORE: { direction: 'offshore', label: 'Offshore', color: COLORS.surfGood },
  ONSHORE: { direction: 'onshore', label: 'Onshore', color: COLORS.surfPoor },
  CROSS_SHORE: { direction: 'cross', label: 'Cross Shore', color: COLORS.surfFair },
  LIGHT: { max: 7, label: 'Light', color: COLORS.surfGood },
  MODERATE: { min: 7, max: 15, label: 'Moderate', color: COLORS.surfFair },
  STRONG: { min: 15, label: 'Strong', color: COLORS.surfPoor },
};

// Tidal states
export const TIDE = {
  HIGH: { label: 'High Tide', color: COLORS.surfFair },
  LOW: { label: 'Low Tide', color: COLORS.surfFair },
  RISING: { label: 'Rising Tide', color: COLORS.surfGood },
  FALLING: { label: 'Falling Tide', color: COLORS.surfGood },
};

// API Configuration
export const API_BASE_URL = 'http://localhost:3000/api'; 