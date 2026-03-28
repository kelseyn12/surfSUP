/**
 * Great Lakes forecast data fetching.
 * Fetches NOAA marine forecast products and blends them with live buoy context.
 *
 * Exports: fetchAllGreatLakesForecastData
 */

import { AggregatedConditions, BuoyData, WindData } from '../types';
import { generateWindDirectionNotes } from '../config/surfConfig';
import { dlog, getMostCommonDirection, calculateConfidence } from './greatLakesConstants';
import { fetchAllBuoyData } from './buoyApi';
import {
  calculateSurfLikelihood,
  calculateSurfRating,
  generateUserSummary,
} from './conditionsAggregator';

// ─── Main Export ─────────────────────────────────────────────────────────────

export const fetchAllGreatLakesForecastData = async (
  spotId: string,
  latitude: number,
  longitude: number,
  hours: number = 168
): Promise<AggregatedConditions[] | null> => {
  try {
    dlog(`🌊 Fetching forecast for ${spotId} (${hours}h)`);

    const [noaaResult, buoyResult] = await Promise.allSettled([
      fetchNOAAForecastData(latitude, longitude, hours),
      fetchAllBuoyData(latitude, longitude),
    ]);

    const noaaData = noaaResult.status === 'fulfilled' ? noaaResult.value : [];
    const buoyData = buoyResult.status === 'fulfilled' ? buoyResult.value : [];

    if (noaaResult.status === 'rejected') console.error('🌊 NOAA forecast error:', noaaResult.reason);
    if (buoyResult.status === 'rejected') console.error('🌊 Buoy data error:', buoyResult.reason);

    const allForecastData = [...(noaaData || [])];
    if (allForecastData.length === 0) { dlog('❌ No forecast data'); return null; }

    const timeGroups = groupForecastDataByTime(allForecastData);
    const aggregatedForecast: AggregatedConditions[] = [];

    for (const [, dataGroup] of timeGroups) {
      const aggregated = aggregateForecastDataWithBuoyContext(dataGroup, spotId, latitude, longitude, buoyData);
      if (aggregated) aggregatedForecast.push(aggregated);
    }

    aggregatedForecast.sort((a, b) =>
      new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime()
    );

    dlog(`🌊 Generated ${aggregatedForecast.length} forecast points`);
    return aggregatedForecast;
  } catch (error) {
    console.error('🌊 Error fetching all Great Lakes forecast data:', error);
    return null;
  }
};

// ─── Grouping ─────────────────────────────────────────────────────────────────

const groupForecastDataByTime = (forecastData: WindData[]): Map<string, WindData[]> => {
  const groups = new Map<string, WindData[]>();
  for (const data of forecastData) {
    if (!data.timestamp) continue;
    if (!groups.has(data.timestamp)) groups.set(data.timestamp, []);
    groups.get(data.timestamp)!.push(data);
  }
  return groups;
};

// ─── Aggregation ──────────────────────────────────────────────────────────────

