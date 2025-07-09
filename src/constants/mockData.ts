/**
 * Mock data for development and testing
 */
import type { 
  SurfSpot, 
  SurfConditions, 
  CheckIn,
  SurfSession,
  User
} from '../types';

/**
 * Mock surf spots
 */
export const MOCK_SURF_SPOTS: SurfSpot[] = [
  {
    id: 'spot-1',
    name: 'Ocean Beach',
    location: {
      latitude: 37.7683,
      longitude: -122.5122,
      address: 'Great Highway',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
    },
    difficulty: 'intermediate',
    type: ['beach-break'],
    amenities: ['parking', 'restrooms'],
    description: 'A powerful beach break known for its consistent waves and sometimes challenging conditions.',
    imageUrls: [
      'https://images.unsplash.com/photo-1501963393473-9631c7bc5ea3',
      'https://images.unsplash.com/photo-1414073875831-b47709631146',
    ],
    buoyIds: ['46026'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'spot-2',
    name: 'Mavericks',
    location: {
      latitude: 37.4954,
      longitude: -122.4996,
      city: 'Half Moon Bay',
      state: 'CA',
      country: 'USA',
    },
    difficulty: 'expert',
    type: ['big-wave', 'reef'],
    amenities: ['parking'],
    description: 'World-famous big wave spot that can hold waves over 60 feet tall. For experts only.',
    imageUrls: [
      'https://images.unsplash.com/photo-1516333797729-98ec886d1fa7',
    ],
    buoyIds: ['46012'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'spot-3',
    name: 'Huntington Beach',
    location: {
      latitude: 33.6594,
      longitude: -118.0017,
      address: 'Pacific Coast Highway',
      city: 'Huntington Beach',
      state: 'CA',
      country: 'USA',
    },
    difficulty: 'intermediate',
    type: ['beach-break', 'pier'],
    amenities: ['parking', 'restrooms', 'showers', 'food'],
    description: 'Surf City USA with consistent beach break waves. Home to many surf competitions.',
    imageUrls: [
      'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1',
    ],
    buoyIds: ['46222'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'spot-4',
    name: 'Trestles',
    location: {
      latitude: 33.3853,
      longitude: -117.5939,
      city: 'San Clemente',
      state: 'CA',
      country: 'USA',
    },
    difficulty: 'intermediate',
    type: ['point-break'],
    amenities: ['parking'],
    description: 'One of California\'s most perfect and high-performance waves.',
    imageUrls: [
      'https://images.unsplash.com/photo-1455729552865-3658a5d39692',
    ],
    buoyIds: ['46242'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'spot-5',
    name: 'Black\'s Beach',
    location: {
      latitude: 32.8898,
      longitude: -117.2591,
      city: 'La Jolla',
      state: 'CA',
      country: 'USA',
    },
    difficulty: 'advanced',
    type: ['beach-break'],
    amenities: [],
    description: 'Powerful beach break with great shape. Requires a hike to access.',
    imageUrls: [
      'https://images.unsplash.com/photo-1506797220058-28d071b159e0',
    ],
    buoyIds: ['46254'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

/**
 * Generate mock surf conditions for a spot
 * @param spotId - The ID of the surf spot
 * @param date - The date for which to generate conditions
 * @returns Mock surf conditions
 */
export const generateMockConditions = (spotId: string, date: Date = new Date()): SurfConditions => {
  // Get hour to create variation through the day
  const hour = date.getHours();
  
  // Create random but somewhat realistic conditions
  const waveHeightBase = 2 + Math.sin(hour / 24 * Math.PI) * 1.5;
  const waveHeightMin = Math.max(0.5, waveHeightBase - 0.5 + (Math.random() * 0.5));
  const waveHeightMax = waveHeightMin + 0.5 + (Math.random() * 1);
  
  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const windDirection = windDirections[Math.floor(Math.random() * windDirections.length)];
  
  // Morning is typically less windy
  const isOffshore = hour < 10 || hour > 18;
  const windSpeed = isOffshore 
    ? 5 + (Math.random() * 5) 
    : 10 + (Math.random() * 10);
  
  const swellHeight = waveHeightBase * 0.7;
  const swellPeriod = 8 + (Math.random() * 6);
  const swellDirection = windDirections[Math.floor(Math.random() * windDirections.length)];
  
  // Tide cycle (simplified)
  const tideHour = (hour + date.getDay() * 24) % 12.4;
  const tideHeight = 3 + Math.sin(tideHour / 12.4 * 2 * Math.PI) * 2;
  
  // Next high and low tides (simplified)
  const nextHighLow = getNextTides(date, tideHour);
  
  // Temperature varies by time of day
  const baseTemp = 70; // Base temperature in F
  const tempVariation = Math.sin(hour / 24 * 2 * Math.PI) * 8;
  const temperature = baseTemp + tempVariation;
  
  // Overall rating based on conditions
  const isGoodWaveHeight = waveHeightMax > 1.5 && waveHeightMax < 6;
  const isGoodWind = isOffshore || windSpeed < 10;
  const isGoodSwell = swellPeriod > 10;
  
  let rating = 5; // Average start
  if (isGoodWaveHeight) rating += 1;
  if (isGoodWind) rating += 2;
  if (isOffshore) rating += 1;
  if (isGoodSwell) rating += 1;
  if (swellPeriod > 12) rating += 1;
  
  // Clamp rating between 1-10
  rating = Math.max(1, Math.min(10, rating));
  
  return {
    spotId,
    timestamp: date.toISOString(),
    waveHeight: {
      min: waveHeightMin,
      max: waveHeightMax,
      unit: 'ft',
    },
    wind: {
      speed: windSpeed,
      direction: isOffshore ? 'offshore' : 'onshore',
      unit: 'mph',
    },
    swell: [{
      height: swellHeight,
      period: swellPeriod,
      direction: swellDirection,
    }],
    tide: {
      current: tideHeight,
      nextHighTime: nextHighLow.nextHighTime,
      nextHighHeight: nextHighLow.nextHighHeight,
      nextLowTime: nextHighLow.nextLowTime,
      nextLowHeight: nextHighLow.nextLowHeight,
      unit: 'ft',
    },
    weather: {
      temperature,
      condition: getWeatherCondition(hour, windSpeed),
      unit: 'F',
    },
    rating,
    source: 'mock',
  };
};

/**
 * Helper to get next high and low tides
 */
const getNextTides = (date: Date, tideHour: number) => {
  const now = date.getTime();
  
  // Simplified tide calculation (real implementation would use tide tables)
  const hourMs = 60 * 60 * 1000;
  const tideCycle = 12.4 * hourMs;
  
  // Time to next high tide
  const hoursToNextHigh = (12.4 - (tideHour % 12.4)) / 2;
  const nextHighTime = new Date(now + hoursToNextHigh * hourMs).toISOString();
  const nextHighHeight = 5; // Max height
  
  // Time to next low tide
  const hoursToNextLow = (12.4 - ((tideHour + 6.2) % 12.4)) / 2;
  const nextLowTime = new Date(now + hoursToNextLow * hourMs).toISOString();
  const nextLowHeight = 1; // Min height
  
  return {
    nextHighTime,
    nextHighHeight,
    nextLowTime,
    nextLowHeight,
  };
};

/**
 * Helper to get weather condition based on time and wind
 */
const getWeatherCondition = (hour: number, windSpeed: number): string => {
  // Simplified weather patterns
  if (hour >= 7 && hour <= 18) {
    if (windSpeed > 15) return 'windy';
    if (Math.random() > 0.7) return 'partly-cloudy';
    return 'sunny';
  } else {
    if (Math.random() > 0.8) return 'cloudy';
    return 'clear';
  }
};

/**
 * Generate a forecast for a spot
 * @param spotId - The ID of the surf spot
 * @param days - Number of days to forecast
 * @returns Array of forecast conditions
 */
export const generateMockForecast = (
  spotId: string, 
  days: number = 7
): SurfConditions[] => {
  const forecast: SurfConditions[] = [];
  const now = new Date();
  
  // Create forecast for each day, every 3 hours
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour += 3) {
      const forecastDate = new Date(now);
      forecastDate.setDate(now.getDate() + day);
      forecastDate.setHours(hour, 0, 0, 0);
      
      forecast.push(generateMockConditions(spotId, forecastDate));
    }
  }
  
  return forecast;
};

/**
 * Mock check-ins for surf spots
 */
export const MOCK_CHECK_INS: CheckIn[] = [
  {
    id: 'checkin-1',
    userId: 'user-1',
    spotId: 'spot-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    conditions: {
      waveHeight: 3.5,
      crowdLevel: 'moderate',
      windQuality: 'good',
      overallRating: 4,
    },
    comment: 'Great morning session with clean conditions',
    imageUrls: ['https://images.unsplash.com/photo-1502680390469-be75c86b636f'],
  },
  {
    id: 'checkin-2',
    userId: 'user-2',
    spotId: 'spot-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    conditions: {
      waveHeight: 3,
      crowdLevel: 'crowded',
      windQuality: 'fair',
      overallRating: 3,
    },
    comment: 'Starting to get choppy as the wind picks up',
  },
  {
    id: 'checkin-3',
    userId: 'user-3',
    spotId: 'spot-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    conditions: {
      waveHeight: 2,
      crowdLevel: 'moderate',
      windQuality: 'excellent',
      overallRating: 5,
    },
    comment: 'Perfect conditions right now!',
    imageUrls: ['https://images.unsplash.com/photo-1455729552865-3658a5d39692'],
  },
];

/**
 * Mock surf sessions
 */
export const MOCK_SURF_SESSIONS: SurfSession[] = [
  {
    id: 'session-1',
    userId: 'user-1',
    spotId: 'spot-1',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
    endTime: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    duration: 60,
    board: {
      type: 'shortboard',
      details: '6\'2" thruster',
    },
    conditions: {
      waveHeight: 4,
      quality: 'good',
    },
    performance: {
      wavesRidden: 15,
      longestRide: 12,
      bestWave: 8,
    },
    notes: 'Caught some great rides on the outside peak. Need to work on my cutbacks.',
    imageUrls: ['https://images.unsplash.com/photo-1515541324332-7dd0c37426e0'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
  },
  {
    id: 'session-2',
    userId: 'user-1',
    spotId: 'spot-3',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    endTime: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
    duration: 75,
    board: {
      type: 'fish',
      details: '5\'10" twin fin',
    },
    conditions: {
      waveHeight: 2.5,
      quality: 'fair',
    },
    performance: {
      wavesRidden: 20,
      longestRide: 8,
      bestWave: 7,
    },
    notes: 'Small but fun. The fish was perfect for these conditions.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
  },
];

/**
 * Mock user data
 */
export const MOCK_USER: User = {
  id: 'user-1',
  username: 'surfer123',
  email: 'surfer@example.com',
  name: 'Wave Rider',
  profilePicture: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5',
  preferences: {
    favoriteSpots: ['spot-1', 'spot-3'],
    preferredConditions: {
      minWaveHeight: 2,
      maxWaveHeight: 6,
      preferredWindDirection: ['offshore'],
      preferredSwellDirection: ['W', 'NW'],
      preferredTideLevel: ['rising', 'falling'],
    },
    notificationPreferences: {
      enablePushNotifications: true,
      notifyOnFavoriteSpots: true,
      notifyOnPreferredConditions: true,
      dailyForecastSummary: true,
    },
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-03-15T00:00:00Z',
}; 