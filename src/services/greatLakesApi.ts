import { 
  WaterLevelData, 
  BuoyData, 
  WindData, 
  NdbcBuoyResponse, 
  AggregatedConditions 
} from '../types';
import {
  convertWindDirectionToDegrees,
  getWindDirectionFromDegrees,
  checkSwellDirections,
  checkLocalWindQuality,
  adjustRatingForLocalWinds,
  generateWindDirectionNotes,
  isFavorableWindDirection
} from '../config/surfConfig';

// Multiple data source APIs for comprehensive Great Lakes forecasting
const NOAA_WATER_LEVEL_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';
const WINDY_API_BASE = 'https://api.windy.com/api/point-forecast/v2';

// Lake Superior buoy stations (NDBC) - CORRECTED TYPES
const LAKE_SUPERIOR_BUOYS = {
  // Wave Buoys (report wave height, period, direction)
  '45001': { 
    name: 'MID SUPERIOR Wave Buoy', 
    lat: 47.345, 
    lon: -87.323, 
    description: 'Forecasts waves coming to Duluth in 12 hours',
    direction: 'N/NE',
    travelTime: 12,
    forecastHours: [12, 18, 24],
    type: 'wave'
  },
  '45027': { 
    name: 'McQuade Harbor Wave Buoy', 
    lat: 46.775, 
    lon: -92.093, 
    description: 'Current local wave conditions near Duluth',
    direction: 'local',
    travelTime: 0,
    forecastHours: [0],
    type: 'wave'
  },
  '45028': { 
    name: 'Western Lake Superior Wave Buoy', 
    lat: 47.020, 
    lon: -91.670, 
    description: 'Western Lake Superior wave conditions',
    direction: 'W',
    travelTime: 2,
    forecastHours: [2, 4, 6],
    type: 'wave'
  },
  
  // Weather Stations (report wind, pressure, temp - no waves)
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
    lat: 47.345, 
    lon: -87.323, 
    description: 'Wind conditions for forecasting waves to Duluth',
    direction: 'N/NE',
    travelTime: 12,
    forecastHours: [12, 18, 24],
    type: 'weather'
  },


};

// Removed unused wind sources constant

// NOAA water level stations for Lake Superior
// NOTE: Only 2 active NOAA stations exist on Lake Superior
const WATER_LEVEL_STATIONS = {
  // Western Lake Superior
  'DULUTH': { id: '9099064', name: 'Duluth', lat: 46.775, lon: -92.093 },
  'TWO_HARBORS': { id: '9099064', name: 'Two Harbors', lat: 47.020, lon: -91.670 }, // Uses Duluth station
  'SILVER_BAY': { id: '9099064', name: 'Silver Bay', lat: 47.320, lon: -91.270 }, // Uses Duluth station
  
  // Central Lake Superior  
  'GRAND_MARAIS': { id: '9099090', name: 'Grand Marais', lat: 47.748, lon: -90.341 },
  'MARQUETTE': { id: '9099090', name: 'Marquette', lat: 46.545, lon: -87.378 }, // Uses Grand Marais station (closer than Duluth)
  'MUNISING': { id: '9099090', name: 'Munising', lat: 46.411, lon: -86.647 }, // Uses Grand Marais station (closer than Duluth)
  'PICTURED_ROCKS': { id: '9099090', name: 'Pictured Rocks', lat: 46.670, lon: -86.170 }, // Uses Grand Marais station
  
  // Eastern Lake Superior
  'THUNDER_BAY': { id: '9099090', name: 'Thunder Bay', lat: 48.380, lon: -89.247 }, // Uses Grand Marais station (closer than Duluth)
};



/**
 * Fetch data from ALL sources simultaneously
 */
export const fetchAllGreatLakesData = async (
  spotId: string,
  latitude: number,
  longitude: number
): Promise<AggregatedConditions | null> => {
  try {
  
    
    const [
      buoyData,
      windData,
      waterLevelData
    ] = await Promise.allSettled([
      fetchAllBuoyData(latitude, longitude),
      fetchAllWindData(latitude, longitude),
      fetchWaterLevelData(latitude, longitude)
    ]);
    
    // Extract successful results
    const successfulBuoyData = buoyData.status === 'fulfilled' ? buoyData.value : [];
    const successfulWindData = windData.status === 'fulfilled' ? windData.value : null;
    const successfulWaterData = waterLevelData.status === 'fulfilled' ? waterLevelData.value : { waterLevel: null, waterTemp: null };
    

    
    // Log errors with context
    if (buoyData.status === 'rejected') {
      console.error('🌊 Buoy data error:', buoyData.reason);
    }
    if (windData.status === 'rejected') {
      const error = windData.reason;
      if (error && error.toString().includes('429')) {
        // Rate limited - silent fail
      } else {
        console.error('🌊 Wind data error:', error);
      }
    }
    if (waterLevelData.status === 'rejected') {
      console.error('🌊 Water data error:', waterLevelData.reason);
    }
    
    // Aggregate all data sources with intelligent blending
    const aggregated = aggregateAllData(
      successfulBuoyData,
      successfulWindData,
      successfulWaterData,
      spotId,
      latitude,
      longitude
    );
    

    
    return aggregated;
    
  } catch (error) {
    console.error('🌊 Error fetching all Great Lakes data:', error);
    return null;
  }
};

/**
 * Enhanced buoy data fetching with proximity-based selection and partial data retention
 */
const fetchAllBuoyData = async (latitude: number, longitude: number): Promise<BuoyData[]> => {
  const allBuoyData: BuoyData[] = [];
  const buoyStatus: { [key: string]: string } = {};
  
  // Separate buoys by type for proximity-based selection
  const waveBuoys: {id: string, buoy: any, distance: number}[] = [];
  const windBuoys: {id: string, buoy: any, distance: number}[] = [];
  
  // Calculate distances and categorize buoys
  for (const [buoyId, buoy] of Object.entries(LAKE_SUPERIOR_BUOYS)) {
    const distance = calculateDistance(latitude, longitude, buoy.lat, buoy.lon);
    
    if (distance <= 250) { // 250 mile range
      if (buoy.type === 'wave') {
        waveBuoys.push({ id: buoyId, buoy, distance });
      } else if (buoy.type === 'weather') {
        windBuoys.push({ id: buoyId, buoy, distance });
      }
    }
  }
  
  // Sort by distance for proximity-based selection
  waveBuoys.sort((a, b) => a.distance - b.distance);
  windBuoys.sort((a, b) => a.distance - b.distance);
  
  // Select closest buoys (up to 3 wind buoys, 2 wave buoys)
  const selectedWindBuoys = windBuoys.slice(0, 3);
  const selectedWaveBuoys = waveBuoys.slice(0, 2);
  
  // Selected buoys for aggregation
  
  // Fetch data from selected wind buoys
  for (const { id: buoyId, buoy, distance } of selectedWindBuoys) {
    try {
      const url = `${NDBC_BASE}/${buoyId}.txt`;
      const response = await fetch(url);
      
      if (response.ok) {
        const text = await response.text();
        const weatherData = parseWeatherStationData(text, buoy.name);
        
        if (weatherData) {
          // Convert weather station data to BuoyData format
          const buoyData: BuoyData = {
            timestamp: new Date().toISOString(),
            waveHeight: 0, // Weather stations don't measure waves
            wavePeriod: 0,
            waveDirection: 'N',
            waterTemp: weatherData.temperature || 0,
            windSpeed: weatherData.windSpeed,
            windDirection: weatherData.windDirection,
            source: `weather-${buoyId}`,
            distance: distance
          };
          allBuoyData.push(buoyData);
          buoyStatus[buoyId] = 'wind-active';
          // Wind buoy providing data
        } else {
          buoyStatus[buoyId] = 'wind-no-data';
          // Wind buoy not reporting data
        }
      } else {
        buoyStatus[buoyId] = 'http-error';
        console.error(`🌊 Wind buoy ${buoyId} HTTP error:`, response.status);
      }
    } catch (error) {
      buoyStatus[buoyId] = 'fetch-error';
      console.error(`🌊 Error fetching wind buoy ${buoyId}:`, error);
    }
  }
  
  // Fetch data from selected wave buoys
  for (const { id: buoyId, buoy, distance } of selectedWaveBuoys) {
    try {
      const url = `${NDBC_BASE}/${buoyId}.txt`;
      const response = await fetch(url);
      
      if (response.ok) {
        const text = await response.text();
        const latestData = parseBuoyData(text, buoyId, buoy.name);
        
        if (latestData) {
          // Accept partial data - wave buoys can have valid wave data even if wind data is missing
          const hasValidWaveData = latestData.waveHeight >= 0;
          const hasValidWindData = latestData.windSpeed >= 0;
          const hasValidWaterTemp = latestData.waterTemp > 0;
          
          // Accept if we have ANY valid data from this buoy
          if (hasValidWaveData || hasValidWindData || hasValidWaterTemp) {
            const buoyDataWithDistance = {
              ...latestData,
              distance: distance
            };
            allBuoyData.push(buoyDataWithDistance);
            buoyStatus[buoyId] = 'wave-active';
            // Wave buoy providing data
          } else {
            buoyStatus[buoyId] = 'wave-no-valid-data';
            // Wave buoy has no valid data
          }
        } else {
          buoyStatus[buoyId] = 'wave-no-data';
          // Wave buoy is offline
        }
      } else {
        buoyStatus[buoyId] = 'http-error';
        console.error(`🌊 Wave buoy ${buoyId} HTTP error:`, response.status);
      }
    } catch (error) {
      buoyStatus[buoyId] = 'fetch-error';
      console.error(`🌊 Error fetching wave buoy ${buoyId}:`, error);
    }
  }
  
  // Total buoy data collected
  
  return allBuoyData;
};

/**
 * Fetch wind data from multiple sources
 */
const fetchAllWindData = async (latitude: number, longitude: number): Promise<WindData | null> => {
  const windSources: WindData[] = [];
  
  try {
    // Fetch from all wind sources simultaneously
    const [noaaWind, windyWind] = await Promise.allSettled([
      fetchNOAAWindData(getNearestWaterLevelStation(latitude, longitude).id),
      fetchWindyWindData(latitude, longitude)
    ]);
    
    // Add successful results
    if (noaaWind.status === 'fulfilled' && noaaWind.value) {
      windSources.push(noaaWind.value);
    }
    
    if (windyWind.status === 'fulfilled' && windyWind.value) {
      windSources.push(windyWind.value);
    }
    
    // Return the most reliable source or average if multiple
    if (windSources.length === 0) {
      return null;
    }
    
    if (windSources.length === 1) {
      return windSources[0];
    }
    
    // Average multiple wind sources for better accuracy
    const avgWindSpeed = windSources.reduce((sum, source) => sum + source.windSpeed, 0) / windSources.length;
    const avgTemp = windSources.reduce((sum, source) => sum + (source.temperature || 0), 0) / windSources.length;
    const avgPressure = windSources.reduce((sum, source) => sum + (source.pressure || 0), 0) / windSources.length;
    
    // Use most common direction or first available
    const directions = windSources.map(s => s.windDirection).filter(d => d);
    const mostCommonDirection = getMostCommonDirection(directions) || windSources[0].windDirection;
    
    return {
      windSpeed: Math.round(avgWindSpeed * 10) / 10,
      windDirection: mostCommonDirection,
      temperature: Math.round(avgTemp * 10) / 10,
      pressure: Math.round(avgPressure * 10) / 10,
      source: windSources.map(s => s.source).join('+')
    };
    
  } catch (error) {
    console.error('🌊 Error fetching wind data:', error);
    return null;
  }
};

/**
 * Fetch Windy wind data
 * 
 * Model + Parameter Compatibility:
 * - gfs: wind, windGust, temp, pressure, dewpoint, rh, precip, etc.
 * - gfsWave: waves, swell1, swell2, windWaves (excludes Hudson Bay, Black Sea, Caspian Sea, Arctic Ocean)
 * - namConus: wind, windGust, temp, pressure, etc. (USA and surrounding areas)
 */
