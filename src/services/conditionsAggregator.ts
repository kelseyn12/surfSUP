/**
 * Conditions aggregation — blends buoy, wind, and water data into
 * a single AggregatedConditions object.
 *
 * Exports: fetchAllGreatLakesData
 */

import { BuoyData, WindData, WaterLevelData, AggregatedConditions } from '../types';
import {
  getWindDirectionFromDegrees,
  checkSwellDirections,
  checkLocalWindQuality,
  adjustRatingForLocalWinds,
  generateWindDirectionNotes,
  isFavorableWindDirection,
} from '../config/surfConfig';
import { dlog, getMostCommonDirection, calculateConfidence } from './greatLakesConstants';
import { fetchAllBuoyData } from './buoyApi';
import { fetchAllWindData } from './windApi';
import { fetchWaterLevelData } from './waterLevelApi';

// ─── Main Export ─────────────────────────────────────────────────────────────

export const fetchAllGreatLakesData = async (
  spotId: string,
  latitude: number,
  longitude: number
): Promise<AggregatedConditions | null> => {
  try {
    const [buoyResult, windResult, waterResult] = await Promise.allSettled([
      fetchAllBuoyData(latitude, longitude),
      fetchAllWindData(latitude, longitude),
      fetchWaterLevelData(latitude, longitude),
    ]);

    const buoyData  = buoyResult.status  === 'fulfilled' ? buoyResult.value  : [];
    const windData  = windResult.status  === 'fulfilled' ? windResult.value  : null;
    const waterData = waterResult.status === 'fulfilled' ? waterResult.value : { waterLevel: null, waterTemp: null };

    if (buoyResult.status  === 'rejected') console.error('🌊 Buoy data error:',  buoyResult.reason);
    if (windResult.status  === 'rejected') {
      const err = windResult.reason;
      if (!err?.toString().includes('429')) console.error('🌊 Wind data error:', err);
    }
    if (waterResult.status === 'rejected') console.error('🌊 Water data error:', waterResult.reason);

    return aggregateAllData(buoyData, windData, waterData, spotId, latitude, longitude);
  } catch (error) {
    console.error('🌊 Error fetching all Great Lakes data:', error);
    return null;
  }
};

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface WaveDataPoint {
  value: number;
  source: string;
  confidence: number;
  timestamp?: string;
  distance?: number;
}

interface BlendedWaveData {
  avgWaveHeight: number | undefined;
  avgWavePeriod: number | undefined;
  waveDirections: string[];
  waveConfidence: number;
  sources: string[];
  debugInfo: { method: string; reasoning: string; conflicts?: string[] };
}

interface WindDataPoint {
  speed: number;
  direction: string;
  source: string;
  confidence: number;
  timestamp?: string;
  distance?: number;
}

interface BlendedWindData {
  avgWindSpeed: number;
  windDirection: string;
  windConfidence: number;
  gustSpeed?: number;
  sources: string[];
  debugInfo: { method: string; reasoning: string; conflicts?: string[] };
}

// ─── Validation ──────────────────────────────────────────────────────────────

const validateSpotId = (spotId: string): boolean =>
  typeof spotId === 'string' && spotId.trim().length > 0;

const validateData = (buoyData: BuoyData[], windData: WindData | null): boolean =>
  buoyData.length > 0 || windData !== null;

// ─── Wave Aggregation ────────────────────────────────────────────────────────