const aggregateForecastDataWithBuoyContext = (
  dataGroup: WindData[],
  spotId: string,
  _latitude: number,
  _longitude: number,
  buoyData: BuoyData[]
): AggregatedConditions | null => {
  try {
    const windData  = dataGroup.filter(d => d.windSpeed  !== undefined);
    const waveData  = dataGroup.filter(d => d.waveHeight !== undefined);
    const tempData  = dataGroup.filter(d => d.temperature !== undefined);

    // Wind
    let avgWindSpeed = 0, windDirection = 'N', windConfidence = 0;
    let windSources: string[] = [];
    if (windData.length > 0) {
      avgWindSpeed   = windData.reduce((s, d) => s + (d.windSpeed || 0), 0) / windData.length;
      windDirection  = getMostCommonDirection(windData.map(d => d.windDirection));
      windConfidence = calculateConfidence(windData.map(d => d.windSpeed || 0));
      windSources    = [...new Set(windData.map(d => d.source))];
    } else {
      windSources = [...new Set(dataGroup.map(d => d.source))];
    }

    // Waves
    let avgWaveHeight = 0, avgWavePeriod: number | undefined = 0, waveConfidence = 0;
    let waveSources: string[] = [];
    if (waveData.length > 0) {
      avgWaveHeight = waveData.reduce((s, d) => s + (d.waveHeight || 0), 0) / waveData.length;
      avgWavePeriod = waveData.reduce((s, d) => s + (d.wavePeriod || 0), 0) / waveData.length;
      waveConfidence = calculateConfidence(waveData.map(d => d.waveHeight || 0));
      waveSources    = [...new Set(waveData.map(d => d.source))];
    } else {
      waveSources = [...new Set(dataGroup.map(d => d.source))];
    }
    if ((avgWavePeriod || 0) < 2) avgWavePeriod = undefined;

    // Temperature
    let avgTemperature = 0;
    let tempSources: string[] = [];
    if (tempData.length > 0) {
      avgTemperature = tempData.reduce((s, d) => s + (d.temperature || 0), 0) / tempData.length;
      tempSources    = [...new Set(tempData.map(d => d.source))];
    } else {
      tempSources = [...new Set(dataGroup.map(d => d.source))];
    }

    const waveHeightRange = { min: Math.max(0, avgWaveHeight - 0.3), max: avgWaveHeight + 0.3 };
    const surfLikelihood = calculateSurfLikelihood(waveHeightRange, avgWavePeriod || 0, avgWindSpeed, windDirection, spotId);

    const waveHeightMin = Math.max(0, Math.round((avgWaveHeight - 0.3) * 10) / 10);
    const waveHeightMax = Math.round((avgWaveHeight + 0.3) * 10) / 10;

    const surfReport = generateUserSummary(
      { min: waveHeightMin, max: waveHeightMax, unit: 'ft' },
      avgWavePeriod || 0,
      avgWindSpeed,
      windDirection,
      avgTemperature,
      surfLikelihood,
      []
    );

    const notes: string[] = [];
    if (avgWindSpeed > 25) notes.push('High winds — challenging conditions');
    else if (avgWindSpeed > 15) notes.push('Strong wind — may cause chop');
    if (avgWaveHeight < 0.5) notes.push('Very small waves — minimal surf');
    else if (avgWaveHeight > 3) notes.push('Large waves — experienced surfers only');
    if (avgWavePeriod && avgWavePeriod < 4) notes.push('Short period — choppy conditions');
    else if (avgWavePeriod && avgWavePeriod > 8) notes.push('Long period — clean waves');
    if (windDirection) notes.push(...generateWindDirectionNotes(spotId, windDirection, avgWindSpeed));

    if (buoyData.length > 0) {
      const current = buoyData
        .filter(b => b.waveHeight > 0 || b.windSpeed > 0)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        .slice(0, 2);
      if (current.length > 0) {
        const avgBuoyWave = current.reduce((s, b) => s + (b.waveHeight || 0), 0) / current.length;
        const avgBuoyWind = current.reduce((s, b) => s + (b.windSpeed  || 0), 0) / current.length;
        notes.push(`Buoy context: ${avgBuoyWave.toFixed(1)}ft waves, ${avgBuoyWind.toFixed(1)}mph wind`);
      }
    }

    // Round values
    avgWindSpeed  = Math.round(avgWindSpeed  * 10) / 10;
    avgWaveHeight = Math.round(avgWaveHeight * 10) / 10;
    if (avgWavePeriod !== undefined) avgWavePeriod = Math.round(avgWavePeriod * 10) / 10;
    avgTemperature = Math.round(avgTemperature * 10) / 10;

    const periodNames = dataGroup.map(d => d.periodName).filter(Boolean) as string[];
    const mostCommonPeriodName = periodNames.length > 0
      ? periodNames.reduce((a, b) => periodNames.filter(v => v === a).length >= periodNames.filter(v => v === b).length ? a : b)
      : undefined;

    return {
      waveHeight:  { min: waveHeightMin, max: waveHeightMax, unit: 'ft', sources: waveSources, confidence: waveConfidence },
      wind:        { speed: avgWindSpeed, direction: windDirection, unit: 'mph', sources: windSources, confidence: windConfidence },
      swell:       [{ height: avgWaveHeight, period: avgWavePeriod, direction: windDirection, sources: waveSources }],
      waterTemp:   avgTemperature > 0 ? { value: avgTemperature, unit: 'F', sources: tempSources } : undefined,
      rating:      calculateSurfRating(avgWaveHeight, avgWindSpeed, windDirection, spotId),
      conditions:  surfReport,
      recommendations: [],
      surfLikelihood,
      surfReport,
      notes,
      timestamp:   dataGroup[0]?.timestamp,
      periodName:  mostCommonPeriodName,
    };
  } catch (error) {
    console.error('🌊 Error aggregating forecast data:', error);
    return null;
  }
};

