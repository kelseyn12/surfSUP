/**
 * Great Lakes API — barrel re-export.
 *
 *   openMeteoCurrentService.ts — current conditions (Open-Meteo model analysis)
 *   forecastApi.ts             — multi-day forecast (Open-Meteo + NSH parsing)
 *   conditionsAggregator.ts    — surf rating/likelihood utilities
 *   greatLakesConstants.ts     — shared helpers
 */

export { fetchCurrentConditions as fetchAllGreatLakesData } from './openMeteoCurrentService';
export { fetchAllGreatLakesForecastData } from './forecastApi';
