/**
 * Great Lakes API — barrel re-export.
 *
 * All implementation has been split into focused modules:
 *   buoyApi.ts           — NDBC buoy fetching & parsing
 *   windApi.ts           — NOAA wind fetching & parsing
 *   waterLevelApi.ts     — NOAA water level / temp
 *   conditionsAggregator.ts — data blending + fetchAllGreatLakesData
 *   forecastApi.ts       — fetchAllGreatLakesForecastData
 *   greatLakesConstants.ts  — shared constants & utilities
 */

export { fetchAllGreatLakesData } from './conditionsAggregator';
export { fetchAllGreatLakesForecastData } from './forecastApi';
export { getNearestWaterLevelStation } from './waterLevelApi';