const aggregateWaveData = (
  buoyData: BuoyData[],
  _windData: WindData | null
): BlendedWaveData => {
  const waveHeightPoints: WaveDataPoint[] = [];
  const wavePeriodPoints: WaveDataPoint[] = [];

  dlog('🌊 Wave data sources:');
  buoyData.forEach((buoy, i) => {
    if (buoy.waveHeight > 0) dlog(`${i + 1}. ${buoy.source}: ${buoy.waveHeight}ft (${buoy.distance || 0} mi)`);
  });

  buoyData.forEach(buoy => {
    if (buoy.waveHeight > 0) {
      const distance = buoy.distance || 999;
      const confidence = distance < 1 ? 0.95 : distance < 50 ? 0.9 : 0.85;
      waveHeightPoints.push({ value: buoy.waveHeight, source: `ndbc-${buoy.source}`, confidence, timestamp: buoy.timestamp, distance });
    }
    if (buoy.wavePeriod > 0) {
      const distance = buoy.distance || 999;
      const confidence = distance < 1 ? 0.95 : distance < 50 ? 0.9 : 0.85;
      wavePeriodPoints.push({ value: buoy.wavePeriod, source: `ndbc-${buoy.source}`, confidence, distance });
    }
  });

  const blendPoints = (points: WaveDataPoint[]): BlendedWaveData => {
    if (points.length === 0) {
      return { avgWaveHeight: undefined, avgWavePeriod: undefined, waveDirections: [], waveConfidence: 0, sources: [], debugInfo: { method: 'no-data', reasoning: 'No wave height data' } };
    }
    if (points.length === 1) {
      return { avgWaveHeight: points[0].value, avgWavePeriod: undefined, waveDirections: [], waveConfidence: points[0].confidence, sources: [points[0].source], debugInfo: { method: 'single-source', reasoning: `Using ${points[0].source}` } };
    }

    const values = points.map(p => p.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const conflicts: string[] = [];
    const maxDiff = Math.max(...values) - Math.min(...values);
    if (maxDiff > 2.0) conflicts.push(`High variance: ${maxDiff.toFixed(1)}ft range`);

    const totalWeight = points.reduce((s, p) => s + p.confidence, 0);
    const weightedValue = points.reduce((s, p) => s + p.value * p.confidence, 0) / totalWeight;
    const avgConf = points.reduce((s, p) => s + p.confidence, 0) / points.length;
    const finalConf = Math.max(avgConf - Math.min(stdDev * 0.1, 0.3), 0.1);
    const method = conflicts.length > 0 ? 'weighted-average-with-conflicts' : 'weighted-average';

    return {
      avgWaveHeight: weightedValue,
      avgWavePeriod: undefined,
      waveDirections: [],
      waveConfidence: finalConf,
      sources: points.map(p => p.source),
      debugInfo: { method, reasoning: `Blended ${points.length} sources`, conflicts },
    };
  };

  const blended = blendPoints(waveHeightPoints);
  const avgWavePeriod = wavePeriodPoints.length > 0
    ? wavePeriodPoints.reduce((s, p) => s + p.value, 0) / wavePeriodPoints.length
    : 0;

  return {
    avgWaveHeight: blended.avgWaveHeight,
    avgWavePeriod,
    waveDirections: buoyData.map(b => b.waveDirection),
    waveConfidence: blended.waveConfidence,
    sources: blended.sources,
    debugInfo: blended.debugInfo,
  };
};

// ─── Wind Aggregation ────────────────────────────────────────────────────────

const aggregateWindData = (
  buoyData: BuoyData[],
  windData: WindData | null
): BlendedWindData => {
  const points: WindDataPoint[] = [];

  dlog('🌬️ Wind data sources:');
  buoyData.forEach((buoy, i) => {
    if (buoy.windSpeed > 0) dlog(`${i + 1}. ${buoy.source}: ${buoy.windSpeed}mph ${buoy.windDirection} (${buoy.distance || 0} mi)`);
  });

  buoyData.forEach(buoy => {
    if (buoy.windSpeed > 0) {
      const direction = typeof buoy.windDirection === 'number'
        ? getWindDirectionFromDegrees(buoy.windDirection)
        : buoy.windDirection;
      const distance = buoy.distance || 999;
      const confidence = distance < 1 ? 0.95 : distance < 50 ? 0.9 : 0.85;
      points.push({ speed: buoy.windSpeed, direction, source: `ndbc-${buoy.source}`, confidence, timestamp: buoy.timestamp, distance });
    }
  });

  if (windData?.windSpeed > 0 && windData.source?.startsWith('noaa')) {
    const direction = typeof windData.windDirection === 'number'
      ? getWindDirectionFromDegrees(windData.windDirection)
      : windData.windDirection;
    points.push({ speed: windData.windSpeed, direction: direction || 'N', source: windData.source, confidence: 0.75, timestamp: new Date().toISOString() });
  }

  if (points.length === 0) {
    return { avgWindSpeed: 0, windDirection: 'N', windConfidence: 0.1, sources: [], debugInfo: { method: 'no-data', reasoning: 'No wind data' } };
  }
  if (points.length === 1) {
    return { avgWindSpeed: points[0].speed, windDirection: points[0].direction, windConfidence: points[0].confidence, gustSpeed: windData?.gustSpeed, sources: [points[0].source], debugInfo: { method: 'single-source', reasoning: `Using ${points[0].source}` } };
  }

  const speeds = points.map(p => p.speed);
  const mean = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  const variance = speeds.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / speeds.length;
  const stdDev = Math.sqrt(variance);
  const conflicts: string[] = [];
  const maxDiff = Math.max(...speeds) - Math.min(...speeds);
  if (maxDiff > 15) conflicts.push(`High variance: ${maxDiff.toFixed(1)}mph range`);

  const totalWeight = points.reduce((s, p) => s + p.confidence, 0);
  const weightedSpeed = points.reduce((s, p) => s + p.speed * p.confidence, 0) / totalWeight;
  const windDirection = getMostCommonDirection(points.map(p => p.direction));
  const avgConf = points.reduce((s, p) => s + p.confidence, 0) / points.length;
  const finalConf = Math.max(avgConf - Math.min(stdDev * 0.05, 0.2), 0.1);
  const method = conflicts.length > 0 ? 'weighted-average-with-conflicts' : 'weighted-average';

  return {
    avgWindSpeed: weightedSpeed,
    windDirection,
    windConfidence: finalConf,
    gustSpeed: windData?.gustSpeed,
    sources: points.map(p => p.source),
    debugInfo: { method, reasoning: `Blended ${points.length} sources`, conflicts },
  };
};

// ─── Water Aggregation ───────────────────────────────────────────────────────

const aggregateWaterData = (
  buoyData: BuoyData[],
  waterData: { waterLevel: WaterLevelData | null; waterTemp: number | null },
  _latitude?: number,
  _longitude?: number
) => {
  const waveBuoys = buoyData.filter(b => b.waterTemp > 0 && b.source.includes('ndbc'));
  const windBuoys = buoyData.filter(b => b.source.includes('weather'));

  let finalWaterTempF: number | undefined;
  let waterTempSources: string[] = [];

  // Priority 1: nearest wave buoy
  if (waveBuoys.length > 0) {
    const sorted = [...waveBuoys].sort((a, b) => (a.distance || 999) - (b.distance || 999));
    const tempF = (sorted[0].waterTemp * 9 / 5) + 32;
    if (tempF >= 30 && tempF <= 85) { finalWaterTempF = tempF; waterTempSources = [sorted[0].source]; }
  }

  // Priority 2: NOAA station
  if (finalWaterTempF === undefined && waterData.waterTemp !== null) {
    const t = waterData.waterTemp;
    if (t >= 30 && t <= 85) { finalWaterTempF = t; waterTempSources = ['noaa-water-temp']; }
  }

  // Priority 3: wind buoy air temp (last resort)
  if (finalWaterTempF === undefined && windBuoys.length > 0) {
    const temps = windBuoys.filter(b => b.waterTemp > 0).map(b => (b.waterTemp * 9 / 5) + 32);
    if (temps.length > 0) {
      const avg = temps.reduce((s, t) => s + t, 0) / temps.length;
      if (avg >= 30 && avg <= 85) {
        finalWaterTempF = avg;
        waterTempSources = windBuoys.filter(b => b.waterTemp > 0).map(b => b.source);
      }
    }
  }

  return { waterTempF: finalWaterTempF, sources: waterTempSources };
};

// ─── Surf Report ─────────────────────────────────────────────────────────────

const generateSurfReport = (
  waveData: { avgWaveHeight: number | undefined; avgWavePeriod: number | undefined },
  windData: { avgWindSpeed: number; windDirection: string; gustSpeed?: number },
  waterData: { waterTempF: number | undefined },
  spotId: string,
  buoyData: BuoyData[] = []
) => {
  const { avgWaveHeight, avgWavePeriod } = waveData;
  const { avgWindSpeed, windDirection, gustSpeed } = windData;
  const { waterTempF } = waterData;

  const waveHeightRange = {
    min: Math.max(0, (avgWaveHeight || 0) - 0.3),
    max: (avgWaveHeight || 0) + 0.3,
  };
  const surfLikelihood = calculateSurfLikelihood(
    waveHeightRange, avgWavePeriod || 0, avgWindSpeed, windDirection, spotId
  );

  const notes: string[] = [];

  if (detectPressureDrop(buoyData)) notes.push('Seiche risk — rapid pressure drop');
  notes.push(...generateWindNotes(avgWindSpeed, gustSpeed));
  if (windDirection) notes.push(...generateWindDirectionNotes(spotId, windDirection, avgWindSpeed));

  const surfReport = generateUserSummary(
    { min: waveHeightRange.min, max: waveHeightRange.max, unit: 'ft' },
    avgWavePeriod || 0,
    avgWindSpeed,
    windDirection,
    waterTempF || 0,
    surfLikelihood,
    notes
  );

  return { surfLikelihood, surfReport, notes };
};

// ─── Master Aggregation ──────────────────────────────────────────────────────

const aggregateAllData = (
  buoyData: BuoyData[],
  windData: WindData | null,
  waterData: { waterLevel: WaterLevelData | null; waterTemp: number | null },
  spotId: string = 'duluth',
  latitude?: number,
  longitude?: number
): AggregatedConditions => {
  if (!validateSpotId(spotId)) console.warn(`🌊 Unknown spot ID: ${spotId}`);
  if (!validateData(buoyData, windData)) console.warn('🌊 No valid data sources');

  const waveAgg  = aggregateWaveData(buoyData, windData);
  const windAgg  = aggregateWindData(buoyData, windData);
  const waterAgg = aggregateWaterData(buoyData, waterData, latitude, longitude);

  const report   = generateSurfReport(waveAgg, windAgg, { waterTempF: waterAgg.waterTempF }, spotId, buoyData);
  const conditions     = generateConditionsDescription(waveAgg.avgWaveHeight || 0, windAgg.avgWindSpeed, windAgg.windDirection, waterAgg.waterTempF || 0);
  const recommendations = generateSurfRecommendations(waveAgg.avgWaveHeight || 0, windAgg.avgWindSpeed, windAgg.windDirection, waterAgg.waterTempF || 0);

  const baseHeight = waveAgg.avgWaveHeight || 0;
  const range = waveAgg.waveConfidence > 0.8 ? 0.4 : 0.6;

  return {
    waveHeight: {
      min: Math.max(0, Math.round((baseHeight - range) * 10) / 10),
      max: Math.round((baseHeight + range) * 10) / 10,
      unit: 'ft',
      sources: waveAgg.sources,
      confidence: waveAgg.waveConfidence,
    },
    wind: {
      speed: Math.round(windAgg.avgWindSpeed),
      direction: windAgg.windDirection,
      unit: 'mph',
      sources: windAgg.sources,
      confidence: windAgg.windConfidence,
    },
    swell: [{
      height: waveAgg.avgWaveHeight || 0,
      period: waveAgg.avgWavePeriod,
      direction: windAgg.windDirection,
      sources: waveAgg.sources,
    }],
    waterTemp: waterAgg.waterTempF !== undefined
      ? { value: waterAgg.waterTempF, unit: 'F', sources: waterAgg.sources }
      : undefined,
    rating: calculateSurfRating(waveAgg.avgWaveHeight || 0, windAgg.avgWindSpeed, windAgg.windDirection, spotId),
    conditions,
    recommendations,
    surfLikelihood: report.surfLikelihood,
    surfReport: report.surfReport,
    notes: report.notes,
  };
};

// ─── Surf Likelihood ─────────────────────────────────────────────────────────

export const calculateSurfLikelihood = (
  waveHeight: number | { min: number; max: number },
  wavePeriod: number,
  windSpeed: number,
  windDirection?: string,
  spotId: string = 'duluth'
): 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out' => {
  const minH = typeof waveHeight === 'number' ? waveHeight : Math.min(waveHeight.min, waveHeight.max);
  const avgH = typeof waveHeight === 'number' ? waveHeight : (waveHeight.min + waveHeight.max) / 2;

  if (minH < 0.8 || wavePeriod < 3) return 'Flat';

  const swellCheck = checkSwellDirections(spotId, windDirection || 'N');
  const windCheck  = checkLocalWindQuality(spotId, windDirection || 'N', windSpeed);

  if (windSpeed > 25 && !swellCheck) return 'Blown Out';

  let baseRating = 0;
  if (avgH >= 4) baseRating = 4;
  else if (avgH >= 2) baseRating = 3;
  else if (avgH >= 1) baseRating = 2;
  else baseRating = 1;

  const adjustedRating = adjustRatingForLocalWinds(baseRating, spotId, windDirection || 'N', windSpeed);

  if (adjustedRating >= 4) return 'Firing';
  if (adjustedRating >= 3) return 'Good';
  if (adjustedRating >= 2) return 'Maybe Surf';
  return 'Flat';
};

