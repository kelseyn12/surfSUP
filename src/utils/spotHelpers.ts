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

const spotsData: SurfSpot[] = validateSpots(spotsDataRaw);

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
    timestamp: new Date().toISOString(),
    waveHeight: aggregated.waveHeight,
    wind: aggregated.wind,
    swell: aggregated.swell,
    weather: {
      temperature: aggregated.waterTemp?.value || 0,
      condition: 'partly-cloudy',
      unit: 'F'
    },
    rating: aggregated.rating,
    source: aggregated.waveHeight?.sources?.join(',') || aggregated.wind?.sources?.join(',') || 'unknown',
    surferCount,
    surfLikelihood: aggregated.surfLikelihood,
    surfReport: aggregated.surfReport,
    notes: aggregated.notes,
  };
};

/**
 * Find nearby surf spots based on location
 */
export const findNearbySpots = (
  latitude: number,
  longitude: number,
  radius = 50 // radius in km
): SurfSpot[] => {
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

  return spotsData.filter((spot) =>
    isWithinRadius(latitude, longitude, spot.location.latitude, spot.location.longitude, radius)
  );
}; 