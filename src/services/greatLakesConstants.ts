/**
 * Shared constants and utility functions for Great Lakes API modules.
 */

// Dev-only logger — stripped in production builds
export const dlog = (...args: any[]) => { if (__DEV__) console.log(...args); };

// Base URLs
export const NOAA_WATER_LEVEL_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
export const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';

// Lake Superior buoy stations (NDBC)
export const LAKE_SUPERIOR_BUOYS = {
  // Wave Buoys (report wave height, period, direction)
  '45001': {
    name: 'MID SUPERIOR Wave Buoy',
    lat: 48.061,
    lon: -87.793,
    description: 'Central Lake Superior - waves coming to North Shore in 8-12 hours',
    direction: 'N/NE',
    travelTime: 10,
    forecastHours: [8, 12, 16],
    type: 'wave'
  },
  '45027': {
    name: 'McQuade Harbor Wave Buoy',
    lat: 46.860,
    lon: -91.930,
    description: 'Current local wave conditions near Duluth (McQuade Harbor)',
    direction: 'local',
    travelTime: 0,
    forecastHours: [0],
    type: 'wave'
  },
  '45028': {
    name: 'Western Lake Superior Wave Buoy',
    lat: 46.814,
    lon: -91.829,
    description: 'Western Lake Superior wave conditions',
    direction: 'W',
    travelTime: 2,
    forecastHours: [2, 4, 6],
    type: 'wave'
  },

  // Weather Stations (report wind, pressure, temp — no waves)
  'KGNA': {
    name: 'Bay of Grand Marais Weather Station',
    lat: 47.750,
    lon: -90.334,
    description: 'Weather conditions for forecasting',
    direction: 'N',
    travelTime: 10,
    forecastHours: [10, 14, 18],
    type: 'weather'
  },
  'DULM5': {
    name: 'Duluth Weather Station',
    lat: 46.775,
    lon: -92.093,
    description: 'Local weather conditions at Duluth',
    direction: 'local',
    travelTime: 0,
    forecastHours: [0],
    type: 'weather'
  },
  'ROAM4': {
    name: 'Rock of Ages Wind Buoy',
    lat: 47.867,
    lon: -89.315,
    description: 'Wind conditions for forecasting waves to Duluth',
    direction: 'N/NE',
    travelTime: 12,
    forecastHours: [12, 18, 24],
    type: 'weather'
  },
};

// NOAA water level stations for Lake Superior
export const WATER_LEVEL_STATIONS = {
  'DULUTH':          { id: '9099064', name: 'Duluth',          lat: 46.775, lon: -92.093 },
  'TWO_HARBORS':     { id: '9099064', name: 'Two Harbors',     lat: 47.020, lon: -91.670 },
  'SILVER_BAY':      { id: '9099064', name: 'Silver Bay',      lat: 47.320, lon: -91.270 },
  'GRAND_MARAIS':    { id: '9099090', name: 'Grand Marais',    lat: 47.748, lon: -90.341 },
  'MARQUETTE':       { id: '9099090', name: 'Marquette',       lat: 46.545, lon: -87.378 },
  'MUNISING':        { id: '9099090', name: 'Munising',        lat: 46.411, lon: -86.647 },
  'PICTURED_ROCKS':  { id: '9099090', name: 'Pictured Rocks',  lat: 46.670, lon: -86.170 },
  'THUNDER_BAY':     { id: '9099090', name: 'Thunder Bay',     lat: 48.380, lon: -89.247 },
};

// ─── Shared Utilities ────────────────────────────────────────────────────────

/** Haversine distance in miles. */
export const calculateDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Normalise a text wind direction (e.g. "northeast") to standard abbreviation ("NE"). */
export const normalizeWindDirection = (direction: string): string => {
  const map: Record<string, string> = {
    'north': 'N', 'south': 'S', 'east': 'E', 'west': 'W',
    'northeast': 'NE', 'northwest': 'NW', 'southeast': 'SE', 'southwest': 'SW',
    'nne': 'NNE', 'nnw': 'NNW', 'ene': 'ENE', 'ese': 'ESE',
    'sse': 'SSE', 'ssw': 'SSW', 'wsw': 'WSW', 'wnw': 'WNW',
  };
  return map[direction.toLowerCase()] ?? direction.toUpperCase();
};

/** Returns the most frequently occurring direction string in the array. */
export const getMostCommonDirection = (directions: string[]): string => {
  if (directions.length === 0) return 'N';
  const counts: Record<string, number> = {};
  directions.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
  return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
};

/** 0–1 confidence score based on how tightly a set of values cluster. */
export const calculateConfidence = (values: number[]): number => {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0.5;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.max(0.1, Math.min(1, 1 - Math.sqrt(variance) / mean));
};
