/**
 * NDBC buoy data fetching and parsing.
 * Covers wave buoys and weather stations on Lake Superior.
 */

import { BuoyData, NdbcBuoyResponse } from '../types';
import { getWindDirectionFromDegrees } from '../config/surfConfig';
import {
  LAKE_SUPERIOR_BUOYS,
  NDBC_BASE,
  calculateDistance,
  normalizeWindDirection,
} from './greatLakesConstants';

// ─── Buoy Fetching ───────────────────────────────────────────────────────────

/**
 * Fetch data from all nearby NDBC buoys and weather stations.
 * Selects the closest wave buoys (up to 2) and wind stations (up to 3)
 * within a 250-mile radius.
 */
export const fetchAllBuoyData = async (
  latitude: number,
  longitude: number
): Promise<BuoyData[]> => {
  const allBuoyData: BuoyData[] = [];

  const waveBuoys: { id: string; buoy: any; distance: number }[] = [];
  const windBuoys: { id: string; buoy: any; distance: number }[] = [];

  for (const [buoyId, buoy] of Object.entries(LAKE_SUPERIOR_BUOYS)) {
    const distance = calculateDistance(latitude, longitude, buoy.lat, buoy.lon);
    if (distance <= 250) {
      if (buoy.type === 'wave') waveBuoys.push({ id: buoyId, buoy, distance });
      else if (buoy.type === 'weather') windBuoys.push({ id: buoyId, buoy, distance });
    }
  }

  waveBuoys.sort((a, b) => a.distance - b.distance);
  windBuoys.sort((a, b) => a.distance - b.distance);

  const selectedWindBuoys = windBuoys.slice(0, 3);
  const selectedWaveBuoys = waveBuoys.slice(0, 2);

  // Fetch wind/weather stations
  for (const { id: buoyId, buoy, distance } of selectedWindBuoys) {
    try {
      const response = await fetch(`${NDBC_BASE}/${buoyId}.txt`);
      if (response.ok) {
        const text = await response.text();
        const weatherData = parseWeatherStationData(text, buoy.name);
        if (weatherData) {
          allBuoyData.push({
            timestamp: new Date().toISOString(),
            waveHeight: 0,
            wavePeriod: 0,
            waveDirection: 'N',
            waterTemp: weatherData.temperature || 0,
            windSpeed: weatherData.windSpeed,
            windDirection: weatherData.windDirection,
            source: `weather-${buoyId}`,
            distance,
          });
        }
      }
    } catch {
      // individual buoy failures are non-fatal
    }
  }

  // Fetch wave buoys
  for (const { id: buoyId, buoy, distance } of selectedWaveBuoys) {
    try {
      const response = await fetch(`${NDBC_BASE}/${buoyId}.txt`);
      if (response.ok) {
        const text = await response.text();
        const buoyData = parseBuoyData(text, buoyId, buoy.name);
        if (buoyData) {
          allBuoyData.push({ ...buoyData, distance });
        }
      }
    } catch {
      // individual buoy failures are non-fatal
    }
  }

  return allBuoyData;
};

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse NDBC standard text format into a BuoyData record.
 * Returns null if the data is stale (>48h old) or values are unrealistic.
 */
