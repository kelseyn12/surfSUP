/**
 * NOAA wind data fetching and parsing.
 */

import { WindData } from '../types';
import { normalizeWindDirection } from './greatLakesConstants';

// ─── Public API ──────────────────────────────────────────────────────────────

export const fetchAllWindData = async (
  latitude: number,
  longitude: number
): Promise<WindData | null> => {
  try {
    return await fetchNOAAWindData(latitude, longitude);
  } catch (error) {
    console.error('🌊 Error fetching wind data:', error);
    return null;
  }
};

// ─── NOAA Marine Forecast ────────────────────────────────────────────────────

const fetchNOAAWindData = async (
  latitude: number,
  longitude: number
): Promise<WindData | null> => {
  try {
    // MQT (Marquette) handles Michigan UP; DLH (Duluth) handles MN/WI
    const forecastZone = longitude >= -88.0 && latitude <= 47.0 ? 'MQT' : 'DLH';
    const url = `https://api.weather.gov/products/types/GLFLS/locations/${forecastZone}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features?.length) return null;

    const forecast: string = data.features[0].properties.productText;

    // Try multiple patterns in order of specificity
    const windPatterns = [
      /(\w+)\s+winds?\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
      /(\w+)\s+winds?\s+(\d+)\s+knots?/i,
      /winds?\s+(\w+)\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
      /winds?\s+(\w+)\s+(\d+)\s+knots?/i,
      /(\w+)\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
      /(\w+)\s+(\d+)\s+knots?/i,
      /(north|south|east|west|northeast|northwest|southeast|southwest|nne|nnw|ene|ese|sse|ssw|wsw|wnw)\s+winds?\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
      /(north|south|east|west|northeast|northwest|southeast|southwest|nne|nnw|ene|ese|sse|ssw|wsw|wnw)\s+winds?\s+(\d+)\s+knots?/i,
    ];

    let windMatch: RegExpMatchArray | null = null;
    for (const pattern of windPatterns) {
      windMatch = forecast.match(pattern);
      if (windMatch) break;
    }

    if (windMatch) {
      let windDirection = '';
      let windSpeed = 0;

      if (windMatch.length === 4) {
        windDirection = normalizeWindDirection(windMatch[1]);
        windSpeed = ((parseInt(windMatch[2]) + parseInt(windMatch[3])) / 2) * 1.15078;
      } else if (windMatch.length === 3) {
        windDirection = normalizeWindDirection(windMatch[1]);
        windSpeed = parseInt(windMatch[2]) * 1.15078;
      }

      if (windSpeed > 0 && windSpeed < 50 && windDirection) {
        return {
          windSpeed: Math.round(windSpeed * 10) / 10,
          windDirection,
          temperature: undefined,
          pressure: undefined,
          source: 'noaa-marine-forecast',
        };
      }
    }

    // Fuzzy fallback
    const fallback = extractFallbackWind(forecast);
    if (fallback) {
      return {
        windSpeed: fallback.speed,
        windDirection: fallback.direction,
        temperature: undefined,
        pressure: undefined,
        source: 'noaa-marine-forecast-fallback',
      };
    }

    return null;
  } catch (error) {
    console.error('🌊 Error fetching NOAA wind data:', error);
    return null;
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const extractFallbackWind = (
  forecast: string
): { speed: number; direction: string } | null => {
  try {
    const mentions = forecast.match(/(\w+)\s+(\d+)\s*(knots?|mph|miles?)/gi);
    if (!mentions?.length) return null;

    const parts = mentions[0].split(/\s+/);
    if (parts.length < 2) return null;

    const direction = normalizeWindDirection(parts[0]);
    const speed = parseInt(parts[1]);
    if (isNaN(speed)) return null;

    return { speed: speed * 1.15078, direction };
  } catch (error) {
    console.error('🌊 Error in fallback wind extraction:', error);
    return null;
  }
};
