/**
 * Utility functions for calculating surf condition ratings and metrics
 */
import { WAVE_HEIGHT, WIND } from '../constants';
import type { SurfConditions } from '../types';
import { fetchSurfConditions } from '../services/api';

/**
 * Calculate the overall rating for surf conditions (1-10)
 * @param conditions The surf conditions object
 * @returns A rating from 1-10
 */
export const calculateConditionRating = (conditions: SurfConditions): number => {
  // Base scores for different factors
  const waveScore = calculateWaveScore(conditions.waveHeight.min, conditions.waveHeight.max);
  const windScore = calculateWindScore(conditions.wind.speed, conditions.wind.direction);
  const swellScore = calculateSwellScore(conditions.swell);
  const tideScore = calculateTideScore(conditions.tide.current);
  
  // Weighted average (these weights can be adjusted)
  const rating = (
    waveScore * 0.4 + 
    windScore * 0.3 + 
    swellScore * 0.2 + 
    tideScore * 0.1
  );
  
  // Round to nearest 0.5
  return Math.round(rating * 2) / 2;
};

/**
 * Calculate the score for wave height (1-10)
 * @param minHeight Minimum wave height
 * @param maxHeight Maximum wave height
 * @returns A score from 1-10
 */
export const calculateWaveScore = (minHeight: number, maxHeight: number): number => {
  const avgHeight = (minHeight + maxHeight) / 2;
  
  // Flat conditions get low scores
  if (avgHeight < WAVE_HEIGHT.FLAT.max) {
    return 2;
  }
  
  // Small waves get moderate scores
  if (avgHeight < WAVE_HEIGHT.SMALL.max) {
    return 5 + (avgHeight - WAVE_HEIGHT.SMALL.min) / 
      (WAVE_HEIGHT.SMALL.max - WAVE_HEIGHT.SMALL.min) * 2;
  }
  
  // Medium waves get high scores
  if (avgHeight < WAVE_HEIGHT.MEDIUM.max) {
    return 7 + (avgHeight - WAVE_HEIGHT.MEDIUM.min) / 
      (WAVE_HEIGHT.MEDIUM.max - WAVE_HEIGHT.MEDIUM.min) * 2;
  }
  
  // Large waves get good scores but slightly lower than medium
  if (avgHeight < WAVE_HEIGHT.LARGE.max) {
    return 8;
  }
  
  // Epic waves get excellent scores
  if (avgHeight < WAVE_HEIGHT.EPIC.max) {
    return 9;
  }
  
  // Huge waves get lower scores as they're too big for most surfers
  return 5;
};

/**
 * Calculate the score for wind conditions (1-10)
 * @param speed Wind speed
 * @param direction Wind direction ('offshore', 'onshore', 'cross')
 * @returns A score from 1-10
 */
export const calculateWindScore = (speed: number, direction: string): number => {
  // Base score based on direction
  let baseScore = 0;
  
  switch (direction) {
    case WIND.OFFSHORE.direction:
      baseScore = 9;
      break;
    case WIND.CROSS_SHORE.direction:
      baseScore = 6;
      break;
    case WIND.ONSHORE.direction:
      baseScore = 3;
      break;
    default:
      baseScore = 5;
  }
  
  // Adjust based on speed
  if (speed <= 7) { // Light winds
    // Light offshore is perfect, light onshore is better than strong onshore
    return baseScore + 1;
  } else if (speed <= 15) { // Moderate winds
    return baseScore;
  } else { // Strong winds
    // Strong winds reduce quality
    return Math.max(1, baseScore - 2);
  }
};

/**
 * Calculate score for swell conditions (1-10)
 * @param swells Array of swell objects
 * @returns A score from 1-10
 */
export const calculateSwellScore = (
  swells: Array<{ height: number; period: number; direction: string }>
): number => {
  if (swells.length === 0) return 5;
  
  // Calculate score for each swell and use the max score
  // or a weighted average of the primary and secondary swells
  return Math.max(
    ...swells.map(swell => {
      // Swell period is very important for quality waves
      const periodScore = calculatePeriodScore(swell.period);
      
      // Swell height contributes to overall size
      const heightScore = calculateSwellHeightScore(swell.height);
      
      // Direction is important but varies by break - assuming ideal direction for now
      const directionScore = 8; // Placeholder for direction calculation
      
      return (periodScore * 0.5) + (heightScore * 0.3) + (directionScore * 0.2);
    })
  );
};

/**
 * Calculate score for swell period (1-10)
 * @param period Swell period in seconds
 * @returns A score from 1-10
 */
export const calculatePeriodScore = (period: number): number => {
  if (period < 6) return 3; // Wind swell, poor quality
  if (period < 8) return 5; // Short period, moderate quality
  if (period < 10) return 7; // Medium period, good quality
  if (period < 12) return 9; // Long period, excellent quality
  return 10; // Very long period, perfect conditions
};