// ─── NOAA Forecast Fetching ──────────────────────────────────────────────────

const fetchNOAAForecastData = async (
  latitude: number,
  longitude: number,
  hours: number = 168
): Promise<WindData[]> => {
  try {
    dlog(`🌊 Fetching NOAA Marine forecast (${hours}h)`);
    const forecastData: WindData[] = [];
    const startDate = new Date();
    const endDate   = new Date(startDate.getTime() + hours * 3_600_000);
    const marineZone = getMarineForecastZone(latitude, longitude);

    // Primary: NOAA Marine Products API (NSH)
    try {
      const nwsOffice = longitude >= -88.0 && latitude <= 47.0 ? 'MQT' : 'DLH';
      const productsResponse = await fetch(`https://api.weather.gov/products/types/NSH/locations/${nwsOffice}`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData?.['@graph']?.length > 0) {
          const latestProduct = productsData['@graph'][0];
          const forecastResponse = await fetch(latestProduct['@id']);
          if (forecastResponse.ok) {
            const forecastContent = await forecastResponse.json();
            const extracted = parseNOAAMarineForecastText(
              forecastContent.productText || '', startDate, endDate, marineZone
            );
            forecastData.push(...extracted);
          }
        }
      }
    } catch (error) {
      console.error('🌊 Error fetching NOAA Marine Products:', error);
    }

    // Fallback: MapClick API
    if (forecastData.length === 0) {
      try {
        const url = `https://marine.weather.gov/MapClick.php?lat=${latitude}&lon=${longitude}&FcstType=marine`;
        const response = await fetch(url);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('text/html')) return forecastData;

          let marineData;
          try { marineData = await response.json(); } catch { return forecastData; }

          if (marineData?.data) {
            if (marineData.data.text && Array.isArray(marineData.data.text)) {
              for (let i = 0; i < marineData.data.text.length; i++) {
                const text = marineData.data.text[i];
                const windSpeed    = extractWindSpeedFromNOAA(text);
                const windDirection = extractWindDirectionFromNOAA(text);
                const waveData     = extractWaveHeightFromNOAA(text);
                if (windSpeed > 0 && windDirection) {
                  const periodTime = new Date(startDate.getTime() + i * 3 * 3_600_000);
                  if (periodTime > endDate) break;
                  const avgWave = Math.round(((waveData.min + waveData.max) / 2) * 10) / 10;
                  forecastData.push({ windSpeed, windDirection, waveHeight: avgWave > 0 ? avgWave : 0, wavePeriod: undefined, waveDirection: windDirection, source: 'noaa-marine-forecast', timestamp: periodTime.toISOString() });
                }
              }
            } else if (marineData.data.WindSpeed && Array.isArray(marineData.data.WindSpeed)) {
              const periods = Math.min(
                marineData.data.WindSpeed.length,
                marineData.data.WindDirection?.length || 0,
                marineData.data.WaveHeight?.length || 0
              );
              for (let i = 0; i < periods; i++) {
                const windSpeed    = parseFloat(marineData.data.WindSpeed[i]) || 0;
                const windDirection = marineData.data.WindDirection?.[i] || 'N';
                const waveHeight   = parseFloat(marineData.data.WaveHeight?.[i]) || 0;
                if (windSpeed > 0 && windDirection) {
                  const periodTime = new Date(startDate.getTime() + i * 3 * 3_600_000);
                  if (periodTime > endDate) break;
                  forecastData.push({ windSpeed, windDirection, waveHeight: waveHeight > 0 ? waveHeight : 0, wavePeriod: undefined, waveDirection: windDirection, source: 'noaa-marine-forecast', timestamp: periodTime.toISOString() });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('🌊 Error fetching NOAA Marine MapClick:', error);
      }
    }

    // Final fallback: Weather.gov points API
    if (forecastData.length === 0) {
      try {
        const pointsResponse = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`);
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          const forecastUrl = pointsData.properties.forecast;
          if (forecastUrl) {
            const forecastResponse = await fetch(forecastUrl);
            if (forecastResponse.ok) {
              const forecastJson = await forecastResponse.json();
              if (forecastJson.properties?.periods) {
                const now = new Date();
                for (const period of forecastJson.properties.periods) {
                  const startTime = new Date(period.startTime);
                  const hoursDiff = (startTime.getTime() - now.getTime()) / 3_600_000;
                  if (hoursDiff < -6 || startTime > endDate) continue;
                  const windSpeed    = extractWindSpeedFromNOAA(period.detailedForecast || '');
                  const windDirection = extractWindDirectionFromNOAA(period.detailedForecast || '');
                  const waveData     = extractWaveHeightFromNOAA(period.detailedForecast || '');
                  if (windSpeed > 0 && windDirection) {
                    const avgWave = Math.round(((waveData.min + waveData.max) / 2) * 10) / 10;
                    forecastData.push({ windSpeed, windDirection, temperature: period.temperature?.value ? parseFloat(period.temperature.value) : undefined, waveHeight: avgWave > 0 ? avgWave : 0, wavePeriod: avgWave > 0 ? Math.max(4, Math.min(8, avgWave * 2)) : undefined, waveDirection: windDirection, source: 'noaa-weathergov-marine', timestamp: startTime.toISOString() });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('🌊 Error fetching NOAA Weather.gov fallback:', error);
      }
    }

    dlog(`🌊 Generated ${forecastData.length} NOAA forecast points`);
    return forecastData;
  } catch (error) {
    console.error('🌊 Error in fetchNOAAForecastData:', error);
    return [];
  }
};

// ─── NOAA Text Parsing ────────────────────────────────────────────────────────

const extractWindSpeedFromNOAA = (text: string): number => {
  if (!text) return 0;
  const patterns = [
    /(?:northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)\s+wind\s+(\d+)(?:\s+to\s+\d+)?\s+knots?/i,
    /wind\s+(?:northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)\s+(\d+)(?:\s+to\s+\d+)?\s+knots?/i,
    /(\d+)\s*(?:to\s*\d+\s*)?knots?/i,
    /(\d+)\s*(?:to\s*\d+\s*)?mph/i,
    /variable\s+(\d+)\s+knots?\s+or\s+less/i,
    /becoming\s+variable\s+(\d+)\s+knots?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const speed = parseInt(match[1]);
      return pattern.source.includes('knots?') ? Math.round(speed * 1.15078) : speed;
    }
  }
  return 0;
};

const extractWindDirectionFromNOAA = (text: string): string => {
  if (!text) return 'N';
  const patterns = [
    /(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)\s+wind/i,
    /wind\s+(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)/i,
    /becoming\s+(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)/i,
    /variable\s+\d+\s+knots?\s+or\s+less/i,
    /(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)/i,
  ];
  const dirMap: Record<string, string> = {
    NORTHEAST: 'NE', NORTHWEST: 'NW', SOUTHEAST: 'SE', SOUTHWEST: 'SW',
    NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W',
  };
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('variable')) return 'VAR';
      const dir = match[1].toUpperCase();
      return dirMap[dir] || dir;
    }
  }
  return 'N';
};

const extractWaveHeightFromNOAA = (text: string): { min: number; max: number; isRange: boolean } => {
  if (!text) return { min: 0, max: 0, isRange: false };
  const t = text.toLowerCase();
  const patterns = [
    /waves?\s+(\d+)\s+to\s+(\d+)\s+feet?/i,
    /(\d+)\s+to\s+(\d+)\s+feet?/i,
    /(\d+)-(\d+)\s+feet?/i,
    /waves?\s+(\d+)\s+feet?/i,
    /(\d+)\s+feet?/i,
    /waves?\s+(\d+)\s+foot?\s+or\s+less/i,
    /(\d+)\s+foot?\s+or\s+less/i,
    /swell\s+(\d+)\s+to\s+(\d+)\s+feet?/i,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match) {
      if (match[2]) return { min: parseInt(match[1]), max: parseInt(match[2]), isRange: true };
      return { min: parseInt(match[1]), max: parseInt(match[1]), isRange: false };
    }
  }
  return { min: 0, max: 0, isRange: false };
};

const getMarineForecastZone = (
  latitude: number,
  longitude: number
): { id: string; name: string } => {
  if (longitude >= -88.0 && latitude <= 47.0) return { id: 'LSZ261', name: 'Michigan Waters of Lake Superior' };
  if (latitude >= 46.5 && latitude <= 47.0 && longitude >= -91.5 && longitude <= -90.5) return { id: 'LSZ145', name: 'Duluth, MN to Port Wing, WI' };
  if (latitude >= 48.0 && latitude <= 49.0 && longitude >= -90.5 && longitude <= -89.5) return { id: 'LSZ140', name: 'Grand Portage to Grand Marais, MN' };
  if (latitude >= 47.5 && latitude <= 48.5 && longitude >= -91.0 && longitude <= -90.0) return { id: 'LSZ141', name: 'Grand Marais to Taconite Harbor, MN' };
  if (latitude >= 47.0 && latitude <= 47.5 && longitude >= -91.5 && longitude <= -91.0) return { id: 'LSZ142', name: 'Taconite Harbor to Silver Bay Harbor, MN' };
  if (latitude >= 46.5 && latitude <= 47.0 && longitude >= -92.0 && longitude <= -91.5) return { id: 'LSZ143', name: 'Silver Bay Harbor to Two Harbors, MN' };
  if (latitude >= 46.5 && latitude <= 47.0 && longitude >= -92.5 && longitude <= -91.5) return { id: 'LSZ144', name: 'Two Harbors to Duluth, MN' };
  return { id: 'LSZ144', name: 'Two Harbors to Duluth, MN' };
};

const parseNOAAMarineForecastText = (
  forecastText: string,
  startDate: Date,
  endDate: Date,
  marineZone: { id: string; name: string }
): WindData[] => {
  const forecastData: WindData[] = [];
  if (!forecastText) return forecastData;

  const sections = forecastText.split('LSZ');
  for (const section of sections) {
    if (!section.includes(marineZone.name.split(',')[0]) && !section.includes(marineZone.id)) continue;

    const periodMatches = section.matchAll(/\.([A-Z\s]+)\.\.\./g);
    const periods: { name: string; text: string }[] = [];

    for (const match of periodMatches) {
      const periodName = match[1].trim();
      const startIndex = match.index! + match[0].length;
      const nextMatch = section.slice(startIndex).match(/\.([A-Z\s]+)\.\.\./);
      const endIndex = nextMatch ? startIndex + nextMatch.index! : section.length;
      periods.push({ name: periodName, text: section.slice(startIndex, endIndex).trim() });
    }

    for (const period of periods) {
      const windSpeed    = extractWindSpeedFromNOAA(period.text);
      const windDirection = extractWindDirectionFromNOAA(period.text);
      const waveData     = extractWaveHeightFromNOAA(period.text);
      const avgWave      = Math.round(((waveData.min + waveData.max) / 2) * 10) / 10;

      if (windSpeed > 0 && windDirection) {
        const timestamp = createTimestampFromPeriodName(period.name, startDate);
        if (timestamp >= startDate && timestamp <= endDate) {
          forecastData.push({
            windSpeed, windDirection,
            waveHeight: avgWave > 0 ? avgWave : 0,
            wavePeriod: avgWave > 0 ? Math.max(4, Math.min(8, avgWave * 2)) : undefined,
            waveDirection: windDirection,
            source: 'noaa-marine-products',
            timestamp: timestamp.toISOString(),
            periodName: period.name,
          });
        }
      }
    }
  }

  return forecastData;
};

const createTimestampFromPeriodName = (periodName: string, _baseDate: Date): Date => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const h = (hours: number, timeOfDay: number) =>
    new Date(today.getTime() + hours * 3_600_000 + timeOfDay * 3_600_000);

  switch (periodName.toUpperCase()) {
    case 'REST OF TODAY':  return new Date(Date.now() + 3_600_000);
    case 'TONIGHT':        return h(0,  20);
    case 'THURSDAY':       return h(24, 12);
    case 'THURSDAY NIGHT': return h(24, 20);
    case 'FRIDAY':         return h(48, 12);
    case 'FRIDAY NIGHT':   return h(48, 20);
    case 'SATURDAY':       return h(72, 12);
    case 'SATURDAY NIGHT': return h(72, 20);
    case 'SUNDAY':         return h(96, 12);
    case 'SUNDAY NIGHT':   return h(96, 20);
    case 'MONDAY':         return h(120, 12);
    case 'MONDAY NIGHT':   return h(120, 20);
    case 'TUESDAY':        return h(144, 12);
    case 'TUESDAY NIGHT':  return h(144, 20);
    case 'WEDNESDAY':      return h(168, 12);
    case 'WEDNESDAY NIGHT':return h(168, 20);
    default:               return now;
  }
};
