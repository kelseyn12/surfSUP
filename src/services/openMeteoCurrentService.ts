/**
 * Current conditions from Open-Meteo model analysis + GLERL GLSEA satellite water temperature.
 *
 * Open-Meteo: wind, wave height/period/direction (GFS model analysis, always available)
 * GLERL GLSEA: Great Lakes Surface Environmental Analysis — satellite-derived SST (VIIRS/AVHRR),
 *              same product used by NWS forecasters. Updated daily, year-round, covers all spots.
 *              Falls back to Open-Meteo SST if GLERL unavailable.
 */

import { AggregatedConditions } from '../types';
import { normalizeWindDirection, dlog } from './greatLakesConstants';
import {
  calculateSurfLikelihood,
  calculateSurfRating,
  generateSurfRecommendations,
  generateUserSummary,
} from './conditionsAggregator';

const MARINE_BASE  = 'https://marine-api.open-meteo.com/v1/marine';
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
const GLERL_ERDDAP = 'https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.json';

// ─── Water Temperature ────────────────────────────────────────────────────────

/**
 * Fetches lake water temperature from GLERL GLSEA (Great Lakes Surface Environmental Analysis).
 * Satellite-derived SST (VIIRS/AVHRR), updated daily, year-round, covers every Great Lakes spot.
 * Returns °F or null if unavailable.
 */
const fetchWaterTemp = async (latitude: number, longitude: number): Promise<number | null> => {
  try {
    // ERDDAP griddap query: sst[(last)][(lat)][(lon)]
    // Nearest grid cell to the requested coordinate is returned automatically.
    const url = `${GLERL_ERDDAP}?sst[(last)][(${latitude})][(${longitude})]`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    // Response rows: [time, lat, lon, sst_celsius]
    const sst = json?.table?.rows?.[0]?.[3];
    if (sst == null || isNaN(sst)) return null;
    const tempF = Math.round(sst * 9 / 5 + 32);
    dlog(`[WaterTemp] GLERL GLSEA at ${latitude},${longitude}: ${sst.toFixed(2)}°C = ${tempF}°F`);
    return tempF;
  } catch {
    return null;
  }
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const fetchCurrentConditions = async (
  latitude: number,
  longitude: number,
  spotId = 'unknown'
): Promise<AggregatedConditions | null> => {
  dlog(`[CurrentConditions] Fetching for ${latitude}, ${longitude}`);

  const weatherParams = new URLSearchParams({
    latitude:          String(latitude),
    longitude:         String(longitude),
    current:           'wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m',
    wind_speed_unit:   'mph',
    temperature_unit:  'fahrenheit',
    timezone:          'auto',
  });

  const marineParams = new URLSearchParams({
    latitude:    String(latitude),
    longitude:   String(longitude),
    current:     'wave_height,wave_period,wave_direction,sea_surface_temperature',
    length_unit: 'imperial',
    timezone:    'auto',
  });

  const [weatherResult, marineResult, waterTempResult] = await Promise.allSettled([
    fetch(`${WEATHER_BASE}?${weatherParams}`).then(r => r.ok ? r.json() : Promise.reject(`Weather API ${r.status}`)),
    fetch(`${MARINE_BASE}?${marineParams}`).then(r => r.ok ? r.json() : Promise.reject(`Marine API ${r.status}`)),
    fetchWaterTemp(latitude, longitude),
  ]);

  if (weatherResult.status === 'rejected') dlog('[CurrentConditions] Weather API failed:', weatherResult.reason);
  if (marineResult.status  === 'rejected') dlog('[CurrentConditions] Marine API failed:',  marineResult.reason);
  if (weatherResult.status === 'rejected' && marineResult.status === 'rejected') return null;

  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value?.current : null;
  const marine  = marineResult.status  === 'fulfilled' ? marineResult.value?.current  : null;

  // Water temp: GLERL satellite preferred, fall back to Open-Meteo SST (°C → °F)
  const glearlTemp = waterTempResult.status === 'fulfilled' ? waterTempResult.value : null;
  const sstC       = marine?.sea_surface_temperature ?? null;
  const sstF       = sstC != null ? Math.round(sstC * 9 / 5 + 32) : null;
  const waterTempF = glearlTemp ?? sstF;

  const windSpeed   = weather?.wind_speed_10m    ?? 0;
  const windDeg     = weather?.wind_direction_10m ?? 0;
  const gustSpeed   = weather?.wind_gusts_10m    ?? 0;
  const airTemp     = weather?.temperature_2m    ?? 0;
  const windDir     = normalizeWindDirection(String(windDeg));

  let waveHeight   = marine?.wave_height ?? 0;
  const wavePeriod = marine?.wave_period ?? 0;
  const waveDir    = marine?.wave_direction != null
    ? normalizeWindDirection(String(marine.wave_direction))
    : windDir;

  if (waveHeight === 0 && windSpeed >= 15) {
    const favorableNE = ['N', 'NNE', 'NE', 'ENE', 'E'].includes(windDir);
    waveHeight = Math.min((windSpeed - 10) * 0.15 * (favorableNE ? 1.5 : 1.0), 10);
  }

  const waveHeightMin = Math.max(0, Math.round((waveHeight - 0.3) * 10) / 10);
  const waveHeightMax = Math.round((waveHeight + 0.3) * 10) / 10;

  const surfLikelihood = calculateSurfLikelihood(
    { min: waveHeightMin, max: waveHeightMax },
    wavePeriod,
    windSpeed,
    windDir,
    spotId
  );

  const surfReport = generateUserSummary(
    { min: waveHeightMin, max: waveHeightMax, unit: 'ft' },
    wavePeriod,
    windSpeed,
    windDir,
    airTemp,
    surfLikelihood,
    []
  );

  const notes: string[] = [];
  if (gustSpeed > 25) notes.push('Gusts > 25 mph');
  if (windSpeed > 25) notes.push('High winds — challenging conditions');

  return {
    waveHeight: {
      min:        waveHeightMin,
      max:        waveHeightMax,
      unit:       'ft',
      sources:    ['open-meteo'],
      confidence: 0.8,
    },
    wind: {
      speed:      Math.round(windSpeed * 10) / 10,
      direction:  windDir,
      unit:       'mph',
      sources:    ['open-meteo'],
      confidence: 0.9,
    },
    swell: [{
      height:    Math.round(waveHeight * 10) / 10,
      period:    wavePeriod > 1 ? Math.round(wavePeriod) : undefined,
      direction: waveDir,
      sources:   ['open-meteo'],
    }],
    waterTemp: waterTempF != null
      ? { value: waterTempF, unit: 'F' as const, sources: [glearlTemp != null ? 'glerl-glsea' : 'open-meteo-sst'] }
      : undefined,
    rating:          calculateSurfRating(waveHeight, windSpeed, windDir, spotId),
    conditions:      surfReport,
    recommendations: generateSurfRecommendations(waveHeight, windSpeed, windDir, airTemp),
    surfLikelihood,
    surfReport,
    notes,
    timestamp: new Date().toISOString(),
  };
};
