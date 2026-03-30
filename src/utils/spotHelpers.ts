import { SurfSpot, SurfConditions, AggregatedConditions } from '../types';

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

let spotsData: SurfSpot[] = validateSpots(spotsDataRaw);

/**
 * Replace the in-memory spots list (called by spotService after loading from
 * Firestore / AsyncStorage cache). Falls back to spots.json data if spots is empty.
 */
export const initializeSpots = (spots: SurfSpot[]): void => {
  if (spots.length === 0) return; // keep JSON fallback
  spotsData = validateSpots(spots);
};

/**
 * Get a surf spot by its ID
 */
export const getSpotById = (spotId: string): SurfSpot | undefined => {
  return spotsData.find(spot => spot.id === spotId);
};

/**
 * Get all surf spots
 */
export const getAllSpots = (): SurfSpot[] => {
  return spotsData;
};

/**
 * Create SurfConditions from AggregatedConditions
 */
export const createSurfConditions = (
  spotId: string,
  aggregated: AggregatedConditions,
  surferCount: number = 0
): SurfConditions => {
  // Creating SurfConditions
  
  return {
    spotId,
    timestamp: aggregated.timestamp || new Date().toISOString(), // Preserve original timestamp for forecasts
    waveHeight: aggregated.waveHeight,
    wind: aggregated.wind,
    swell: aggregated.swell,
    weather: {
      temperature: aggregated.waterTemp?.value ?? null,
      condition: 'partly-cloudy',
      unit: 'F'
    },
    rating: aggregated.rating,
    source: aggregated.waveHeight?.sources?.join(',') || aggregated.wind?.sources?.join(',') || 'unknown',
    surferCount,
    surfLikelihood: aggregated.surfLikelihood,
    surfReport: aggregated.surfReport,
    notes: aggregated.notes,
    periodName: (aggregated as any).periodName, // Preserve NOAA period name if available
  };
};

/**
 * Find nearby surf spots based on location, sorted closest-first.
 */
export const findNearbySpots = (
  latitude: number,
  longitude: number,
  radius = 150 // radius in km
): SurfSpot[] => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371; // km

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return spotsData
    .map((spot) => ({
      spot,
      distance: getDistance(latitude, longitude, spot.location.latitude, spot.location.longitude),
    }))
    .filter(({ distance }) => distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .map(({ spot }) => spot);
}; 