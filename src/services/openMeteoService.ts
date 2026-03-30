/**
 * Open-Meteo Marine + Weather forecast service.
 *
 * Uses the GFS-Wave model (same underlying NOAA data as NWS products) but
 * delivered as clean hourly JSON — no text parsing, no regex, no named periods.
 *
 * Marine API: wave height, period, direction (imperial units)
 * Weather API: wind speed/direction, gusts, air temp (mph / °F)
 *
 * Both are free, no API key, no rate limits for reasonable usage.
 * Covers the Great Lakes natively.
 */

import { WindData } from '../types';
import { normalizeWindDirection, dlog } from './greatLakesConstants';

const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine';
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';

// Sample every N hours — 3h gives ~56 points over 7 days
const SAMPLE_INTERVAL_H = 3;

/**
 * Estimate wave height from wind speed when the GFS-Wave marine model
 * returns near-zero values for inland lakes (known limitation of GFS-Wave
 * at Lake Superior's scale). Only fires for sustained winds ≥15 mph —
 * below that, near-zero marine model output is correct (no surfable waves).
 *
 * Calibrated empirically against Lake Superior observations:
 *   15 mph NE → ~1.1 ft, 20 mph → ~2.25 ft, 30 mph → ~4.5 ft, 40 mph → ~7.5 ft
 *
 * fetch_factor: NE/ENE corridor has 400+ km of open water (1.5x scaling);
 *   other directions use ~150 km effective fetch (1.0x).
 */
const estimateWaveHeightFt = (windSpeedMph: number, windDir: string): number => {
  if (windSpeedMph < 15) return 0;
  const favorableNE = ['N','NNE','NE','ENE','E'].includes(windDir);
  const fetchFactor = favorableNE ? 1.5 : 1.0;
  const Hs_ft = (windSpeedMph - 10) * 0.15 * fetchFactor;
  return Math.min(parseFloat(Hs_ft.toFixed(2)), 10);
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarineHourly {
  time: string[];
  wave_height: number[];
  wave_period: number[];
  wave_direction: number[];
  wind_wave_height: number[];
  wind_wave_period: number[];
}

interface WeatherHourly {
  time: string[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  wind_gusts_10m: number[];
  temperature_2m: number[];
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Fetches hourly wave + wind forecast from Open-Meteo.
 * Returns WindData[] compatible with the existing forecast pipeline.
 */
export const fetchOpenMeteoForecast = async (
  latitude: number,
  longitude: number,
  forecastDays = 7,
  maxHours = 168
): Promise<WindData[]> => {
  dlog(`[OpenMeteo] Fetching ${forecastDays}-day forecast for ${latitude}, ${longitude}`);

  const [marineResult, weatherResult] = await Promise.allSettled([
    fetchMarineData(latitude, longitude, forecastDays),
    fetchWeatherData(latitude, longitude, forecastDays),
  ]);

  const marine = marineResult.status === 'fulfilled' ? marineResult.value : null;
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;

  if (marineResult.status === 'rejected') dlog('[OpenMeteo] Marine API failed:', marineResult.reason);
  if (weatherResult.status === 'rejected') dlog('[OpenMeteo] Weather API failed:', weatherResult.reason);

  if (!marine && !weather) return [];

  return mergeIntoWindData(marine, weather, maxHours);
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchMarineData = async (lat: number, lon: number, days: number): Promise<MarineHourly> => {
  const params = new URLSearchParams({
    latitude:         String(lat),
    longitude:        String(lon),
    hourly:           'wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period',
    length_unit:      'imperial',   // feet
    wind_speed_unit:  'mph',
    timezone:         'auto',
    forecast_days:    String(days),
  });

  const res = await fetch(`${MARINE_BASE}?${params}`);
  if (!res.ok) throw new Error(`Marine API ${res.status}`);
  const json = await res.json();
  return json.hourly as MarineHourly;
};

const fetchWeatherData = async (lat: number, lon: number, days: number): Promise<WeatherHourly> => {
  const params = new URLSearchParams({
    latitude:           String(lat),
    longitude:          String(lon),
    hourly:             'wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m',
    wind_speed_unit:    'mph',
    temperature_unit:   'fahrenheit',
    timezone:           'auto',
    forecast_days:      String(days),
  });

  const res = await fetch(`${WEATHER_BASE}?${params}`);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const json = await res.json();
  return json.hourly as WeatherHourly;
};

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Joins marine wave data and weather wind data by timestamp.
 * Samples every SAMPLE_INTERVAL_H hours to keep the dataset manageable.
 */
const mergeIntoWindData = (
  marine: MarineHourly | null,
  weather: WeatherHourly | null,
  maxHours = 168
): WindData[] => {
  // Build a time-keyed map of weather data for fast lookup
  const weatherMap = new Map<string, {
    windSpeed: number;
    windDir: string;
    gustSpeed: number;
    temperature: number;
  }>();

  if (weather) {
    weather.time.forEach((t, i) => {
      weatherMap.set(t, {
        windSpeed:   weather.wind_speed_10m[i]    ?? 0,
        windDir:     normalizeWindDirection(String(weather.wind_direction_10m[i] ?? 0)),
        gustSpeed:   weather.wind_gusts_10m[i]    ?? 0,
        temperature: weather.temperature_2m[i]    ?? 0,
      });
    });
  }

  const times = marine?.time ?? weather?.time ?? [];
  const results: WindData[] = [];

  times.forEach((timestamp, i) => {
    if (i % SAMPLE_INTERVAL_H !== 0 || i > maxHours) return;

    const w = weatherMap.get(timestamp);
    const windSpeed = w?.windSpeed ?? 0;
    const windDir   = w?.windDir   ?? 'N';

    let waveH = marine?.wave_height[i] ?? 0;
    let waveP = marine?.wave_period[i] ?? 0;
    const waveD = marine?.wave_direction[i];

    // GFS-Wave has poor resolution for inland lakes — if the marine model
    // returns exactly zero (model dropout, not just small waves) and wind is
    // strong enough to generate real surf, estimate from fetch geometry.
    // threshold: waveH === 0 (not just < 0.3) to avoid overriding valid small readings.
    if (waveH === 0 && windSpeed >= 15) {
      waveH = estimateWaveHeightFt(windSpeed, windDir);
      // Estimate period from wave height
      if (waveH > 0 && waveP < 2) {
        waveP = Math.min(8, Math.max(3, waveH * 1.5));
      }
    }

    // Skip hours with no meaningful data
    if (waveH === 0 && windSpeed === 0) return;

    results.push({
      windSpeed,
      windDirection: windDir,
      gustSpeed:     w?.gustSpeed,
      temperature:   w?.temperature,
      waveHeight:    waveH > 0 ? waveH : undefined,
      wavePeriod:    waveP > 1 ? waveP : undefined,
      waveDirection: waveD != null ? normalizeWindDirection(String(waveD)) : undefined,
      source:        'open-meteo',
      timestamp,
    });
  });

  dlog(`[OpenMeteo] Merged ${results.length} forecast points`);
  return results;
};