export const parseBuoyData = (
  text: string,
  buoyId: string,
  _buoyName: string
): BuoyData | null => {
  try {
    // Convert text to NdbcBuoyResponse for type-safety (unused at runtime but keeps types valid)
    const lines = text.split('\n').filter(l => l.trim());
    const ndbcResponse: NdbcBuoyResponse = {
      time: [], wvht: [], dpd: [], mwd: [], wspd: [],
      wdir: [], gst: [], wtemp: [], steepness: [],
    };
    lines.forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length >= 12) {
        ndbcResponse.time.push(parts.slice(0, 5).join(' '));
        ndbcResponse.wvht.push(parseFloat(parts[5]) || 0);
        ndbcResponse.dpd.push(parseFloat(parts[6]) || 0);
        ndbcResponse.mwd.push(parseFloat(parts[7]) || 0);
        ndbcResponse.wspd.push(parseFloat(parts[8]) || 0);
        ndbcResponse.wdir.push(parseFloat(parts[9]) || 0);
        ndbcResponse.gst.push(parseFloat(parts[10]) || 0);
        ndbcResponse.wtemp.push(parseFloat(parts[11]) || 0);
        ndbcResponse.steepness.push(parts[12] || '');
      }
    });

    const recentLines = lines.slice(0, 20);
    for (const line of recentLines) {
      const parts = line.split(/\s+/);
      if (parts.length < 15) continue;

      const [year, month, day, hour, minute,
        windDirection, windSpeed, , waveHeight, wavePeriod, , waveDirection, , , waterTemp] = parts;

      const hasValidWaveHeight = waveHeight !== 'MM' && !isNaN(parseFloat(waveHeight));
      const hasValidWavePeriod = wavePeriod !== 'MM' && !isNaN(parseFloat(wavePeriod));
      const hasValidWindSpeed  = windSpeed  !== 'MM' && !isNaN(parseFloat(windSpeed));

      if (!hasValidWaveHeight && !hasValidWavePeriod && !hasValidWindSpeed) continue;

      const yearNum = parseInt(year);
      const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;
      const dataDate = new Date(Date.UTC(
        fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)
      ));
      const hoursDiff = (Date.now() - dataDate.getTime()) / 3_600_000;

      if (hoursDiff > 48) {
        const dataDay  = new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)));
        const todayDay = new Date(Date.UTC(
          new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()
        ));
        if (dataDay.getTime() !== todayDay.getTime()) continue;
      }

      const waveHeightFt = parseFloat(waveHeight) * 3.28084;
      if (waveHeightFt > 15 || waveHeightFt < 0.05) continue;

      const windSpeedNum = windSpeed !== 'MM' ? parseFloat(windSpeed) : 0;
      let finalWindDir = windDirection !== 'MM' ? windDirection : 'N';
      if (!isNaN(parseFloat(finalWindDir))) {
        finalWindDir = getWindDirectionFromDegrees(parseFloat(finalWindDir));
      }

      const waterTempC = parseFloat(waterTemp);
      if (isNaN(waterTempC)) return null;
      const clampedTempC = Math.min(Math.max(waterTempC, 0), 25);

      return {
        timestamp: dataDate.toISOString(),
        waveHeight: waveHeightFt,
        wavePeriod: parseFloat(wavePeriod),
        waveDirection: waveDirection || 'N',
        waterTemp: clampedTempC,
        windSpeed: windSpeedNum,
        windDirection: finalWindDir,
        source: `ndbc-${buoyId}`,
      };
    }

    return null;
  } catch (error) {
    console.error('🌊 Error parsing buoy data:', error);
    return null;
  }
};

/**
 * Parse NDBC weather-station text (wind + air temp only — no wave data).
 */
export const parseWeatherStationData = (
  text: string,
  stationName: string
): { windSpeed: number; windDirection: string; temperature: number | undefined } | null => {
  try {
    const lines = text.split('\n').filter(l => l.trim());
    const dataLine = lines.find(l => /^\d{4}\s+\d{2}\s+\d{2}\s+\d{2}\s+\d{2}/.test(l));
    if (!dataLine) return null;

    const parts = dataLine.split(/\s+/);
    if (parts.length < 15) return null;

    const windDirectionRaw = parts[5]; // WDIR
    const windSpeedRaw     = parts[6]; // WSPD
    const temperatureRaw   = parts[13]; // ATMP

    if (windDirectionRaw === 'MM' || windSpeedRaw === 'MM') return null;

    const windSpeed = parseFloat(windSpeedRaw);
    if (isNaN(windSpeed) || windSpeed < 0 || windSpeed > 100) return null;

    return {
      windSpeed: windSpeed * 2.23694, // m/s → mph
      windDirection: normalizeWindDirection(windDirectionRaw),
      temperature: temperatureRaw !== 'MM' ? parseFloat(temperatureRaw) : undefined,
    };
  } catch (error) {
    console.error(`🌊 Error parsing weather station data for ${stationName}:`, error);
    return null;
  }
};