const fetchWindyWindData = async (latitude: number, longitude: number): Promise<WindData | null> => {
  try {
    const WINDY_API_KEY = process.env.EXPO_PUBLIC_WINDY_API_KEY;
    
    // API key check logged only when debugging
    
    if (!WINDY_API_KEY) {
      console.warn('🌊 Windy API key not found. Set EXPO_PUBLIC_WINDY_API_KEY in your environment variables.');
      return null;
    }
    
    // Add debouncing to prevent rate limiting
    const lastCallTime = (globalThis as any).lastWindyCall || 0;
    const timeSinceLastCall = Date.now() - lastCallTime;
    const minInterval = 200; // 200ms between calls
    
    if (timeSinceLastCall < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
    }
    
    (globalThis as any).lastWindyCall = Date.now();
    
    const url = WINDY_API_BASE;
    
    // Make two separate requests: one for wind data, one for wave data
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const [windResponse, waveResponse] = await Promise.allSettled([
      // Request 1: Wind data using gfs model
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: latitude,
          lon: longitude,
          model: 'gfs',
          parameters: ['wind', 'temp', 'pressure'],
          levels: ['surface'],
          key: WINDY_API_KEY
        }),
        signal: controller.signal
      }),
      // Request 2: Wave data using gfsWave model
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: latitude,
          lon: longitude,
          model: 'gfsWave',
          parameters: ['waves'],
          levels: ['surface'],
          key: WINDY_API_KEY
        }),
        signal: controller.signal
      })
    ]);
    
    clearTimeout(timeoutId);
    
    // Process wind data
    let windData = null;
    if (windResponse.status === 'fulfilled' && windResponse.value.ok) {
      const windJson = await windResponse.value.json();
      if (windJson.ts && windJson['wind_u-surface'] && windJson['wind_v-surface']) {
        const currentIndex = 0;
        const windU = windJson['wind_u-surface'][currentIndex];
        const windV = windJson['wind_v-surface'][currentIndex];
        const temperature = windJson['temp-surface'] ? windJson['temp-surface'][currentIndex] : undefined;
        const pressure = windJson['pressure-surface'] ? windJson['pressure-surface'][currentIndex] : undefined;
        
        const windSpeed = Math.sqrt(windU * windU + windV * windV) * 2.23694; // Convert m/s to mph
        const windDegrees = Math.atan2(windV, windU) * 180 / Math.PI;
        const windDirection = getWindDirectionFromDegrees(windDegrees);
        
        windData = {
          windSpeed: windSpeed || 0,
          windDirection: windDirection || 'N',
                  temperature: temperature || undefined,
        pressure: pressure || undefined,
          source: 'windy'
        };
      }
    } else {
      const status = windResponse.status === 'rejected' ? windResponse.reason : windResponse.value?.status;
      if (status === 429) {
        // Rate limited - silent fail
      } else {
        console.error('🌊 Windy wind data request failed:', status);
      }
    }
    
    // Process wave data
    let waveData = null;
    if (waveResponse.status === 'fulfilled' && waveResponse.value.ok) {
      const waveJson = await waveResponse.value.json();
      if (waveJson.ts && waveJson['waves_height-surface']) {
        const currentIndex = 0;
        const waveHeight = waveJson['waves_height-surface'][currentIndex] * 3.28084; // Convert meters to feet
        const wavePeriod = waveJson['waves_period-surface'] ? waveJson['waves_period-surface'][currentIndex] : null;
        const waveDirection = waveJson['waves_direction-surface'] ? getWindDirectionFromDegrees(waveJson['waves_direction-surface'][currentIndex]) : null;
        
        waveData = {
          waveHeight: waveHeight || 0,
          wavePeriod: wavePeriod || 0,
          waveDirection: waveDirection || 'N'
        };
      }
    } else {
      const status = waveResponse.status === 'rejected' ? waveResponse.reason : waveResponse.value?.status;
      if (status === 429) {
        // Rate limited - silent fail
      } else {
        console.error('🌊 Windy wave data request failed:', status);
      }
    }
    
    // Combine wind and wave data
    const result = {
      windSpeed: windData?.windSpeed || 0,
      windDirection: windData?.windDirection || 'N',
              temperature: windData?.temperature || undefined,
        pressure: windData?.pressure || undefined,
      waveHeight: waveData?.waveHeight || 0,
      wavePeriod: waveData?.wavePeriod || 0,
      waveDirection: waveData?.waveDirection || 'N',
      source: windData || waveData ? 'windy' : 'windy-rate-limited'
    };
    
    // Only log success if we actually got data
    if (windData || waveData) {
      // Windy API working - combined data
    }
    
    // Return null if no data available (let other sources handle it)
    if (!windData && !waveData) {
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('🌊 Error fetching Windy data:', error);
    return null;
  }
};



/**
 * Fetch NOAA wind data with improved parsing
 */
const fetchNOAAWindData = async (stationId: string): Promise<WindData | null> => {
  try {
    // Get the appropriate forecast zone based on location
    const forecastZone = 'DLH'; // Duluth area
    const url = `https://api.weather.gov/products/types/GLFLS/locations/${forecastZone}`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      
      // Parse the marine forecast text to extract current conditions
      if (data.features && data.features.length > 0) {
        const forecast = data.features[0].properties.productText;
        
        // Enhanced wind parsing with multiple flexible patterns
        const windPatterns = [
          // Standard patterns
          /(\w+)\s+winds?\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
          /(\w+)\s+winds?\s+(\d+)\s+knots?/i,
          /winds?\s+(\w+)\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
          /winds?\s+(\w+)\s+(\d+)\s+knots?/i,
          // Alternative formats
          /(\w+)\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
          /(\w+)\s+(\d+)\s+knots?/i,
          // With cardinal directions
          /(north|south|east|west|northeast|northwest|southeast|southwest|nne|nnw|ene|ese|sse|ssw|wsw|wnw)\s+winds?\s+(\d+)\s+to\s+(\d+)\s+knots?/i,
          /(north|south|east|west|northeast|northwest|southeast|southwest|nne|nnw|ene|ese|sse|ssw|wsw|wnw)\s+winds?\s+(\d+)\s+knots?/i,
        ];
        
        let windMatch = null;
        let windDirection = '';
        let windSpeed = 0;
        
        // Try each pattern until we find a match
        for (const pattern of windPatterns) {
          windMatch = forecast.match(pattern);
          if (windMatch) {
            break;
          }
        }
        
        if (windMatch) {
          // Extract wind direction and speed based on pattern
          if (windMatch.length === 4) {
            // Pattern: "Southwest winds 5 to 15 knots" or "SW 5 to 15 knots"
            windDirection = normalizeWindDirection(windMatch[1]);
            const windSpeedMin = parseInt(windMatch[2]);
            const windSpeedMax = parseInt(windMatch[3]);
            windSpeed = (windSpeedMin + windSpeedMax) / 2 * 1.15078; // Convert knots to mph
          } else if (windMatch.length === 3) {
            // Pattern: "Southwest winds 10 knots" or "SW 10 knots"
            windDirection = normalizeWindDirection(windMatch[1]);
            windSpeed = parseInt(windMatch[2]) * 1.15078; // Convert knots to mph
          }
          
          // Validate extracted data
          if (windSpeed > 0 && windSpeed < 50 && windDirection) {
            return {
              windSpeed: Math.round(windSpeed * 10) / 10,
              windDirection: windDirection,
              temperature: undefined, // No air temperature data available
              pressure: undefined,
              source: 'noaa-marine-forecast'
            };
          }
        }
        
        // If no wind pattern found, try to extract any wind information
        const fallbackWind = extractFallbackWind(forecast);
        if (fallbackWind) {
          return {
            windSpeed: fallbackWind.speed,
            windDirection: fallbackWind.direction,
            temperature: undefined,
            pressure: undefined,
            source: 'noaa-marine-forecast-fallback'
          };
        }
      }
    }
    
    // No data available
    return null;
  } catch (error) {
    console.error('🌊 Error fetching NOAA wind data:', error);
    return null;
  }
};

/**
 * Normalize wind direction to standard format
 */
const normalizeWindDirection = (direction: string): string => {
  const directionMap: { [key: string]: string } = {
    'north': 'N', 'south': 'S', 'east': 'E', 'west': 'W',
    'northeast': 'NE', 'northwest': 'NW', 'southeast': 'SE', 'southwest': 'SW',
    'nne': 'NNE', 'nnw': 'NNW', 'ene': 'ENE', 'ese': 'ESE',
    'sse': 'SSE', 'ssw': 'SSW', 'wsw': 'WSW', 'wnw': 'WNW'
  };
  
  const normalized = direction.toLowerCase();
  return directionMap[normalized] || direction.toUpperCase();
};

/**
 * Extract wind information from forecast text using fuzzy matching
 */
const extractFallbackWind = (forecast: string): { speed: number; direction: string } | null => {
  try {
    // Look for any mention of wind with numbers
    const windMentions = forecast.match(/(\w+)\s+(\d+)\s*(knots?|mph|miles?)/gi);
    if (windMentions && windMentions.length > 0) {
      const firstMention = windMentions[0];
      const parts = firstMention.split(/\s+/);
      
      if (parts.length >= 2) {
        const direction = normalizeWindDirection(parts[0]);
        const speed = parseInt(parts[1]);
        if (isNaN(speed)) return null;
        
        return {
          speed: speed * 1.15078, // Assume knots, convert to mph
          direction: direction
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('🌊 Error in fallback wind extraction:', error);
    return null;
  }
};







/**
 * Fetch water level data and water temperature from NOAA
 */
const fetchWaterLevelData = async (latitude: number, longitude: number): Promise<{ waterLevel: WaterLevelData | null; waterTemp: number | null }> => {
  try {
    const nearestStation = getNearestWaterLevelStation(latitude, longitude);
    // Water level data not currently available - using buoy data instead
    const waterLevels: WaterLevelData[] = [];
    
    // Also fetch water temperature from NOAA
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const tempUrl = `${NOAA_WATER_LEVEL_BASE}?begin_date=${startDate}&end_date=${endDate}&station=${nearestStation.id}&product=water_temperature&datum=IGLD&time_zone=lst_ldt&units=english&format=json`;
    

    
    const tempResponse = await fetch(tempUrl);
    const tempData = await tempResponse.json();
    
    let waterTemp = null;
    if (tempData.data && tempData.data.length > 0) {
      const latestTemp = parseFloat(tempData.data[tempData.data.length - 1].v);
      if (!isNaN(latestTemp)) {
        waterTemp = latestTemp; // NOAA returns in Fahrenheit

      }
    }
    
    return {
      waterLevel: waterLevels.length > 0 ? waterLevels[waterLevels.length - 1] : null,
      waterTemp
    };
  } catch (error) {
    console.error('🌊 Error fetching water level/temp data:', error);
    return { waterLevel: null, waterTemp: null };
  }
};

/**
 * Parse buoy data from NDBC text format
 */
const parseBuoyData = (text: string, buoyId: string, buoyName: string): BuoyData | null => {
  // Parse NDBC text format into structured data
  // NDBC format: YY MM DD hh mm WVHT DPD MWD WSPD WDIR GST WTMP
  // This represents the NdbcBuoyResponse structure
  try {

    
    // Convert text to NdbcBuoyResponse format for type safety
    const lines = text.split('\n').filter(line => line.trim());
    const ndbcResponse: NdbcBuoyResponse = {
      time: [],
      wvht: [],
      dpd: [],
      mwd: [],
      wspd: [],
      wdir: [],
      gst: [],
      wtemp: [],
      steepness: []
    };
    
    // Parse each line into NDBC format
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
    
    // Find the latest valid data line (check first 20 lines for most recent data)
    const recentLines = lines.slice(0, 20);
    
    for (let i = 0; i < recentLines.length; i++) {
      const line = recentLines[i];
      const parts = line.split(/\s+/);
      
      if (parts.length >= 15) {
        // Current NDBC format: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
        const [year, month, day, hour, minute, windDirection, windSpeed, , waveHeight, wavePeriod, , waveDirection, , , waterTemp] = parts;
        
        // Check if we have valid wave data (this is most important)
        const hasValidWaveHeight = waveHeight !== 'MM' && !isNaN(parseFloat(waveHeight));
        const hasValidWavePeriod = wavePeriod !== 'MM' && !isNaN(parseFloat(wavePeriod));
        const hasValidWindSpeed = windSpeed !== 'MM' && !isNaN(parseFloat(windSpeed));
        
        // Check if we have ANY valid data (be more lenient)
        if (hasValidWaveHeight || hasValidWavePeriod || hasValidWindSpeed) {
          
          // Check if this is recent data (within last 24 hours)
          // Handle both 2-digit (25) and 4-digit (2025) year formats
          const yearNum = parseInt(year);
          const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;
          
          // Create date object in UTC (NDBC data is in UTC)
          const dataDate = new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)));
          const now = new Date();
          const hoursDiff = (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60);
          
          // Be more lenient with time window - buoys might be delayed up to 48 hours
          if (hoursDiff > 48) {
            // Fallback: Check if data is from the same day
            const dataDay = new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)));
            const today = new Date();
            const todayDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            
            if (dataDay.getTime() !== todayDay.getTime()) {
              // Buoy data too old
              continue;
            } else {
              // Using same-day data
            }
          }
          
          const waveHeightNum = parseFloat(waveHeight);
          const wavePeriodNum = parseFloat(wavePeriod);
          // NDBC reports wave height in meters, convert to feet
          const waveHeightInFeet = waveHeightNum * 3.28084; // meters to feet
          
          // Skip unrealistic data (0.05 to 15 feet is reasonable for Lake Superior)
          if (waveHeightInFeet > 15 || waveHeightInFeet < 0.05) {
            // Buoy wave height unrealistic
            continue;
          }
          
          // Handle missing wind data
          const windSpeedNum = windSpeed !== 'MM' ? parseFloat(windSpeed) : 0;
          const windDirectionValue = windDirection !== 'MM' ? windDirection : 'N';
          
          // Convert wind direction from degrees to cardinal direction if needed
          let finalWindDirection = windDirectionValue;
          if (windDirectionValue && !isNaN(parseFloat(windDirectionValue))) {
            // Convert degrees to cardinal direction
            const degrees = parseFloat(windDirectionValue);
            finalWindDirection = getWindDirectionFromDegrees(degrees);
          }
          
          // Create timestamp in UTC consistently
          const timestamp = new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))).toISOString();
          
          // Validate water temperature (Lake Superior is never above 25°C)
          const waterTempC = parseFloat(waterTemp);
          
          if (isNaN(waterTempC)) {
            // Invalid water temperature
            return null;
          }
          
          const finalWaterTempC = Math.min(Math.max(waterTempC, 0), 25); // Clamp between 0-25°C
          
          return {
            timestamp,
            waveHeight: waveHeightInFeet,
            wavePeriod: wavePeriodNum,
            waveDirection: waveDirection || 'N',
            waterTemp: finalWaterTempC,
            windSpeed: windSpeedNum,
            windDirection: finalWindDirection,
            source: `ndbc-${buoyId}`
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('🌊 Error parsing buoy data:', error);
    return null;
  }
};