// ─── Supporting Helpers ──────────────────────────────────────────────────────

const detectPressureDrop = (buoyData: BuoyData[]): boolean => {
  if (buoyData.length < 2) return false;
  const weatherStations = buoyData.filter(b =>
    b.source.includes('weather') || b.source.includes('KGNA') || b.source.includes('DULM5')
  );
  return weatherStations.length >= 2 ? false : false; // No pressure parsing yet
};

export const generateWindNotes = (windSpeed: number, gustSpeed?: number): string[] => {
  const notes: string[] = [];
  if (windSpeed > 15) notes.push('Strong wind — may cause chop');
  if (gustSpeed && gustSpeed > 25) notes.push('Gusts > 25 mph');
  return notes;
};

export const generateUserSummary = (
  waveHeight: { min: number; max: number; unit: string },
  wavePeriod: number,
  _windSpeed: number,
  windDirection: string,
  _waterTemp: number,
  surfLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out',
  _notes: string[]
): string => {
  switch (surfLikelihood) {
    case 'Flat':
      return waveHeight.max < 0.5
        ? 'Lake Superior is calm today. No surfable waves expected.'
        : `Small waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds. Conditions may improve later.`;
    case 'Maybe Surf':
      return wavePeriod > 0
        ? `Small surfable waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) @ ${wavePeriod}s. ${windDirection} winds.`
        : `Small surfable waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds.`;
    case 'Good':
      return wavePeriod > 0
        ? `Good waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) @ ${wavePeriod}s. ${windDirection} winds.`
        : `Good waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds.`;
    case 'Firing':
      if (wavePeriod > 0) {
        return waveHeight.max >= 4.0
          ? `Epic gale conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves @ ${wavePeriod}s. ${windDirection} winds.`
          : `Epic conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves @ ${wavePeriod}s. ${windDirection} winds.`;
      }
      return waveHeight.max >= 4.0
        ? `Epic gale conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves with ${windDirection} winds.`
        : `Epic conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves with ${windDirection} winds.`;
    case 'Blown Out':
      return `Strong ${windDirection} winds (${_windSpeed}mph) — conditions are blown out. Check back when wind drops.`;
    default:
      return 'Check conditions before heading out.';
  }
};

export const generateConditionsDescription = (
  waveHeight: number,
  windSpeed: number,
  windDirection: string,
  waterTemp: number
): string => {
  if (waveHeight < 0.5) return 'Flat conditions - no waves today. Lake Superior is calm.';

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
    recs.push('Lake Superior is flat today - no surfable waves');
    recs.push('Check back later when wind picks up');
  } else if (waveHeight < 1) {
    recs.push('Small waves - good for beginners');
    recs.push('Bring a longboard for easier catching');
  } else if (waveHeight < 2) {
    recs.push('Moderate waves - good for all skill levels');
    recs.push('Check wind direction for best spots');
  } else if (waveHeight < 3) {
    recs.push('Good waves - experienced surfers will enjoy');
    recs.push('Watch for changing conditions');
  } else {
    recs.push('Big waves - experienced surfers only');
    recs.push('Check safety conditions before paddling out');
  }

  if (windSpeed > 20) recs.push('Strong winds - consider wind direction for spot selection');
  if (waterTemp > 0 && waterTemp < 45) recs.push('Cold water — wear proper wetsuit');

  return recs;
};

export const calculateSurfRating = (
  waveHeight: number,
  windSpeed: number,
  windDirection: string,
  spotId: string = 'duluth'
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