/**
 * Calculate score for swell height (1-10)
 * @param height Swell height
 * @returns A score from 1-10
 */
export const calculateSwellHeightScore = (height: number): number => {
  if (height < 1) return 3;
  if (height < 2) return 5;
  if (height < 3) return 7;
  if (height < 5) return 9;
  if (height < 8) return 10;
  return 8; // Very large swell
};

/**
 * Calculate score for tide level (1-10)
 * @param currentTide Current tide height
 * @returns A score from 1-10
 */
export const calculateTideScore = (currentTide: number): number => {
  // This is simplified and would depend on the spot
  // Some spots work better at low tide, others at high tide
  
  // Assuming a generic beach break that works best at mid tide
  const idealTide = 3; // Example value for mid tide
  const difference = Math.abs(currentTide - idealTide);
  
  if (difference < 0.5) return 9;
  if (difference < 1) return 8;
  if (difference < 1.5) return 7;
  if (difference < 2) return 6;
  return 5;
};

/**
 * Determine if conditions are good based on user preferences
 * @param conditions Current surf conditions
 * @param preferences User's preferred conditions
 * @returns Boolean indicating if conditions match preferences
 */
export const matchesUserPreferences = (
  conditions: SurfConditions,
  preferences: {
    minWaveHeight?: number;
    maxWaveHeight?: number;
    preferredWindDirection?: string[];
    preferredSwellDirection?: string[];
    preferredTideLevel?: string[];
  }
): boolean => {
  // Check wave height preferences
  const avgWaveHeight = (conditions.waveHeight.min + conditions.waveHeight.max) / 2;
  if (
    (preferences.minWaveHeight !== undefined && avgWaveHeight < preferences.minWaveHeight) ||
    (preferences.maxWaveHeight !== undefined && avgWaveHeight > preferences.maxWaveHeight)
  ) {
    return false;
  }
  
  // Check wind direction preferences
  if (
    preferences.preferredWindDirection &&
    preferences.preferredWindDirection.length > 0 &&
    !preferences.preferredWindDirection.includes(conditions.wind.direction)
  ) {
    return false;
  }
  
  // Check primary swell direction
  if (
    preferences.preferredSwellDirection &&
    preferences.preferredSwellDirection.length > 0 &&
    conditions.swell.length > 0 &&
    !preferences.preferredSwellDirection.includes(conditions.swell[0].direction)
  ) {
    return false;
  }
  
  // More checks could be added for tide, etc.
  
  return true;
};

/**
 * Get a descriptive label for surf conditions
 * @param rating Surf condition rating (1-10)
 * @returns A descriptive label
 */
export const getConditionLabel = (rating: number): string => {
  if (rating >= 9) return 'Epic';
  if (rating >= 7) return 'Great';
  if (rating >= 5) return 'Good';
  if (rating >= 3) return 'Fair';
  return 'Poor';
};

/**
 * Determines if it's daylight hours at a given location and time
 * @param date The date to check
 * @param latitude The latitude of the location
 * @param longitude The longitude of the location
 * @returns Boolean indicating if it's daylight hours
 */
export const isDaylightHours = (
  date: Date,
  latitude: number,
  longitude: number
): boolean => {
  // Calculate the day of the year (0-365)
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  // Calculate the solar declination angle
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);

  // Calculate the hour angle
  const hourAngle = Math.acos(-Math.tan(latitude * Math.PI / 180) * Math.tan(declination * Math.PI / 180)) * 180 / Math.PI;

  // Calculate sunrise and sunset times (in hours)
  const sunrise = 12 - hourAngle / 15 - longitude / 15;
  const sunset = 12 + hourAngle / 15 - longitude / 15;

  // Get the current hour (in local time)
  const hour = date.getHours() + date.getMinutes() / 60;

  // Check if current time is between sunrise and sunset
  return hour >= sunrise && hour < sunset;
};

export const calculateSurfRating = (conditions: SurfConditions): number => {
  // Calculate rating based on wave height, wind speed, and direction
  const waveHeightScore = conditions.waveHeight.min >= 2 ? 5 : conditions.waveHeight.min >= 1 ? 3 : 1;
  const windSpeedScore = conditions.wind.speed <= 10 ? 5 : conditions.wind.speed <= 15 ? 3 : 1;
  const windDirection = parseInt(conditions.wind.direction);
  const windDirectionScore = !isNaN(windDirection) && windDirection >= 0 && windDirection <= 90 ? 5 : 3;

  // Calculate average score
  return (waveHeightScore + windSpeedScore + windDirectionScore) / 3;
};

export const calculateSurfConditions = async (spotId: string): Promise<SurfConditions | null> => {
  try {
    // Get current conditions
    const conditions = await fetchSurfConditions(spotId);
    if (!conditions) return null;

    // Calculate surf rating
    const rating = calculateSurfRating(conditions);

    return {
      ...conditions,
      rating,
    };
  } catch (error) {
    console.error('Error calculating surf conditions:', error);
    return null;
  }
}; 