/**
 * Parse weather station data (wind, temp) from NDBC text format
 */
const parseWeatherStationData = (text: string, stationName: string): { windSpeed: number; windDirection: string; temperature: number | undefined } | null => {
  try {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Find the first data line (starts with 4-digit year)
    const dataLine = lines.find(line => line.match(/^\d{4}\s+\d{2}\s+\d{2}\s+\d{2}\s+\d{2}/));
    
    if (!dataLine) {
              // No valid data line found
      return null;
    }
    
    const parts = dataLine.split(/\s+/);
    
    if (parts.length >= 15) {
      // NDBC format: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
      const windDirectionRaw = parts[5];  // WDIR
      const windSpeedRaw = parts[6];      // WSPD
      const temperatureRaw = parts[13];   // ATMP (air temperature)
      
      // Handle missing data ("MM")
      if (windDirectionRaw === 'MM' || windSpeedRaw === 'MM') {
        // Missing wind data
        return null;
      }
      
      const windSpeed = parseFloat(windSpeedRaw);
      const windDirection = normalizeWindDirection(windDirectionRaw);
      const temperature = temperatureRaw !== 'MM' ? parseFloat(temperatureRaw) : undefined;
      
      // Validate wind data
      if (isNaN(windSpeed) || windSpeed < 0 || windSpeed > 100) {
        // Invalid wind speed
        return null;
      }
      
              // Parsed weather station data
      
      return { 
        windSpeed: windSpeed * 2.23694, // Convert m/s to mph
        windDirection, 
        temperature 
      };
    }
    
            // Insufficient data columns
    return null;
  } catch (error) {
    console.error(`🌊 Error parsing weather station data for ${stationName}:`, error);
    return null;
  }
};

/**
 * Validate spot ID exists in configuration
 */
const validateSpotId = (spotId: string): boolean => {
  // Simple validation - any non-empty string is valid for now
  // We can add more sophisticated validation later if needed
  return typeof spotId === 'string' && spotId.trim().length > 0;
};

/**
 * Validate that we have sufficient data to generate conditions
 */
const validateData = (buoyData: BuoyData[], windData: WindData | null): boolean => {
  return buoyData.length > 0 || windData !== null;
};

/**
 * Aggregate wave data from all sources
 */
interface WaveDataPoint {
  value: number;
  source: string;
  confidence: number;
  timestamp?: string;
}

interface BlendedWaveData {
  avgWaveHeight: number | undefined;
  avgWavePeriod: number | undefined;
  waveDirections: string[];
  waveConfidence: number;
  sources: string[];
  // NOAA-specific wave height ranges when available
  noaaWaveHeight?: {
    min: number;
    max: number;
  };
  debugInfo: {
    method: string;
    reasoning: string;
    conflicts?: string[];
  };
}

const aggregateWaveData = (buoyData: BuoyData[], windData: WindData | null): BlendedWaveData => {
  const waveHeightPoints: WaveDataPoint[] = [];
  const wavePeriodPoints: WaveDataPoint[] = [];
  
  // Collect all wave height data points with source info
  buoyData.forEach(buoy => {
    if (buoy.waveHeight > 0) {
      waveHeightPoints.push({
        value: buoy.waveHeight,
        source: `ndbc-${buoy.source}`,
        confidence: 0.9, // High confidence for buoy data
        timestamp: buoy.timestamp
      });
    }
  });
  
  // Add Windy wave data if available
  if (windData && windData.waveHeight) {
    waveHeightPoints.push({
      value: windData.waveHeight,
      source: 'windy-gfsWave',
      confidence: 0.7, // Medium confidence for model data
      timestamp: new Date().toISOString()
    });
  }
  
  if (windData && windData.wavePeriod) {
    wavePeriodPoints.push({
      value: windData.wavePeriod,
      source: 'windy-gfsWave',
      confidence: 0.7
    });
  }
  
  // Collect wave period data
  buoyData.forEach(buoy => {
    if (buoy.wavePeriod > 0) {
      wavePeriodPoints.push({
        value: buoy.wavePeriod,
        source: `ndbc-${buoy.source}`,
        confidence: 0.9
      });
    }
  });
  
  // Intelligent blending logic
  const blendWaveHeight = (points: WaveDataPoint[]): BlendedWaveData => {
    if (points.length === 0) {
      return {
        avgWaveHeight: undefined,
        avgWavePeriod: undefined,
        waveDirections: [],
        waveConfidence: 0,
        sources: [],
        debugInfo: {
          method: 'no-data',
          reasoning: 'No wave height data available from any source'
        }
      };
    }
    
    if (points.length === 1) {
      return {
        avgWaveHeight: points[0].value,
        avgWavePeriod: undefined, // Will be set separately from wavePeriodPoints
        waveDirections: [],
        waveConfidence: points[0].confidence,
        sources: [points[0].source],
        debugInfo: {
          method: 'single-source',
          reasoning: `Using single source: ${points[0].source}`
        }
      };
    }
    
    // Multiple sources - intelligent blending
    const values = points.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Check for significant conflicts
    const conflicts: string[] = [];
    const maxDiff = Math.max(...values) - Math.min(...values);
    if (maxDiff > 2.0) { // More than 2ft difference
      conflicts.push(`High variance detected: ${maxDiff.toFixed(1)}ft range`);
    }
    
    // Weighted average based on confidence
    const totalWeight = points.reduce((sum, p) => sum + p.confidence, 0);
    const weightedValue = points.reduce((sum, p) => sum + (p.value * p.confidence), 0) / totalWeight;
    
    // Calculate blended confidence
    const avgConfidence = points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
    const variancePenalty = Math.min(stdDev * 0.1, 0.3); // Penalty for high variance
    const finalConfidence = Math.max(avgConfidence - variancePenalty, 0.1);
    
    let method = 'weighted-average';
    let reasoning = `Blended ${points.length} sources with weighted average`;
    
    if (conflicts.length > 0) {
      method = 'weighted-average-with-conflicts';
      reasoning += `. Conflicts detected: ${conflicts.join(', ')}`;
    }
    

    
    return {
      avgWaveHeight: weightedValue,
      avgWavePeriod: undefined, // Will be set separately from wavePeriodPoints
      waveDirections: [],
      waveConfidence: finalConfidence,
      sources: points.map(p => p.source),
      debugInfo: {
        method,
        reasoning,
        conflicts
      }
    };
  };
  
  const blendedWaveHeight = blendWaveHeight(waveHeightPoints);
  
  // Simple average for wave period (less critical)
  const avgWavePeriod = wavePeriodPoints.length > 0 ? 
    wavePeriodPoints.reduce((sum, p) => sum + p.value, 0) / wavePeriodPoints.length : 0;
  
  return {
    avgWaveHeight: blendedWaveHeight.avgWaveHeight,
    avgWavePeriod,
    waveDirections: buoyData.map(b => b.waveDirection),
    waveConfidence: blendedWaveHeight.waveConfidence,
    sources: blendedWaveHeight.sources,
    debugInfo: blendedWaveHeight.debugInfo
  };
};

/**
 * Aggregate wind data from all sources
 */
interface WindDataPoint {
  speed: number;
  direction: string;
  source: string;
  confidence: number;
  timestamp?: string;
}

interface BlendedWindData {
  avgWindSpeed: number;
  windDirection: string;
  windConfidence: number;
  gustSpeed?: number;
  sources: string[];
  debugInfo: {
    method: string;
    reasoning: string;
    conflicts?: string[];
  };
}

const aggregateWindData = (buoyData: BuoyData[], windData: WindData | null): BlendedWindData => {
  const windSpeedPoints: WindDataPoint[] = [];
  
  // Collect all wind speed data points with source info
  buoyData.forEach(buoy => {
    if (buoy.windSpeed > 0) {
      // Convert wind direction from degrees to compass direction if it's a number
      const formattedDirection = typeof buoy.windDirection === 'number' 
        ? getWindDirectionFromDegrees(buoy.windDirection)
        : buoy.windDirection;
      
      windSpeedPoints.push({
        speed: buoy.windSpeed,
        direction: formattedDirection,
        source: `ndbc-${buoy.source}`,
        confidence: 0.9, // High confidence for buoy data
        timestamp: buoy.timestamp
      });
    }
  });
  
  // Add Windy wind data if available
  if (windData && windData.windSpeed > 0) {
    // Convert wind direction from degrees to compass direction if it's a number
    const formattedDirection = typeof windData.windDirection === 'number' 
      ? getWindDirectionFromDegrees(windData.windDirection)
      : windData.windDirection;
    
    windSpeedPoints.push({
      speed: windData.windSpeed,
      direction: formattedDirection,
      source: 'windy-gfs',
      confidence: 0.7, // Medium confidence for model data
      timestamp: new Date().toISOString()
    });
  }
  
  // Intelligent blending logic
  const blendWindSpeed = (points: WindDataPoint[]): BlendedWindData => {
    if (points.length === 0) {
      return {
        avgWindSpeed: 0,
        windDirection: 'N',
        windConfidence: 0.1,
        sources: [],
        debugInfo: {
          method: 'no-data',
          reasoning: 'No wind data available from any source'
        }
      };
    }
    
    if (points.length === 1) {
      return {
        avgWindSpeed: points[0].speed,
        windDirection: points[0].direction,
        windConfidence: points[0].confidence,
        sources: [points[0].source],
        debugInfo: {
          method: 'single-source',
          reasoning: `Using single source: ${points[0].source}`
        }
      };
    }
    
    // Multiple sources - intelligent blending
    const speeds = points.map(p => p.speed);
    const mean = speeds.reduce((sum, v) => sum + v, 0) / speeds.length;
    const variance = speeds.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);
    
    // Check for significant conflicts
    const conflicts: string[] = [];
    const maxDiff = Math.max(...speeds) - Math.min(...speeds);
    if (maxDiff > 15) { // More than 15mph difference
      conflicts.push(`High variance detected: ${maxDiff.toFixed(1)}mph range`);
    }
    
    // Weighted average based on confidence
    const totalWeight = points.reduce((sum, p) => sum + p.confidence, 0);
    const weightedSpeed = points.reduce((sum, p) => sum + (p.speed * p.confidence), 0) / totalWeight;
    
    // Use most common direction or weighted by confidence
    const directions = points.map(p => p.direction);
    const windDirection = getMostCommonDirection(directions);
    
    // Calculate blended confidence
    const avgConfidence = points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
    const variancePenalty = Math.min(stdDev * 0.05, 0.2); // Smaller penalty for wind variance
    const finalConfidence = Math.max(avgConfidence - variancePenalty, 0.1);
    
    let method = 'weighted-average';
    let reasoning = `Blended ${points.length} sources with weighted average`;
    
    if (conflicts.length > 0) {
      method = 'weighted-average-with-conflicts';
      reasoning += `. Conflicts detected: ${conflicts.join(', ')}`;
    }
    

    
    return {
      avgWindSpeed: weightedSpeed,
      windDirection,
      windConfidence: finalConfidence,
      gustSpeed: windData?.gustSpeed,
      sources: points.map(p => p.source),
      debugInfo: {
        method,
        reasoning,
        conflicts
      }
    };
  };
  
  const blendedWind = blendWindSpeed(windSpeedPoints);
  
  return {
    avgWindSpeed: blendedWind.avgWindSpeed,
    windDirection: blendedWind.windDirection,
    windConfidence: blendedWind.windConfidence,
    gustSpeed: blendedWind.gustSpeed,
    sources: blendedWind.sources,
    debugInfo: blendedWind.debugInfo
  };
};

