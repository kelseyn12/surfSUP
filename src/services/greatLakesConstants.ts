/**
 * Shared constants and utility functions for Great Lakes API modules.
 */

// Dev-only logger — stripped in production builds
export const dlog = (...args: any[]) => { if (__DEV__) console.log(...args); };

// ─── Shared Utilities ────────────────────────────────────────────────────────

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

const degreesToCompass = (deg: number): string =>
  COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];

/** Normalise a wind direction (degrees or text) to standard abbreviation ("NE"). */
export const normalizeWindDirection = (direction: string): string => {
  const num = parseFloat(direction);
  if (!isNaN(num)) return degreesToCompass(num);

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
