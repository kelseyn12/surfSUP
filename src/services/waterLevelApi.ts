/**
 * NOAA water level and water temperature fetching.
 */

import { WaterLevelData } from '../types';
import {
  NOAA_WATER_LEVEL_BASE,
  WATER_LEVEL_STATIONS,
  calculateDistance,
} from './greatLakesConstants';

// ─── Public API ──────────────────────────────────────────────────────────────

export const getNearestWaterLevelStation = (spotLat: number, spotLon: number) => {
  let nearest = WATER_LEVEL_STATIONS.DULUTH;
  let minDistance = Infinity;

  Object.values(WATER_LEVEL_STATIONS).forEach(station => {
    const d = calculateDistance(spotLat, spotLon, station.lat, station.lon);
    if (d < minDistance) { minDistance = d; nearest = station; }
  });

  return nearest;
};

export const fetchWaterLevelData = async (
  latitude: number,
  longitude: number
): Promise<{ waterLevel: WaterLevelData | null; waterTemp: number | null }> => {
  try {
    const nearestStation = getNearestWaterLevelStation(latitude, longitude);
    const now = new Date();
    const endDate   = now.toISOString().split('T')[0];
    const startDate = new Date(now.getTime() - 86_400_000).toISOString().split('T')[0];

    const tempUrl =
      `${NOAA_WATER_LEVEL_BASE}` +
      `?begin_date=${startDate}&end_date=${endDate}` +
      `&station=${nearestStation.id}` +
      `&product=water_temperature&datum=IGLD&time_zone=lst_ldt&units=english&format=json`;

    const tempResponse = await fetch(tempUrl);
    const tempData = await tempResponse.json();

    let waterTemp: number | null = null;
    if (tempData.data?.length) {
      const v = parseFloat(tempData.data[tempData.data.length - 1].v);
      if (!isNaN(v)) waterTemp = v; // NOAA returns °F
    }

    return { waterLevel: null, waterTemp };
  } catch (error) {
    console.error('🌊 Error fetching water level/temp data:', error);
    return { waterLevel: null, waterTemp: null };
  }
};
