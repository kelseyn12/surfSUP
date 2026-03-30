/**
 * Surf conditions utilities.
 *
 * Pure calculation functions — no data fetching.
 * Used by openMeteoCurrentService and forecastApi.
 */

import {
  checkSwellDirections,
  checkLocalWindQuality,
  adjustRatingForLocalWinds,
  isFavorableWindDirection,
  convertWindDirectionToDegrees,
} from '../config/surfConfig';

// ─── Surf Likelihood ──────────────────────────────────────────────────────────

export const calculateSurfLikelihood = (
  waveHeight: number | { min: number; max: number },
  wavePeriod: number,
  windSpeed: number,
  windDirection?: string,
  spotId = 'duluth'
): 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out' => {
  const minH = typeof waveHeight === 'number' ? waveHeight : Math.min(waveHeight.min, waveHeight.max);
  const avgH = typeof waveHeight === 'number' ? waveHeight : (waveHeight.min + waveHeight.max) / 2;

  if (minH < 0.8 || wavePeriod < 3) return 'Flat';

  const windDeg    = windDirection ? convertWindDirectionToDegrees(windDirection) : 0;
  const windQuality = windDirection
    ? checkLocalWindQuality(spotId, windDeg, windSpeed)
    : 'clean';

  if (windQuality === 'strong') return 'Blown Out';

  let baseRating: 'Maybe Surf' | 'Good' | 'Firing';
  if (avgH >= 4)      baseRating = 'Firing';
  else if (avgH >= 2) baseRating = 'Good';
  else                baseRating = 'Maybe Surf';

  return adjustRatingForLocalWinds(baseRating, windQuality, windSpeed);
};

// ─── Rating ───────────────────────────────────────────────────────────────────

export const calculateSurfRating = (
  waveHeight: number,
  windSpeed: number,
  windDirection: string,
  spotId = 'duluth'
): number => {
  let rating = waveHeight > 3 ? 8
    : waveHeight > 2 ? 6
    : waveHeight > 1 ? 4
    : waveHeight > 0.5 ? 2
    : 1;

  if (windDirection && !isFavorableWindDirection(spotId, windDirection, windSpeed)) {
    rating = Math.max(1, rating - 3);
  }
  if (windSpeed > 20) rating = Math.max(1, rating - 2);
  else if (windSpeed > 15) rating = Math.max(1, rating - 1);

  return rating;
};

// ─── Summaries ────────────────────────────────────────────────────────────────

export const generateUserSummary = (
  waveHeight: { min: number; max: number; unit: string },
  wavePeriod: number,
  windSpeed: number,
  windDirection: string,
  _waterTemp: number,
  surfLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out',
  _notes: string[]
): string => {
  switch (surfLikelihood) {
    case 'Flat':
      return waveHeight.max < 0.5
        ? 'Lake Superior is calm. No surfable waves expected.'
        : `Small waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds. Conditions may improve later.`;
    case 'Maybe Surf':
      return wavePeriod > 0
        ? `Small surfable waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) @ ${Math.round(wavePeriod)}s. ${windDirection} winds.`
        : `Small surfable waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds.`;
    case 'Good':
      return wavePeriod > 0
        ? `Good waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) @ ${Math.round(wavePeriod)}s. ${windDirection} winds.`
        : `Good waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds.`;
    case 'Firing':
      if (wavePeriod > 0) {
        return waveHeight.max >= 4.0
          ? `Epic gale conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves @ ${Math.round(wavePeriod)}s. ${windDirection} winds.`
          : `Epic conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves @ ${Math.round(wavePeriod)}s. ${windDirection} winds.`;
      }
      return waveHeight.max >= 4.0
        ? `Epic gale conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves with ${windDirection} winds.`
        : `Epic conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves with ${windDirection} winds.`;
    case 'Blown Out':
      return `Strong ${windDirection} winds (${windSpeed}mph) — conditions are blown out. Check back when wind drops.`;
    default:
      return 'Check conditions before heading out.';
  }
};

export const generateWindNotes = (windSpeed: number, gustSpeed?: number): string[] => {
  const notes: string[] = [];
  if (windSpeed > 15) notes.push('Strong wind — may cause chop');
  if (gustSpeed && gustSpeed > 25) notes.push('Gusts > 25 mph');
  return notes;
};

export const generateConditionsDescription = (
  waveHeight: number,
  windSpeed: number,
  windDirection: string,
  waterTemp: number
): string => {
  if (waveHeight < 0.5) return 'Flat conditions — no waves today. Lake Superior is calm.';

  let desc = waveHeight < 1 ? 'Small waves '
    : waveHeight < 2 ? 'Moderate waves '
    : waveHeight < 3 ? 'Good waves '
    : waveHeight < 5 ? 'Big waves '
    : 'Very big waves ';

  desc += `(${waveHeight.toFixed(1)}ft)`;
  desc += windSpeed < 5  ? ' with light winds'
    : windSpeed < 10 ? ' with light breeze'
    : windSpeed < 15 ? ' with moderate winds'
    : windSpeed < 20 ? ' with strong winds'
    : ' with very strong winds';
  desc += ` from the ${windDirection}`;
  if (waterTemp > 0) desc += `. Water ${Math.round(waterTemp)}°F`;

  return desc;
};

export const generateSurfRecommendations = (
  waveHeight: number,
  windSpeed: number,
  _windDirection: string,
  waterTemp: number
): string[] => {
  const recs: string[] = [];

  if (waveHeight < 0.5) {
    recs.push('Lake Superior is flat today — no surfable waves');
    recs.push('Check back later when wind picks up');
  } else if (waveHeight < 1) {
    recs.push('Small waves — good for beginners');
    recs.push('Bring a longboard for easier catching');
  } else if (waveHeight < 2) {
    recs.push('Moderate waves — good for all skill levels');
    recs.push('Check wind direction for best spots');
  } else if (waveHeight < 3) {
    recs.push('Good waves — experienced surfers will enjoy');
    recs.push('Watch for changing conditions');
  } else {
    recs.push('Big waves — experienced surfers only');
    recs.push('Check safety conditions before paddling out');
  }

  if (windSpeed > 20) recs.push('Strong winds — consider wind direction for spot selection');
  if (waterTemp > 0 && waterTemp < 45) recs.push('Cold water — wear proper wetsuit');

  return recs;
};