/**
 * Enhanced water temperature aggregation with location-specific prioritization
 */
const aggregateWaterData = (buoyData: BuoyData[], waterData: { waterLevel: WaterLevelData | null; waterTemp: number | null }, latitude?: number, longitude?: number) => {
  // Separate wave buoys (which have water temp) from wind buoys
  const waveBuoys = buoyData.filter(b => b.waterTemp > 0 && b.source.includes('ndbc'));
  const windBuoys = buoyData.filter(b => b.source.includes('weather'));
  
  // Water temp aggregation
  
  let finalWaterTempF: number | undefined = undefined;
  let waterTempSource = 'none';
  let waterTempSources: string[] = [];
  
  // Priority 1: Location-specific water temperature from nearest wave buoys
  if (waveBuoys.length > 0) {
    // Sort by distance for proximity-based selection
    const sortedWaveBuoys = waveBuoys.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    
    // Use the nearest wave buoy's water temperature
    const nearestWaveBuoy = sortedWaveBuoys[0];
    const waterTempC = nearestWaveBuoy.waterTemp;
    const waterTempF = (waterTempC * 9/5) + 32;
    
    if (waterTempF >= 30 && waterTempF <= 85) { // Realistic Lake Superior range
      finalWaterTempF = waterTempF;
      waterTempSource = 'wave-buoy';
      waterTempSources = [nearestWaveBuoy.source];
      // Using location-specific water temp
    }
  }
  
  // Priority 2: NOAA water temperature as fallback (if no wave buoy data)
  if (finalWaterTempF === undefined && waterData.waterTemp !== null && waterData.waterTemp >= 30 && waterData.waterTemp <= 85) {
    finalWaterTempF = waterData.waterTemp;
    waterTempSource = 'noaa-station';
    waterTempSources = ['noaa-water-temp'];
    // Using NOAA water temp fallback
  }
  
  // Priority 3: Wind buoy temperature as last resort (less accurate)
  if (finalWaterTempF === undefined && windBuoys.length > 0) {
    const windBuoyTemps = windBuoys.filter(b => b.waterTemp > 0).map(b => b.waterTemp);
    if (windBuoyTemps.length > 0) {
      const avgTempC = windBuoyTemps.reduce((sum, t) => sum + t, 0) / windBuoyTemps.length;
      const windBuoyTempF = (avgTempC * 9/5) + 32;
      
      if (windBuoyTempF >= 30 && windBuoyTempF <= 85) {
        finalWaterTempF = windBuoyTempF;
        waterTempSource = 'wind-buoy';
        waterTempSources = windBuoys.filter(b => b.waterTemp > 0).map(b => b.source);
        // Using wind buoy water temp
      }
    }
  }
  
  // If no real water temperature data available, return undefined (N/A)
  if (finalWaterTempF === undefined) {
    // No water temperature data available
  }
  
  return {
    waterTempF: finalWaterTempF, // Can be undefined for N/A
    waterTempSource: waterTempSource,
    sources: waterTempSources
  };
};

/**
 * Generate surf report with likelihood, notes, and summary
 */
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
  
  // Calculate surf likelihood with wave height range
  const waveHeightRange = { min: Math.max(0, (avgWaveHeight || 0) - 0.3), max: (avgWaveHeight || 0) + 0.3 };
  const surfLikelihood = calculateSurfLikelihood(waveHeightRange, avgWavePeriod || 0, avgWindSpeed, windDirection, spotId);
  
  // Generate notes
  const notes: string[] = [];
  
  // Check for pressure drops (seiche risk)
  if (detectPressureDrop(buoyData)) {
    notes.push('Seiche risk — rapid pressure drop');
  }
  
  // Add wind-related notes
  const windNotes = generateWindNotes(avgWindSpeed, gustSpeed);
  notes.push(...windNotes);
  
  // Add wind direction notes using our new sophisticated logic
  if (windDirection) {
    const windNotes = generateWindDirectionNotes(spotId, windDirection, avgWindSpeed);
    notes.push(...windNotes);
  }
  
  // Generate comprehensive surf report
  const surfReport = generateUserSummary(
    { min: Math.max(0, (avgWaveHeight || 0) - 0.3), max: (avgWaveHeight || 0) + 0.3, unit: 'ft' },
    avgWavePeriod || 0,
    avgWindSpeed,
    windDirection,
    waterTempF || 0,
    surfLikelihood,
    notes
  );
  
  return {
    surfLikelihood,
    surfReport,
    notes
  };
};

/**
 * Aggregate all data sources into intuitive conditions
 */
const aggregateAllData = (
  buoyData: BuoyData[],
  windData: WindData | null,
  waterData: { waterLevel: WaterLevelData | null; waterTemp: number | null },
  spotId: string = 'duluth',
  latitude?: number,
  longitude?: number
): AggregatedConditions => {
  

  
  // Validate inputs
  if (!validateSpotId(spotId)) {
    console.warn(`🌊 Unknown spot ID: ${spotId}, using default configuration`);
  }
  
  if (!validateData(buoyData, windData)) {
    console.warn('🌊 No valid data sources available');
  }
  
  // Aggregate data from all sources with intelligent blending
  const waveData = aggregateWaveData(buoyData, windData);

  
  const windDataAggregated = aggregateWindData(buoyData, windData);

  
  const waterDataAggregated = aggregateWaterData(buoyData, waterData, latitude, longitude);

  
  // Generate surf report
  const surfReport = generateSurfReport(
    waveData,
    windDataAggregated,
    { waterTempF: waterDataAggregated.waterTempF },
    spotId,
    buoyData
  );
  
  // Calculate overall confidence based on all sources (not currently used)
  
  // Generate human-readable descriptions
  const conditions = generateConditionsDescription(
    waveData.avgWaveHeight || 0, 
    windDataAggregated.avgWindSpeed, 
    windDataAggregated.windDirection, 
    waterDataAggregated.waterTempF || 0
  );
  
  const recommendations = generateSurfRecommendations(
    waveData.avgWaveHeight || 0, 
    windDataAggregated.avgWindSpeed, 
    windDataAggregated.windDirection, 
    waterDataAggregated.waterTempF || 0
  );
  
  return {
    waveHeight: (() => {
      // Create more realistic ranges based on data source confidence
      // For NOAA data, use smaller ranges; for buoy data, use larger ranges
      const baseHeight = waveData.avgWaveHeight || 0;
      const range = waveData.waveConfidence > 0.8 ? 0.4 : 0.6; // Slightly larger ranges for more realistic display
      const min = Math.max(0, Math.round((baseHeight - range) * 10) / 10);
      const max = Math.round((baseHeight + range) * 10) / 10;
      
      return {
        min,
        max,
        unit: 'ft',
        sources: waveData.sources,
        confidence: waveData.waveConfidence
      };
    })(),
    wind: {
      speed: Math.round(windDataAggregated.avgWindSpeed),
      direction: windDataAggregated.windDirection,
      unit: 'mph',
      sources: windDataAggregated.sources,
      confidence: windDataAggregated.windConfidence
    },
    swell: [{
      height: waveData.avgWaveHeight || 0,
      period: waveData.avgWavePeriod,
      direction: windDataAggregated.windDirection,
      sources: waveData.sources
    }],
    waterTemp: waterDataAggregated.waterTempF !== undefined ? {
      value: waterDataAggregated.waterTempF,
      unit: 'F',
      sources: waterDataAggregated.sources
    } : undefined,
    rating: calculateSurfRating(waveData.avgWaveHeight || 0, windDataAggregated.avgWindSpeed, windDataAggregated.windDirection, spotId),
    conditions,
    recommendations,
    surfLikelihood: surfReport.surfLikelihood,
    surfReport: surfReport.surfReport,
    notes: surfReport.notes
  };
};

/**
 * Calculate surf likelihood based on Lake Superior conditions
 */

const calculateSurfLikelihood = (
  waveHeight: number | { min: number; max: number },
  wavePeriod: number,
  windSpeed: number,
  windDirection?: string,
  spotId: string = 'duluth'
): 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out' => {
  // Lake Superior surf conditions with wind direction logic
  
  // Handle both single values and ranges
  let minWaveHeight: number;
  let avgWaveHeight: number;
  
  if (typeof waveHeight === 'number') {
    minWaveHeight = waveHeight;
    avgWaveHeight = waveHeight;
  } else {
    minWaveHeight = Math.min(waveHeight.min, waveHeight.max);
    avgWaveHeight = (waveHeight.min + waveHeight.max) / 2;
  }
  
  // Conservative Flat gate: If minimum wave height < 0.8 ft or period < 3s, return Flat
  if (minWaveHeight < 0.8 || wavePeriod < 3) {
    return 'Flat';
  }
  
  // Convert wind direction to degrees for analysis
  const windDegrees = convertWindDirectionToDegrees(windDirection || 'N');
  
  // Check if swell directions are favorable for this spot
  const hasFavorableSwell = checkSwellDirections(spotId, windDegrees);
  
  // If no favorable swell, return Flat regardless of local winds
  if (!hasFavorableSwell) {
    return 'Flat';
  }
  
  // Swell exists, now check local wind quality
  const localWindQuality = checkLocalWindQuality(spotId, windDegrees, windSpeed);
  
  // Apply wave size/period thresholds with wind quality adjustment
  let baseRating: 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out';
  
  // Maybe Surf: 1.0–1.5 ft with period ≥ 4s and wind ≤ 18 mph
  if (avgWaveHeight >= 1.0 && avgWaveHeight < 1.6 && wavePeriod >= 4 && windSpeed <= 18) {
    baseRating = 'Maybe Surf';
  }
  // Good: 1.6–3.0 ft with period ≥ 4s and wind ≤ 15 mph
  else if (avgWaveHeight >= 1.6 && avgWaveHeight < 3.0 && wavePeriod >= 4 && windSpeed <= 15) {
    baseRating = 'Good';
  }
  // Firing: ≥ 3.0 ft & ≥ 6s with wind ≤ 18 mph, or ≥ 4.0 ft & ≥ 5s with wind ≤ 18 mph
  else if ((avgWaveHeight >= 3.0 && wavePeriod >= 6 && windSpeed <= 18) ||
           (avgWaveHeight >= 4.0 && wavePeriod >= 5 && windSpeed <= 18)) {
    baseRating = 'Firing';
  }
  // Otherwise return Blown Out
  else {
    return 'Blown Out';
  }
  
  // Apply local wind quality adjustment
  return adjustRatingForLocalWinds(baseRating, localWindQuality);
};

// Wind direction logic moved to surfConfig.ts

/**
 * Detect pressure drops for seiche risk
 */
const detectPressureDrop = (buoyData: BuoyData[]): boolean => {
  if (buoyData.length < 2) return false;
  
  // Filter for weather stations that might have pressure data
  const weatherStations = buoyData.filter(b => 
    b.source.includes('weather') || 
    b.source.includes('KGNA') || 
    b.source.includes('DULM5')
  );
  
  if (weatherStations.length < 2) return false;
  
  // Sort by timestamp to get recent data (not currently used)
  
  // For now, implement a basic check
  // In the future, we could enhance parseBuoyData to extract pressure values
  // and track pressure changes over time
  
  // If we have multiple recent readings, we could analyze pressure trends
  // For now, return false since we don't have pressure data parsed from NDBC
  // TODO: Enhance parseBuoyData to extract pressure values from NDBC text format
  
  return false;
};

/**
 * Generate wind-related notes
 */
const generateWindNotes = (windSpeed: number, gustSpeed?: number): string[] => {
  const notes: string[] = [];
  
  if (windSpeed > 15) {
    notes.push('Strong wind — may cause chop');
  }
  
  if (gustSpeed && gustSpeed > 25) {
    notes.push('Gusts > 25 mph');
  }
  
  return notes;
};

/**
 * Generate human-readable surf summary using actual conditions data
 */
const generateUserSummary = (
  waveHeight: { min: number; max: number; unit: string },
  wavePeriod: number,
  _windSpeed: number, // Prefixed with underscore to indicate intentionally unused
  windDirection: string,
  _waterTemp: number, // Prefixed with underscore to indicate intentionally unused
  surfLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out',
  _notes: string[] // Prefixed with underscore to indicate intentionally unused
): string => {
  // Generate dynamic summaries based on actual conditions
  switch (surfLikelihood) {
    case 'Flat':
      if (waveHeight.max < 0.5) {
        return 'Lake Superior is calm today. No surfable waves expected.';
      } else {
        return `Small waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds. Conditions may improve later.`;
      }
    case 'Maybe Surf':
      if (wavePeriod > 0) {
        return `Small surfable waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) @ ${wavePeriod}s. ${windDirection} winds.`;
      } else {
        return `Small surfable waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds.`;
      }
    case 'Good':
      if (wavePeriod > 0) {
        return `Good waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) @ ${wavePeriod}s. ${windDirection} winds.`;
      } else {
        return `Good waves (${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft) with ${windDirection} winds.`;
      }
    case 'Firing':
      if (wavePeriod > 0) {
        if (waveHeight.max >= 4.0) {
          return `Epic gale conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves @ ${wavePeriod}s. ${windDirection} winds.`;
        } else {
          return `Epic conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves @ ${wavePeriod}s. ${windDirection} winds.`;
        }
      } else {
        if (waveHeight.max >= 4.0) {
          return `Epic gale conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves with ${windDirection} winds.`;
        } else {
          return `Epic conditions! ${waveHeight.min.toFixed(1)}-${waveHeight.max.toFixed(1)}ft waves with ${windDirection} winds.`;
        }
      }
    case 'Blown Out':
      return `Strong ${windDirection} winds (${_windSpeed}mph) - conditions are blown out. Check back when wind drops.`;
    default:
      return 'Check conditions before heading out.';
  }
};

/**
 * Generate human-readable conditions description
 */
const generateConditionsDescription = (
  waveHeight: number,
  windSpeed: number,
  windDirection: string,
  waterTemp: number
): string => {
  if (waveHeight < 0.5) {
    return "Flat conditions - no waves today. Lake Superior is calm.";
  }
  
  let description = "";
  
  // Wave description
  if (waveHeight < 1) description += "Small waves ";
  else if (waveHeight < 2) description += "Moderate waves ";
  else if (waveHeight < 3) description += "Good waves ";
  else if (waveHeight < 5) description += "Big waves ";
  else description += "Very big waves ";
  
  description += `(${waveHeight.toFixed(1)}ft)`;
  
  // Wind description
  if (windSpeed < 5) description += " with light winds";
  else if (windSpeed < 10) description += " with light breeze";
  else if (windSpeed < 15) description += " with moderate winds";
  else if (windSpeed < 20) description += " with strong winds";
  else description += " with very strong winds";
  
  description += ` from the ${windDirection}`;
  
  // Water temp
  const waterTempF = (waterTemp * 9/5) + 32;
  description += `. Water temperature ${Math.round(waterTempF)}°F`;
  
  return description;
};

/**
 * Generate surf recommendations
 */
const generateSurfRecommendations = (
  waveHeight: number,
  windSpeed: number,
  _windDirection: string, // Prefixed with underscore to indicate intentionally unused
  waterTemp: number
): string[] => {
  const recommendations: string[] = [];
  
  if (waveHeight < 0.5) {
    recommendations.push("Lake Superior is flat today - no surfable waves");
    recommendations.push("Check back later when wind picks up");
  } else if (waveHeight < 1) {
    recommendations.push("Small waves - good for beginners");
    recommendations.push("Bring a longboard for easier catching");
  } else if (waveHeight < 2) {
    recommendations.push("Moderate waves - good for all skill levels");
    recommendations.push("Check wind direction for best spots");
  } else if (waveHeight < 3) {
    recommendations.push("Good waves - experienced surfers will enjoy");
    recommendations.push("Watch for changing conditions");
  } else {
    recommendations.push("Big waves - experienced surfers only");
    recommendations.push("Check safety conditions before paddling out");
  }
  
  // Wind recommendations
  if (windSpeed > 20) {
    recommendations.push("Strong winds - consider wind direction for spot selection");
  }
  
  // Water temp recommendations
  const waterTempF = (waterTemp * 9/5) + 32;
  if (waterTempF < 45) {
    recommendations.push("Cold water - wear proper wetsuit");
  }
  
  return recommendations;
};

/**
 * Calculate surf rating (1-10)
 */
const calculateSurfRating = (waveHeight: number, windSpeed: number, windDirection: string, spotId: string = 'duluth'): number => {
  let rating = 1;
  
  // Base rating on wave height
  if (waveHeight > 3) rating = 8;
  else if (waveHeight > 2) rating = 6;
  else if (waveHeight > 1) rating = 4;
  else if (waveHeight > 0.5) rating = 2;
  else rating = 1;
  
  // Check wind direction using our new sophisticated logic
  if (windDirection) {
    const isFavorable = isFavorableWindDirection(spotId, windDirection, windSpeed);
    if (!isFavorable) {
      rating = Math.max(1, rating - 3); // Penalty for unfavorable winds
    }
  }
  
  // Adjust for wind speed
  if (windSpeed > 20) rating = Math.max(1, rating - 2);
  else if (windSpeed > 15) rating = Math.max(1, rating - 1);
  
  return rating;
};

/**
 * Calculate confidence based on data consistency
 */
const calculateConfidence = (values: number[]): number => {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0.5;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Higher confidence for lower standard deviation
  return Math.max(0.1, Math.min(1, 1 - (stdDev / mean)));
};

/**
 * Get most common wind direction
 */
const getMostCommonDirection = (directions: string[]): string => {
  if (directions.length === 0) return 'N';
  
  const counts: { [key: string]: number } = {};
  directions.forEach(dir => {
    counts[dir] = (counts[dir] || 0) + 1;
  });
  
  return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
};



// Helper functions
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getNearestWaterLevelStation = (spotLat: number, spotLon: number) => {
  let nearest = WATER_LEVEL_STATIONS.DULUTH;
  let minDistance = Infinity;
  
  Object.values(WATER_LEVEL_STATIONS).forEach(station => {
    const distance = calculateDistance(spotLat, spotLon, station.lat, station.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  });
  
  return nearest;
};

// Removed unused exports to clean up the API

// Legacy functions for backward compatibility
// Removed unused legacy function

// Removed unused legacy function

// Removed unused legacy function

// Removed unused legacy function

// Removed unused legacy function 

/**
 * Fetch forecast data from Windy API for specific time periods
 */
export const fetchWindyForecastData = async (latitude: number, longitude: number, hours: number = 168): Promise<WindData[] | null> => {
  try {
    const WINDY_API_KEY = process.env.EXPO_PUBLIC_WINDY_API_KEY;
    
    if (!WINDY_API_KEY) {
      console.warn('🌊 Windy API key not found. Set EXPO_PUBLIC_WINDY_API_KEY in your environment variables.');
      return null;
    }
    
    // Add debouncing to prevent rate limiting
    const lastCallTime = (globalThis as any).lastWindyCall || 0;
    const timeSinceLastCall = Date.now() - lastCallTime;
    const minInterval = 2000; // 2 seconds between forecast calls to prevent rate limiting
    
    if (timeSinceLastCall < minInterval) {
      console.log('⏳ Windy API rate limiting - waiting...');
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
    }
    
    (globalThis as any).lastWindyCall = Date.now();
    
    const url = WINDY_API_BASE;
    
    // Set start date to current time and fetch 7 days of forecast
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (hours * 60 * 60 * 1000));
    
    console.log(`🌊 Windy forecast time range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Make two separate requests: one for wind data, one for wave data
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for forecast data
    
    const [windResponse, waveResponse] = await Promise.allSettled([
      // Request 1: Wind forecast data using gfs model
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: latitude,
          lon: longitude,
          model: 'gfs',
          parameters: ['wind', 'temp', 'pressure'],
          levels: ['surface'],
          key: WINDY_API_KEY
        }),
        signal: controller.signal
      }),
      // Request 2: Wave forecast data using gfsWave model
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: latitude,
          lon: longitude,
          model: 'gfsWave',
          parameters: ['waves'],
          levels: ['surface'],
          key: WINDY_API_KEY
        }),
        signal: controller.signal
      })
    ]);
    
    clearTimeout(timeoutId);
    
    console.log(`🌊 Windy API responses - Wind: ${windResponse.status}, Wave: ${waveResponse.status}`);
    
    // Process wind forecast data
    let windForecastData = null;
    if (windResponse.status === 'fulfilled' && windResponse.value.ok) {
      const windJson = await windResponse.value.json();

      if (windJson.ts && windJson['wind_u-surface'] && windJson['wind_v-surface']) {
        windForecastData = {
          timestamps: windJson.ts,
          windU: windJson['wind_u-surface'],
          windV: windJson['wind_v-surface'],
          temperature: windJson['temp-surface'] || [],
          pressure: windJson['pressure-surface'] || []
        };

      }
    } else {
      const status = windResponse.status === 'rejected' ? windResponse.reason : windResponse.value?.status;
      if (status === 429) {

        return null; // Return null so we can use NOAA fallback
      } else {
        console.error('🌊 Windy wind forecast request failed:', status);
      }
    }
    
    // Process wave forecast data
    let waveForecastData = null;
    if (waveResponse.status === 'fulfilled' && waveResponse.value.ok) {
      const waveJson = await waveResponse.value.json();

      if (waveJson.ts && waveJson['waves_height-surface']) {
        waveForecastData = {
          timestamps: waveJson.ts,
          waveHeight: waveJson['waves_height-surface'],
          wavePeriod: waveJson['waves_period-surface'] || [],
          waveDirection: waveJson['waves_direction-surface'] || []
        };
        console.log(`🌊 Windy wave data points: ${waveJson.ts.length}`);
        console.log(`🌊 Windy wave data sample:`, {
          firstTimestamp: waveJson.ts[0],
          firstWaveHeight: waveJson['waves_height-surface'][0],
          firstWavePeriod: waveJson['waves_period-surface']?.[0],
          waveDataLength: waveJson['waves_height-surface']?.length || 0,
          waveDataKeys: Object.keys(waveJson).filter(k => k.includes('waves'))
        });
      }
    } else {
      const status = waveResponse.status === 'rejected' ? waveResponse.reason : waveResponse.value?.status;
      if (status === 429) {
        console.log('🌊 Windy wave forecast API rate limited - will use NOAA fallback');
        return null; // Return null so we can use NOAA fallback
      } else {
        console.error('🌊 Windy wave forecast request failed:', status);
      }
    }
    
    // Generate forecast data using exact timestamps from Windy API
    const forecastData: WindData[] = [];
    
    // Use timestamps from wind data if available, otherwise from wave data
    const timestamps = windForecastData?.timestamps || waveForecastData?.timestamps || [];
    
    console.log(`🌊 Windy timestamps array length: ${timestamps.length}`);
    if (timestamps.length > 0) {
      console.log(`🌊 First timestamp: ${timestamps[0]} -> ${new Date(timestamps[0] * 1000).toISOString()}`);
      console.log(`🌊 Last timestamp: ${timestamps[timestamps.length - 1]} -> ${new Date(timestamps[timestamps.length - 1] * 1000).toISOString()}`);
    }
    
    if (timestamps.length === 0) {
      console.log('🌊 No timestamps available from Windy API');
      return null;
    }
    
    // Process each timestamp from the API
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      
      // Validate timestamp - skip if it's clearly invalid (too far in future/past)
      if (timestamp < 1000000000 || timestamp > 2000000000) {
        console.log(`🌊 Skipping invalid Windy timestamp ${i}: ${timestamp} (expected range: 1000000000-2000000000)`);
        continue;
      }
      
      const forecastTime = new Date(timestamp * 1000); // Convert Unix timestamp to Date
      
      // Skip if too far in the past (more than 6 hours ago) or too far in the future
      const now = new Date();
      const hoursDiff = (forecastTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Debug logging for first few timestamps
      if (i < 5) {
        console.log(`🌊 Windy timestamp ${i}: ${forecastTime.toISOString()}, hours diff: ${hoursDiff.toFixed(1)}, endDate: ${endDate.toISOString()}`);
      }
      
      if (hoursDiff < -6 || forecastTime > endDate) {
        if (i < 5) {
          console.log(`🌊 Skipping Windy timestamp ${i}: hours diff ${hoursDiff.toFixed(1)} < -6 OR forecastTime ${forecastTime.toISOString()} > endDate ${endDate.toISOString()}`);
        }
        continue;
      }
      
      // Get wind data for this time point
      let windSpeed = 0;
      let windDirection = 'N';
      let temperature = 50;
      let pressure = 1013;
      
      if (windForecastData && windForecastData.windU[i] !== undefined && windForecastData.windV[i] !== undefined) {
        const windU = windForecastData.windU[i] || 0;
        const windV = windForecastData.windV[i] || 0;
        windSpeed = Math.sqrt(windU * windU + windV * windV) * 2.23694; // Convert m/s to mph
        const windDegrees = Math.atan2(windV, windU) * 180 / Math.PI;
        windDirection = getWindDirectionFromDegrees(windDegrees);
        temperature = windForecastData.temperature[i] || 50;
        pressure = windForecastData.pressure[i] || 1013;
        
        // Debug logging for first few data points
        if (i < 3) {
          console.log(`🌊 Windy wind data ${i}: U=${windU}, V=${windV}, speed=${windSpeed.toFixed(1)}mph, dir=${windDirection}`);
        }
      }
      
      // Get wave data for this time point
      let waveHeight = 0;
      let wavePeriod = 0;
      let waveDirection = 'N';
      
      if (waveForecastData && waveForecastData.waveHeight[i] !== undefined) {
        waveHeight = (waveForecastData.waveHeight[i] || 0) * 3.28084; // Convert meters to feet
        wavePeriod = Math.max(2, Math.min(8, waveForecastData.wavePeriod[i] || 4)); // Realistic wave period
        waveDirection = waveForecastData.waveDirection[i] ? getWindDirectionFromDegrees(waveForecastData.waveDirection[i]) : 'N';
        
        // Debug logging for first few data points
        if (i < 3) {
          console.log(`🌊 Windy wave data ${i}: height=${waveHeight.toFixed(1)}ft, period=${wavePeriod}s, dir=${waveDirection}`);
        }
      }
      
      forecastData.push({
        windSpeed,
        windDirection,
        temperature,
        pressure,
        waveHeight,
        wavePeriod,
        waveDirection,
        source: 'windy-forecast',
        timestamp: forecastTime.toISOString()
      });
    }
    
    console.log(`🌊 Generated ${forecastData.length} Windy forecast points`);
    return forecastData;
    
  } catch (error) {
    console.error('🌊 Error fetching Windy forecast data:', error);
    return null;
  }
};

/**
 * Fetch and aggregate forecast data from ALL sources (Windy and NOAA)
 */
export const fetchAllGreatLakesForecastData = async (
  spotId: string,
  latitude: number,
  longitude: number,
  hours: number = 168  // 7 days (168 hours) for proper weekly forecast
): Promise<AggregatedConditions[] | null> => {
  try {
    console.log(`🌊 Fetching all Great Lakes forecast data for spot: ${spotId} at coordinates: ${latitude}, ${longitude} (${hours} hours)`);
    
    // Spot configuration handled by our new sophisticated wind logic
    
    // Set start date to current time for real-time forecasts
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (hours * 60 * 60 * 1000));
    
    console.log(`🌊 Forecast time range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Fetch forecast data from all sources including buoy data for trends
    const [
      windyForecastData,
      noaaForecastData,
      buoyData
    ] = await Promise.allSettled([
      fetchWindyForecastData(latitude, longitude, hours),
      fetchNOAAForecastData(latitude, longitude, hours),
      fetchAllBuoyData(latitude, longitude) // Include buoy data for trend analysis
    ]);
    
    console.log(`🌊 Forecast data sources status - Windy: ${windyForecastData.status}, NOAA: ${noaaForecastData.status}, Buoy: ${buoyData.status}`);
    
    // Extract successful results
    const successfulWindyData = windyForecastData.status === 'fulfilled' ? windyForecastData.value : [];
    const successfulNOAAData = noaaForecastData.status === 'fulfilled' ? noaaForecastData.value : [];
    const successfulBuoyData = buoyData.status === 'fulfilled' ? buoyData.value : [];
    
    console.log(`🌊 Data sources results - Windy: ${successfulWindyData?.length || 0} points, NOAA: ${successfulNOAAData?.length || 0} points, Buoy: ${successfulBuoyData?.length || 0} points`);
    
    // Log errors with context
    if (windyForecastData.status === 'rejected') {
      const error = windyForecastData.reason;
      if (error && error.toString().includes('429')) {
        console.log('🌊 Windy forecast API rate limited - using NOAA data only');
      } else {
        console.error('🌊 Windy forecast data error:', error);
      }
    }
    if (noaaForecastData.status === 'rejected') {
      console.error('🌊 NOAA forecast data error:', noaaForecastData.reason);
    }
    if (buoyData.status === 'rejected') {
      console.error('🌊 Buoy data error:', buoyData.reason);
    }
    
    // Combine all forecast data sources
    const allForecastData = [
      ...(successfulWindyData || []),
      ...(successfulNOAAData || [])
    ];
    
    console.log(`🌊 Combined forecast data: ${allForecastData.length} total points`);
    
    if (allForecastData.length === 0) {
      console.log('❌ No forecast data available from any source');
      return null;
    }
    
    // Check forecast coverage and provide user feedback
    const totalHours = allForecastData.length * 3;
    const daysCovered = Math.ceil(totalHours / 24);
    
    if (daysCovered < 7) {
      console.log(`🌊 Forecast coverage: ${daysCovered} days (${totalHours} hours)`);
      console.log('🌊 This is normal - NOAA Marine API typically provides 2-4 days of detailed forecasts');
      console.log('🌊 Windy API can extend coverage when not rate-limited');
    } else {
      console.log(`🌊 Full 7-day forecast coverage: ${daysCovered} days (${totalHours} hours)`);
    }
    
    // Group forecast data by time periods (using exact timestamps from APIs)
    const timeGroups = groupForecastDataByTime(allForecastData);
    
    console.log(`🌊 Time groups created: ${timeGroups.size} unique time periods`);
    
    // Aggregate each time period
    const aggregatedForecast: AggregatedConditions[] = [];
    
    for (const [timestamp, dataGroup] of timeGroups) {
      console.log(`🌊 Aggregating time group: ${timestamp} with ${dataGroup.length} data points`);
      const aggregated = aggregateForecastDataWithBuoyContext(dataGroup, spotId, latitude, longitude, successfulBuoyData);
      if (aggregated) {
        aggregatedForecast.push(aggregated);
      }
    }
    
    // Sort by timestamp
    aggregatedForecast.sort((a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime());
    
    console.log(`🌊 Generated ${aggregatedForecast.length} aggregated forecast points with buoy data integration`);
    return aggregatedForecast;
    
  } catch (error) {
    console.error('🌊 Error fetching all Great Lakes forecast data:', error);
    return null;
  }
};

// Custom forecast generation functions removed - now using direct API data consumption only

/**
 * Group forecast data by time periods
 */
const groupForecastDataByTime = (forecastData: WindData[]): Map<string, WindData[]> => {
  const timeGroups = new Map<string, WindData[]>();
  
  for (const data of forecastData) {
    if (!data.timestamp) continue;
    
    // Use individual timestamps for forecast periods (no grouping)
    // This ensures each forecast period is displayed separately
    const timeKey = data.timestamp;
    
    if (!timeGroups.has(timeKey)) {
      timeGroups.set(timeKey, []);
    }
    timeGroups.get(timeKey)!.push(data);
  }
  
  // Each forecast period is its own time group
  return timeGroups;
};

/**
 * Aggregate forecast data for a specific time period with buoy data context
 */
const aggregateForecastDataWithBuoyContext = (
  dataGroup: WindData[], 
  spotId: string, 
  latitude: number, 
  longitude: number,
  buoyData: BuoyData[]
): AggregatedConditions | null => {
  try {
    // Separate data by type - include all data for source tracking, even if values are 0
    const windData = dataGroup.filter(d => d.windSpeed !== undefined);
    const waveData = dataGroup.filter(d => d.waveHeight !== undefined);
    const tempData = dataGroup.filter(d => d.temperature !== undefined);
    
    // Aggregate wind data
    let avgWindSpeed = 0;
    let windDirection = 'N';
    let windConfidence = 0;
    let windSources: string[] = [];
    
    if (windData.length > 0) {
      // Calculate average wind speed (including 0 values)
      avgWindSpeed = windData.reduce((sum, d) => sum + (d.windSpeed || 0), 0) / windData.length;
      windDirection = getMostCommonDirection(windData.map(d => d.windDirection));
      windConfidence = calculateConfidence(windData.map(d => d.windSpeed || 0));
      windSources = [...new Set(windData.map(d => d.source))];
    } else {
      // If no wind data, still collect sources from all data in group
      windSources = [...new Set(dataGroup.map(d => d.source))];
    }
    
    // Aggregate wave data
    let avgWaveHeight = 0;
    let avgWavePeriod: number | undefined = 0;
    let waveConfidence = 0;
    let waveSources: string[] = [];
    
    if (waveData.length > 0) {
      // Calculate average wave height (including 0 values)
      avgWaveHeight = waveData.reduce((sum, d) => sum + (d.waveHeight || 0), 0) / waveData.length;
      avgWavePeriod = waveData.reduce((sum, d) => sum + (d.wavePeriod || 0), 0) / waveData.length;
      waveConfidence = calculateConfidence(waveData.map(d => d.waveHeight || 0));
      waveSources = [...new Set(waveData.map(d => d.source))];
    } else {
      // If no wave data, still collect sources from all data in group
      waveSources = [...new Set(dataGroup.map(d => d.source))];
    }
    
    // Only use wave period if we have real data (no defaults)
    if (avgWavePeriod < 2) {
      avgWavePeriod = undefined; // No default - show N/A
    }
    
    // Aggregate temperature data
    let avgTemperature = 0;
    let tempSources: string[] = [];
    if (tempData.length > 0) {
      avgTemperature = tempData.reduce((sum, d) => sum + (d.temperature || 0), 0) / tempData.length;
      tempSources = [...new Set(tempData.map(d => d.source))];
    } else {
      // If no temp data, still collect sources from all data in group
      tempSources = [...new Set(dataGroup.map(d => d.source))];
    }
    
    // Integrate buoy data context for enhanced forecasting
    // Buoy data context will be added to notes later
    
    // Calculate surf likelihood with wave height range
    const waveHeightRange = { min: Math.max(0, avgWaveHeight - 0.3), max: avgWaveHeight + 0.3 };
    const surfLikelihood = calculateSurfLikelihood(
      waveHeightRange, 
      avgWavePeriod || 0, 
      avgWindSpeed, 
      windDirection, 
      spotId
    );
    
    // Generate surf report with properly rounded wave height ranges
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
    
    // Generate notes
    const notes: string[] = [];
    
    // Add wind-related notes
    if (avgWindSpeed > 15) {
      notes.push('Strong wind — may cause chop');
    }
    if (avgWindSpeed > 25) {
      notes.push('High winds — challenging conditions');
    }
    
    // Add wave-related notes
    if (avgWaveHeight < 0.5) {
      notes.push('Very small waves — minimal surf');
    } else if (avgWaveHeight > 3) {
      notes.push('Large waves — experienced surfers only');
    }
    
    // Add period-related notes
    if (avgWavePeriod && avgWavePeriod < 4) {
      notes.push('Short period — choppy conditions');
    } else if (avgWavePeriod && avgWavePeriod > 8) {
      notes.push('Long period — clean waves');
    }
    
    // Add wind direction notes using our new sophisticated logic
    if (windDirection) {
      const windNotes = generateWindDirectionNotes(spotId, windDirection, avgWindSpeed);
      notes.push(...windNotes);
    }
    
    // Add buoy context to notes if available
    if (buoyData && buoyData.length > 0) {
      // Get current buoy conditions for context
      const currentBuoyConditions = buoyData
        .filter(b => b.waveHeight > 0 || b.windSpeed > 0)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        .slice(0, 2); // Top 2 closest buoys
      
      if (currentBuoyConditions.length > 0) {
        const avgBuoyWaveHeight = currentBuoyConditions.reduce((sum, b) => sum + (b.waveHeight || 0), 0) / currentBuoyConditions.length;
        const avgBuoyWindSpeed = currentBuoyConditions.reduce((sum, b) => sum + (b.windSpeed || 0), 0) / currentBuoyConditions.length;
        
        const buoyContext = `Buoy context: ${avgBuoyWaveHeight.toFixed(1)}ft waves, ${avgBuoyWindSpeed.toFixed(1)}mph wind`;
        notes.push(buoyContext);
        console.log(`🌊 ${buoyContext}`);
      }
    }
    
    // Round all values to prevent excessive decimals
    avgWindSpeed = Math.round(avgWindSpeed * 10) / 10;
    avgWaveHeight = Math.round(avgWaveHeight * 10) / 10;
    if (avgWavePeriod !== undefined) {
      avgWavePeriod = Math.round(avgWavePeriod * 10) / 10;
    }
    avgTemperature = Math.round(avgTemperature * 10) / 10;
    
    // Combine all sources for overall conditions (not currently used)
    
    // Get the most common period name from the data group
    const periodNames = dataGroup.map(d => d.periodName).filter(Boolean);
    const mostCommonPeriodName = periodNames.length > 0 ? 
      periodNames.reduce((a, b) => 
        periodNames.filter(v => v === a).length >= periodNames.filter(v => v === b).length ? a : b
      ) : undefined;
    
    // Forecast aggregation for time group
    
    return {
      waveHeight: {
        min: waveHeightMin,
        max: waveHeightMax,
        unit: 'ft',
        sources: waveSources,
        confidence: waveConfidence
      },
      wind: {
        speed: avgWindSpeed,
        direction: windDirection,
        unit: 'mph',
        sources: windSources,
        confidence: windConfidence
      },
      swell: [{
        height: avgWaveHeight,
        period: avgWavePeriod, // Can be undefined
        direction: windDirection,
        sources: waveSources
      }],
      waterTemp: avgTemperature > 0 ? {
        value: avgTemperature,
        unit: 'F',
        sources: tempSources
      } : undefined,
      rating: calculateSurfRating(avgWaveHeight, avgWindSpeed, windDirection, spotId),
      conditions: surfReport,
      recommendations: [],
      surfLikelihood,
      surfReport,
      notes,
      timestamp: dataGroup[0]?.timestamp,
      periodName: mostCommonPeriodName // Preserve NOAA period name
    };
    
  } catch (error) {
    console.error('🌊 Error aggregating forecast data:', error);
    return null;
  }
};

// Removed unused legacy function aggregateForecastData

// Removed unused legacy function analyzeBuoyTrends

// Removed unused legacy function predictFromTrends

/**
 * Fetch NOAA forecast data using real NOAA forecast APIs with dynamic zone selection
 */
const fetchNOAAForecastData = async (latitude: number, longitude: number, hours: number = 168): Promise<WindData[]> => {
  try {
    console.log(`🌊 Fetching NOAA Marine forecast data for coordinates: ${latitude}, ${longitude} (${hours} hours)`);
    
    const forecastData: WindData[] = [];
    
    // Set start date to current time for real-time forecasts
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (hours * 60 * 60 * 1000));
    
    console.log(`🌊 NOAA forecast time range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // First, determine the marine forecast zone based on coordinates
    const marineZone = getMarineForecastZone(latitude, longitude);
    console.log(`🌊 Determined marine forecast zone: ${marineZone.name} (${marineZone.id})`);
    
    // Try NOAA Marine Products API first - this provides the actual marine forecasts
    try {
      console.log('🌊 Fetching NOAA Marine Products forecast...');
      
      // Get marine forecast products for the Duluth area
      const marineProductsUrl = 'https://api.weather.gov/products/types/NSH/locations/DLH';
      const productsResponse = await fetch(marineProductsUrl);
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        console.log(`🌊 NOAA Marine Products response:`, {
          status: productsResponse.status,
          hasData: !!productsData,
          productsCount: productsData?.['@graph']?.length || 0
        });
        
        // Get the most recent marine forecast
        if (productsData && productsData['@graph'] && productsData['@graph'].length > 0) {
          const latestProduct = productsData['@graph'][0];
          console.log(`🌊 Latest NOAA Marine Product: ${latestProduct.productName} (${latestProduct.issuanceTime})`);
          
          // Fetch the actual forecast content
          const forecastResponse = await fetch(latestProduct['@id']);
          if (forecastResponse.ok) {
            const forecastContent = await forecastResponse.json();
            console.log('🌊 NOAA Marine forecast content fetched successfully');
            
            // Parse the marine forecast text
            const forecastText = forecastContent.productText || '';
            console.log(`🌊 Marine forecast text length: ${forecastText.length} characters`);
            
            // Extract forecast data from the text
            const extractedData = parseNOAAMarineForecastText(forecastText, startDate, endDate);
            forecastData.push(...extractedData);
            
            // NOAA Marine forecast points extracted
          }
        }
      }
    } catch (error) {
      console.error('🌊 Error fetching NOAA Marine Products forecast:', error);
    }
    
    // Fallback to NOAA Marine MapClick API if zone forecast fails
    if (forecastData.length === 0) {
      try {
        console.log('🌊 Trying fallback NOAA Marine MapClick API...');
        const marineForecastUrl = `https://marine.weather.gov/MapClick.php?lat=${latitude}&lon=${longitude}&FcstType=marine`;
        console.log(`🌊 NOAA Marine forecast URL: ${marineForecastUrl}`);
        
        const marineResponse = await fetch(marineForecastUrl);
        console.log(`🌊 NOAA Marine response status: ${marineResponse.status}`);
        
        if (marineResponse.ok) {
          // Check if response is HTML (which happens with MapClick API)
          const contentType = marineResponse.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            console.log('🌊 NOAA Marine API returned HTML, skipping JSON parse');
            return forecastData;
          }
          
          let marineData;
          try {
            marineData = await marineResponse.json();
          } catch {
            console.log('🌊 Failed to parse NOAA Marine response as JSON, skipping');
            return forecastData;
          }
          console.log(`🌊 NOAA Marine API response:`, {
            status: marineResponse.status,
            hasData: !!marineData,
            dataKeys: marineData ? Object.keys(marineData) : [],
            dataDataKeys: marineData?.data ? Object.keys(marineData.data) : []
          });
          
          // Parse NOAA marine forecast periods
          if (marineData && marineData.data) {
            console.log(`🌊 NOAA Marine data structure:`, Object.keys(marineData.data));
            
            // Handle different data structures from NOAA Marine API
            if (marineData.data.text && Array.isArray(marineData.data.text)) {
              console.log('🌊 Processing NOAA Marine forecast data - found text array');
              
              // Use only the actual NOAA forecast periods - no artificial generation
              for (let i = 0; i < marineData.data.text.length; i++) {
                const forecastText = marineData.data.text[i];
                
                // Extract wind info from forecast text
                const windSpeed = extractWindSpeedFromNOAA(forecastText);
                const windDirection = extractWindDirectionFromNOAA(forecastText);
                const waveHeightData = extractWaveHeightFromNOAA(forecastText);
                
                // Only process if we have valid wind data
                if (windSpeed > 0 && windDirection) {
                  // Use NOAA's actual forecast period timing
                  const periodTime = new Date(startDate.getTime() + (i * 3) * 60 * 60 * 1000);
                  
                  // Skip if outside our desired range
                  if (periodTime > endDate) {
                    break;
                  }
                  
                  const temperature = marineData.data.temperature && i < marineData.data.temperature.length 
                    ? parseFloat(marineData.data.temperature[i]) 
                    : undefined;
                  
                  // Use the average wave height for the forecast data structure
                  const avgWaveHeight = Math.round(((waveHeightData.min + waveHeightData.max) / 2) * 10) / 10;
                  
                  // NOAA Marine period data extracted
                  
                  forecastData.push({
                    windSpeed,
                    windDirection,
                    temperature,
                    pressure: undefined,
                    waveHeight: avgWaveHeight > 0 ? avgWaveHeight : 0,
                    wavePeriod: avgWaveHeight > 0 ? Math.max(4, Math.min(8, avgWaveHeight * 2)) : undefined,
                    waveDirection: windDirection,
                    source: 'noaa-marine-forecast',
                    timestamp: periodTime.toISOString()
                  });
                }
              }
            } else if (marineData.data.WindSpeed && Array.isArray(marineData.data.WindSpeed)) {
              console.log('🌊 Processing NOAA Marine forecast data - found data arrays');
              
              // Process each forecast period
              const periods = Math.min(
                marineData.data.WindSpeed.length,
                marineData.data.WindDirection?.length || 0,
                marineData.data.WaveHeight?.length || 0
              );
              
              for (let i = 0; i < periods; i++) {
                const windSpeed = parseFloat(marineData.data.WindSpeed[i]) || 0;
                const windDirection = marineData.data.WindDirection?.[i] || 'N';
                const waveHeight = parseFloat(marineData.data.WaveHeight?.[i]) || 0;
                const temperature = marineData.data.Temperature?.[i] ? parseFloat(marineData.data.Temperature[i]) : undefined;
                
                // Only process if we have valid wind data
                if (windSpeed > 0 && windDirection) {
                  // Use NOAA's actual forecast period timing
                  const periodTime = new Date(startDate.getTime() + (i * 3) * 60 * 60 * 1000);
                  
                  // Skip if outside our desired range
                  if (periodTime > endDate) {
                    break;
                  }
                  
                  console.log(`🌊 NOAA Marine period ${i}: ${periodTime.toISOString()} -> ${windDirection} ${windSpeed}mph, ${waveHeight}ft waves`);
                  
                  forecastData.push({
                    windSpeed,
                    windDirection,
                    temperature,
                    pressure: undefined,
                    waveHeight: waveHeight > 0 ? waveHeight : 0,
                    wavePeriod: waveHeight > 0 ? Math.max(4, Math.min(8, waveHeight * 2)) : undefined,
                    waveDirection: windDirection,
                    source: 'noaa-marine-forecast',
                    timestamp: periodTime.toISOString()
                  });
                }
              }
            } else {
              console.log('🌊 NOAA Marine API returned unexpected data structure');
            }
          }
        } else {
          console.error(`🌊 NOAA Marine API request failed: ${marineResponse.status} ${marineResponse.statusText}`);
        }
      } catch (error) {
        console.error('🌊 Error fetching NOAA Marine forecast data:', error);
      }
    }
    
    // Final fallback: Try NOAA Weather.gov Marine API if both primary methods fail
    if (forecastData.length === 0) {
      try {
        console.log('🌊 Trying NOAA Weather.gov Marine API fallback...');
        const weatherGovUrl = `https://api.weather.gov/points/${latitude},${longitude}`;
        
        const pointsResponse = await fetch(weatherGovUrl);
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          const forecastUrl = pointsData.properties.forecast;
          
          if (forecastUrl) {
            const forecastResponse = await fetch(forecastUrl);
            if (forecastResponse.ok) {
              const forecastJson = await forecastResponse.json();
              console.log('🌊 NOAA Weather.gov Marine API response:', forecastJson);
              
              // Parse Weather.gov marine forecast data
              if (forecastJson.properties && forecastJson.properties.periods) {
                for (let i = 0; i < forecastJson.properties.periods.length; i++) {
                  const period = forecastJson.properties.periods[i];
                  
                  // Parse the period's actual start and end times
                  const startTime = new Date(period.startTime);
                  const endTime = new Date(period.endTime);
                  
                  // Skip if too far in the past (more than 6 hours ago) or too far in the future
                  const now = new Date();
                  const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                  if (hoursDiff < -6 || startTime > endDate) {
                    console.log(`🌊 Skipping NOAA period ${i}: ${startTime.toISOString()} (hours diff: ${hoursDiff.toFixed(1)}, end: ${endDate.toISOString()})`);
                    continue;
                  }
                  
                  const windSpeed = extractWindSpeedFromNOAA(period.detailedForecast || '');
                  const windDirection = extractWindDirectionFromNOAA(period.detailedForecast || '');
                  const waveHeightData = extractWaveHeightFromNOAA(period.detailedForecast || '');
                  
                  if (windSpeed > 0 && windDirection) {
                    // Use the average wave height for the forecast data structure
                    const avgWaveHeight = Math.round(((waveHeightData.min + waveHeightData.max) / 2) * 10) / 10;
                    
                    console.log(`🌊 NOAA Weather.gov period ${i}: ${startTime.toISOString()} - ${endTime.toISOString()} -> ${windDirection} ${windSpeed}mph, ${waveHeightData.min}-${waveHeightData.max}ft waves (avg: ${avgWaveHeight}ft)`);
                    
                    forecastData.push({
                      windSpeed,
                      windDirection,
                      temperature: period.temperature?.value ? parseFloat(period.temperature.value) : undefined,
                      pressure: undefined,
                      waveHeight: avgWaveHeight > 0 ? avgWaveHeight : 0,
                      wavePeriod: avgWaveHeight > 0 ? Math.max(4, Math.min(8, avgWaveHeight * 2)) : undefined,
                      waveDirection: windDirection,
                      source: 'noaa-weathergov-marine',
                      timestamp: startTime.toISOString()
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('🌊 Error fetching NOAA Weather.gov Marine API fallback:', error);
      }
    }
    
    console.log(`🌊 Generated ${forecastData.length} NOAA forecast points`);
    
    // Provide feedback on forecast coverage
    if (forecastData.length === 0) {
      console.log('🌊 No NOAA forecast data available for this location');
    } else if (forecastData.length < hours/3) {
      const daysCovered = Math.ceil(forecastData.length * 3 / 24);
      console.log(`🌊 NOAA provides ${daysCovered} days of forecast coverage (${forecastData.length} periods)`);
      console.log('🌊 Consider Windy API for extended forecast coverage when not rate-limited');
    } else {
      console.log('🌊 NOAA provides full forecast coverage');
    }
    
    return forecastData;
    
  } catch (error) {
    console.error('🌊 Error in fetchNOAAForecastData:', error);
    return [];
  }
};

/**
 * Extract wind speed from NOAA forecast text
 */
const extractWindSpeedFromNOAA = (forecastText: string): number => {
  if (!forecastText) return 0;
  
  // Enhanced patterns to match NOAA marine forecast text
  const patterns = [
    // "Northeast wind 5 knots" or "East wind 5 to 10 knots"
    /(?:northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)\s+wind\s+(\d+)(?:\s+to\s+\d+)?\s+knots?/i,
    // "Wind northeast 5 knots" or "Wind east 5 to 10 knots"
    /wind\s+(?:northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)\s+(\d+)(?:\s+to\s+\d+)?\s+knots?/i,
    // "5 to 10 knots" or "15 knots"
    /(\d+)\s*(?:to\s*\d+\s*)?knots?/i,
    // "10 to 15 mph" or "15 mph"
    /(\d+)\s*(?:to\s*\d+\s*)?mph/i,
    // "variable 10 knots or less"
    /variable\s+(\d+)\s+knots?\s+or\s+less/i,
    // "becoming variable 10 knots"
    /becoming\s+variable\s+(\d+)\s+knots?/i
  ];
  
  for (const pattern of patterns) {
    const match = forecastText.match(pattern);
    if (match) {
      const speed = parseInt(match[1]);
      // Convert knots to mph if the text contains "knots"
      if (pattern.source.includes('knots?')) {
        return Math.round(speed * 1.15078); // Convert knots to mph
      }
      return speed;
    }
  }
  
  return 0;
};

/**
 * Extract wind direction from NOAA forecast text
 */
const extractWindDirectionFromNOAA = (forecastText: string): string => {
  if (!forecastText) return 'N';
  
  // Enhanced patterns to match NOAA marine forecast text
  const patterns = [
    // "Northeast wind 5 knots" - direction before "wind"
    /(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)\s+wind/i,
    // "Wind northeast 5 knots" - direction after "wind"
    /wind\s+(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)/i,
    // "becoming northeast" or "becoming variable"
    /becoming\s+(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)/i,
    // "variable 10 knots or less" - handle variable winds
    /variable\s+\d+\s+knots?\s+or\s+less/i,
    // General direction patterns
    /(northeast|northwest|southeast|southwest|north|south|east|west|ne|nw|se|sw|n|s|e|w)/i
  ];
  
  for (const pattern of patterns) {
    const match = forecastText.match(pattern);
    if (match) {
      if (pattern.source.includes('variable')) {
        return 'VAR'; // Variable winds
      }
      const direction = match[1].toUpperCase();
      
      // Normalize direction abbreviations
      const directionMap: { [key: string]: string } = {
        'NORTHEAST': 'NE',
        'NORTHWEST': 'NW', 
        'SOUTHEAST': 'SE',
        'SOUTHWEST': 'SW',
        'NORTH': 'N',
        'SOUTH': 'S',
        'EAST': 'E',
        'WEST': 'W'
      };
      
      return directionMap[direction] || direction;
    }
  }
  
  return 'N';
};

/**
 * Determine the marine forecast zone based on coordinates
 */
const getMarineForecastZone = (latitude: number, longitude: number): { id: string; name: string } => {
  // Lake Superior marine forecast zones - using actual NOAA zone IDs from the official table
  if (latitude >= 46.5 && latitude <= 47.5 && longitude >= -92.5 && longitude <= -91.5) {
    // Duluth area (Park Point)
    return { id: 'LSZ144', name: 'Two Harbors to Duluth, MN' };
  } else if (latitude >= 47.5 && latitude <= 48.5 && longitude >= -91.5 && longitude <= -90.5) {
    // Grand Marais area
    return { id: 'LSZ141', name: 'Grand Marais to Taconite Harbor, MN' };
  } else if (latitude >= 48.0 && latitude <= 49.0 && longitude >= -90.5 && longitude <= -89.5) {
    // Grand Portage area
    return { id: 'LSZ140', name: 'Grand Portage to Grand Marais, MN' };
  } else if (latitude >= 46.5 && latitude <= 47.5 && longitude >= -91.5 && longitude <= -90.5) {
    // Two Harbors area
    return { id: 'LSZ143', name: 'Silver Bay Harbor to Two Harbors, MN' };
  } else if (latitude >= 46.5 && latitude <= 47.5 && longitude >= -92.5 && longitude <= -91.5) {
    // Wisconsin side - Duluth to Port Wing
    return { id: 'LSZ145', name: 'Duluth, MN to Port Wing, WI' };
  } else {
    // Default to Duluth zone for other Lake Superior locations
    return { id: 'LSZ144', name: 'Two Harbors to Duluth, MN' };
  }
};

// Buoy forecast function removed - buoys provide real-time data, not forecasts

/**
 * Parse NOAA Marine forecast text and extract forecast data
 */
const parseNOAAMarineForecastText = (forecastText: string, startDate: Date, endDate: Date): WindData[] => {
  const forecastData: WindData[] = [];
  
  if (!forecastText) return forecastData;
  
  console.log(`🌊 Parsing NOAA marine forecast text (${forecastText.length} chars)`);
  
  // Split the text into sections by zone
  const sections = forecastText.split('LSZ');
  console.log(`🌊 Found ${sections.length} marine zone sections`);
  
  for (const section of sections) {
    if (!section.includes('Duluth') && !section.includes('Two Harbors')) continue;
    
    console.log(`🌊 Processing section: ${section.substring(0, 100)}...`);
    
    // Extract time periods (TODAY, TONIGHT, FRIDAY, etc.)
    // Split the section into periods and capture the full text for each
    const periodMatches = section.matchAll(/\.([A-Z\s]+)\.\.\./g);
    const periods: {name: string, text: string}[] = [];
    
    for (const match of periodMatches) {
      const periodName = match[1].trim();
      const startIndex = match.index! + match[0].length;
      
      // Find the end of this period (next period marker or end of section)
      let endIndex = section.length;
      const nextPeriodMatch = section.slice(startIndex).match(/\.([A-Z\s]+)\.\.\./);
      if (nextPeriodMatch) {
        endIndex = startIndex + nextPeriodMatch.index!;
      }
      
      const periodText = section.slice(startIndex, endIndex).trim();
      periods.push({ name: periodName, text: periodText });
    }
    
    if (periods.length > 0) {
      console.log(`🌊 Found ${periods.length} time periods in section`);
      
      for (const period of periods) {
        const periodName = period.name;
        const periodText = period.text;
        
        console.log(`🌊 Processing period: "${periodName}" -> "${periodText}"`);
        
        // Extract wind and wave data from period text
        const windSpeed = extractWindSpeedFromNOAA(periodText);
        const windDirection = extractWindDirectionFromNOAA(periodText);
        const waveHeightData = extractWaveHeightFromNOAA(periodText);
        
        // Use the average wave height for the forecast data structure
        const avgWaveHeight = Math.round(((waveHeightData.min + waveHeightData.max) / 2) * 10) / 10;
        
        console.log(`🌊 Extracted: Wind ${windSpeed}mph ${windDirection}, Waves ${waveHeightData.min}-${waveHeightData.max}ft (avg: ${avgWaveHeight}ft)`);
        
        if (windSpeed > 0 && windDirection) {
          // Create timestamp based on period name
          const timestamp = createTimestampFromPeriodName(periodName, startDate);
          
          console.log(`🌊 Created timestamp: ${timestamp.toISOString()} for period "${periodName}"`);
          
          if (timestamp >= startDate && timestamp <= endDate) {
            forecastData.push({
              windSpeed,
              windDirection,
              temperature: undefined,
              pressure: undefined,
              waveHeight: avgWaveHeight > 0 ? avgWaveHeight : 0,
              wavePeriod: avgWaveHeight > 0 ? Math.max(4, Math.min(8, avgWaveHeight * 2)) : undefined,
              waveDirection: windDirection,
              source: 'noaa-marine-products',
              timestamp: timestamp.toISOString(),
              periodName: periodName // Add the NOAA period name
            });
            
            console.log(`🌊 Added forecast point: ${windSpeed}mph ${windDirection}, ${avgWaveHeight}ft waves at ${timestamp.toISOString()}`);
          } else {
            console.log(`🌊 Skipping period "${periodName}" - timestamp ${timestamp.toISOString()} outside range ${startDate.toISOString()} to ${endDate.toISOString()}`);
          }
        } else {
          console.log(`🌊 Skipping period "${periodName}" - invalid wind data (speed: ${windSpeed}, direction: ${windDirection})`);
        }
      }
    }
  }
  
  console.log(`🌊 Total forecast points extracted: ${forecastData.length}`);
  return forecastData;
};

/**
 * Create timestamp from period name (TODAY, TONIGHT, FRIDAY, etc.)
 */
const createTimestampFromPeriodName = (periodName: string, baseDate: Date): Date => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (periodName.toUpperCase()) {
    case 'REST OF TODAY':
      return new Date(today.getTime() + (12 * 60 * 60 * 1000)); // 12 PM today (Thursday)
    case 'TONIGHT':
      return new Date(today.getTime() + (20 * 60 * 60 * 1000)); // 8 PM today (Thursday)
    case 'FRIDAY':
      // NOAA "FRIDAY" refers to tomorrow (Friday), not today
      return new Date(today.getTime() + (24 * 60 * 60 * 1000) + (12 * 60 * 60 * 1000)); // 12 PM Friday
    case 'FRIDAY NIGHT':
      return new Date(today.getTime() + (24 * 60 * 60 * 1000) + (20 * 60 * 60 * 1000)); // 8 PM Friday
    case 'SATURDAY':
      return new Date(today.getTime() + (48 * 60 * 60 * 1000) + (12 * 60 * 60 * 1000)); // 12 PM Saturday
    case 'SATURDAY NIGHT':
      return new Date(today.getTime() + (48 * 60 * 60 * 1000) + (20 * 60 * 60 * 1000)); // 8 PM Saturday
    default:
      return now;
  }
};

/**
 * Extract wave height from NOAA forecast text
 */
const extractWaveHeightFromNOAA = (forecastText: string): { min: number; max: number; isRange: boolean } => {
  if (!forecastText) return { min: 0, max: 0, isRange: false };
  
  const text = forecastText.toLowerCase();
  console.log(`🌊 🔍 Extracting wave height from text: "${text}"`);
  
  // Enhanced patterns specifically for NOAA marine forecast text
  const patterns = [
    // "Waves 2 to 4 feet" - NOAA marine format
    /waves?\s+(\d+)\s+to\s+(\d+)\s+feet?/i,
    // "Waves 1 to 3 feet" 
    /waves?\s+(\d+)\s+to\s+(\d+)\s+feet?/i,
    // "2 to 4 feet" - without "waves" prefix
    /(\d+)\s+to\s+(\d+)\s+feet?/i,
    // "1-2 feet" - with dash
    /(\d+)-(\d+)\s+feet?/i,
    // "Waves 2 feet" - single value
    /waves?\s+(\d+)\s+feet?/i,
    // "2 feet" - single value without "waves" prefix
    /(\d+)\s+feet?/i,
    // "Waves 1 foot or less"
    /waves?\s+(\d+)\s+foot?\s+or\s+less/i,
    // "1 foot or less"
    /(\d+)\s+foot?\s+or\s+less/i,
    // "swell 2 to 4 feet"
    /swell\s+(\d+)\s+to\s+(\d+)\s+feet?/i
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = text.match(pattern);
    console.log(`🌊 🔍 Pattern ${i + 1}: ${pattern.source} - Match: ${match ? 'YES' : 'NO'}`);
    if (match) {
      console.log(`🌊 🔍 Pattern ${i + 1} matched: ${JSON.stringify(match)}`);
      if (match[2]) {
        // Range like "2 to 4 feet"
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        console.log(`🌊 Found wave height range: ${min}-${max}ft in text: "${text}"`);
        return { min, max, isRange: true };
      } else {
        // Single value like "2 feet"
        const height = parseInt(match[1]);
        console.log(`🌊 Found wave height: ${height}ft in text: "${text}"`);
        return { min: height, max: height, isRange: false };
      }
    }
  }
  
  console.log(`🌊 No wave height found in text: "${text}"`);
  return { min: 0, max: 0, isRange: false };
};