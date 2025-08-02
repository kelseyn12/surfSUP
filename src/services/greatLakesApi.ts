import { 
  SurfConditions, 
  WaterLevelData, 
  BuoyData, 
  WindData, 
  NoaaWaterLevelResponse, 
  NdbcBuoyResponse, 
  AggregatedConditions 
} from '../types';
import { 
  checkWindDirection, 
  getSpotConfig, 
  isFavorableWindDirection, 
  generateWindDirectionNotes,
  convertWindyWindDirection,
  getWindDirectionFromDegrees
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

// Wind data sources for when buoys are down
const WIND_SOURCES = {
  'DULUTH_NOAA': { id: '9099064', name: 'Duluth NOAA', lat: 46.775, lon: -92.093 },
  'MARQUETTE_NOAA': { id: '9099090', name: 'Marquette NOAA', lat: 46.545, lon: -87.378 },
  'THUNDER_BAY_NOAA': { id: '9099090', name: 'Thunder Bay NOAA', lat: 48.380, lon: -89.247 },
  'GRAND_MARAIS_NOAA': { id: '9099064', name: 'Grand Marais NOAA', lat: 47.750, lon: -90.334 },
};

// NOAA water level stations for Lake Superior
const WATER_LEVEL_STATIONS = {
  'DULUTH': { id: '9099064', name: 'Duluth', lat: 46.775, lon: -92.093 },
  'MARQUETTE': { id: '9099090', name: 'Marquette', lat: 46.545, lon: -87.378 },

  'THUNDER_BAY': { id: '9099090', name: 'Thunder Bay', lat: 48.380, lon: -89.247 },
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
      spotId
    );
    

    
    return aggregated;
    
  } catch (error) {
    console.error('🌊 Error fetching all Great Lakes data:', error);
    return null;
  }
};

/**
 * Fetch data from ALL nearby buoys
 */
const fetchAllBuoyData = async (latitude: number, longitude: number): Promise<BuoyData[]> => {
  const allBuoyData: BuoyData[] = [];
  const buoyStatus: { [key: string]: string } = {};
  
  // Try all buoys within reasonable distance
  for (const [buoyId, buoy] of Object.entries(LAKE_SUPERIOR_BUOYS)) {
    const distance = calculateDistance(latitude, longitude, buoy.lat, buoy.lon);
    
    // Increase range to 250 miles to capture MID SUPERIOR and Rock of Ages buoys
    if (distance <= 250) {
      try {
        const url = `${NDBC_BASE}/${buoyId}.txt`;
        
        const response = await fetch(url);
        
        if (response.ok) {
          const text = await response.text();
          

          
          // Check if the buoy data contains current information
          const hasCurrentData = text.includes(new Date().getFullYear().toString()) || 
                               text.includes((new Date().getFullYear() - 1).toString());
          
          const latestData = parseBuoyData(text, buoyId, buoy.name);
          
          if (latestData) {
            // Check if buoy data is realistic (not out of water)
            // Be more lenient - allow buoys with wave data even if wind data is missing
            const hasValidWaveData = latestData.waveHeight > 0;
            const hasValidWindData = latestData.windSpeed > 0;
            const isRealistic = hasValidWaveData || hasValidWindData;
            
            if (isRealistic) {
              allBuoyData.push(latestData);
              buoyStatus[buoyId] = 'active';
            } else {
              buoyStatus[buoyId] = 'out-of-water';
              console.log(`🌊 Buoy ${buoyId} (${buoy.name}) appears to be out of water or not reporting realistic data`);
            }
          } else {
            buoyStatus[buoyId] = 'no-data';
            console.log(`🌊 Buoy ${buoyId} (${buoy.name}) returned no parseable data`);
          }
        } else {
          buoyStatus[buoyId] = 'http-error';
          console.error(`🌊 Buoy ${buoyId} HTTP error:`, response.status, response.statusText);
        }
      } catch (error) {
        buoyStatus[buoyId] = 'fetch-error';
        console.error(`🌊 Error fetching buoy ${buoyId}:`, error);
      }
    }
  }
  
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
    const avgTemp = windSources.reduce((sum, source) => sum + source.temperature, 0) / windSources.length;
    const avgPressure = windSources.reduce((sum, source) => sum + source.pressure, 0) / windSources.length;
    
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
        const temperature = windJson['temp-surface'] ? windJson['temp-surface'][currentIndex] : 50;
        const pressure = windJson['pressure-surface'] ? windJson['pressure-surface'][currentIndex] : 1013;
        
        const windSpeed = Math.sqrt(windU * windU + windV * windV) * 2.23694; // Convert m/s to mph
        const windDirection = convertWindyWindDirection(windU, windV);
        
        windData = {
          windSpeed: windSpeed || 0,
          windDirection: windDirection || 'N',
          temperature: temperature || 50,
          pressure: pressure || 1013,
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
      temperature: windData?.temperature || 50,
      pressure: windData?.pressure || 1013,
      waveHeight: waveData?.waveHeight || 0,
      wavePeriod: waveData?.wavePeriod || 0,
      waveDirection: waveData?.waveDirection || 'N',
      source: windData || waveData ? 'windy' : 'windy-rate-limited'
    };
    
    // Only log success if we actually got data
    if (windData || waveData) {
      console.log('🌊 Windy API working - combined data:', result);
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
        let windDirection = 'SW';
        let windSpeed = 10; // Default fallback
        
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
              temperature: 67, // Use water temp as air temp approximation
              pressure: 1013,
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
            temperature: 67,
            pressure: 1013,
            source: 'noaa-marine-forecast-fallback'
          };
        }
      }
    }
    
    // Final fallback to reasonable Lake Superior conditions
    return {
      windSpeed: 10,
      windDirection: 'SW',
      temperature: 67,
      pressure: 1013,
      source: 'noaa-fallback'
    };
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
        const speed = parseInt(parts[1]) || 10;
        
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
    const waterLevels = await fetchLakeSuperiorWaterLevel(nearestStation.id, 1);
    
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
        const [year, month, day, hour, minute, windDirection, windSpeed, gust, waveHeight, wavePeriod, avgPeriod, waveDirection, pressure, airTemp, waterTemp, dewPoint, visibility, pressureChange, tide] = parts;
        
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
              console.log(`🌊 Buoy ${buoyId} data too old (${hoursDiff.toFixed(1)} hours)`);
              continue;
            } else {
              console.log(`🌊 Buoy ${buoyId} using same-day data (${hoursDiff.toFixed(1)} hours old)`);
            }
          }
          
          const waveHeightNum = parseFloat(waveHeight);
          const wavePeriodNum = parseFloat(wavePeriod);
          // NDBC reports wave height in meters, convert to feet
          const waveHeightInFeet = waveHeightNum * 3.28084; // meters to feet
          
          // Skip unrealistic data (0.05 to 15 feet is reasonable for Lake Superior)
          if (waveHeightInFeet > 15 || waveHeightInFeet < 0.05) {
            console.log(`🌊 Buoy ${buoyId} wave height unrealistic: ${waveHeightInFeet.toFixed(1)}ft`);
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
          const waterTempC = parseFloat(waterTemp) || 10; // Default to 10°C (50°F)
          
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
 * Validate spot ID exists in configuration
 */
const validateSpotId = (spotId: string): boolean => {
  const spotConfig = getSpotConfig(spotId);
  return spotConfig !== undefined;
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
  avgWaveHeight: number;
  avgWavePeriod: number;
  waveDirections: string[];
  waveConfidence: number;
  sources: string[];
  debugInfo: {
    method: string;
    reasoning: string;
    conflicts?: string[];
  };
}

const aggregateWaveData = (buoyData: BuoyData[], windData: WindData | null): BlendedWaveData => {
  const waveHeightPoints: WaveDataPoint[] = [];
  const wavePeriodPoints: WaveDataPoint[] = [];
  const waveDirectionPoints: WaveDataPoint[] = [];
  
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
        avgWaveHeight: 0,
        avgWavePeriod: 0,
        waveDirections: [],
        waveConfidence: 0.1,
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
        avgWavePeriod: 0,
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
      avgWavePeriod: 0,
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
  const windDirectionPoints: WindDataPoint[] = [];
  
  // Collect all wind speed data points with source info
  buoyData.forEach(buoy => {
    if (buoy.windSpeed > 0) {
      windSpeedPoints.push({
        speed: buoy.windSpeed,
        direction: buoy.windDirection,
        source: `ndbc-${buoy.source}`,
        confidence: 0.9, // High confidence for buoy data
        timestamp: buoy.timestamp
      });
    }
  });
  
  // Add Windy wind data if available
  if (windData && windData.windSpeed > 0) {
    windSpeedPoints.push({
      speed: windData.windSpeed,
      direction: windData.windDirection,
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
 * Aggregate water temperature from multiple sources
 */
const aggregateWaterData = (buoyData: BuoyData[], waterData: { waterLevel: WaterLevelData | null; waterTemp: number | null }) => {
  const waterTemps = buoyData.map(b => b.waterTemp);
  
  let finalWaterTempF = 60; // Default to 60°F for Lake Superior summer
  
  // Try buoy data first
  if (waterTemps.length > 0) {
    const avgWaterTempC = waterTemps.reduce((sum, t) => sum + t, 0) / waterTemps.length;
    const buoyWaterTempF = (avgWaterTempC * 9/5) + 32;
    if (buoyWaterTempF >= 40 && buoyWaterTempF <= 80) {
      finalWaterTempF = buoyWaterTempF;
    }
  }
  
  // Try NOAA water temperature as fallback
  if (waterData.waterTemp !== null) {
    const noaaWaterTempF = waterData.waterTemp;
    if (noaaWaterTempF >= 40 && noaaWaterTempF <= 80) {
      finalWaterTempF = noaaWaterTempF;
    }
  }
  
  // Ensure realistic temperature for Lake Superior
  finalWaterTempF = Math.min(Math.max(finalWaterTempF, 40), 80);
  
  return {
    waterTempF: Math.round(finalWaterTempF),
    sources: [...buoyData.map(b => b.source), ...(waterData.waterTemp !== null ? ['noaa-water-temp'] : [])]
  };
};

/**
 * Generate surf report with likelihood, notes, and summary
 */
const generateSurfReport = (
  waveData: { avgWaveHeight: number; avgWavePeriod: number },
  windData: { avgWindSpeed: number; windDirection: string; gustSpeed?: number },
  waterData: { waterTempF: number },
  spotId: string,
  buoyData: BuoyData[] = []
) => {
  const { avgWaveHeight, avgWavePeriod } = waveData;
  const { avgWindSpeed, windDirection, gustSpeed } = windData;
  const { waterTempF } = waterData;
  
  // Calculate surf likelihood
  const surfLikelihood = calculateSurfLikelihood(avgWaveHeight, avgWavePeriod, avgWindSpeed, windDirection, spotId);
  
  // Generate notes
  const notes: string[] = [];
  
  // Check for pressure drops (seiche risk)
  if (detectPressureDrop(buoyData)) {
    notes.push('Seiche risk — rapid pressure drop');
  }
  
  // Add wind-related notes
  const windNotes = generateWindNotes(avgWindSpeed, gustSpeed);
  notes.push(...windNotes);
  
  // Add wind direction notes using new surfConfig logic
  const windDirectionNotes = generateWindDirectionNotes(spotId, windDirection);
  notes.push(...windDirectionNotes);
  
  // Add fallback note if no specific wind direction notes were generated
  if (windDirectionNotes.length === 0 && windDirection) {
    notes.push(`Wind from ${windDirection} direction.`);
  }
  
  // Generate comprehensive surf report
  const surfReport = generateUserSummary(
    { min: Math.max(0, avgWaveHeight - 0.5), max: avgWaveHeight + 0.5, unit: 'ft' },
    avgWavePeriod,
    avgWindSpeed,
    windDirection,
    waterTempF,
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
  spotId: string = 'duluth'
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

  
  const waterDataAggregated = aggregateWaterData(buoyData, waterData);

  
  // Generate surf report
  const surfReport = generateSurfReport(waveData, windDataAggregated, waterDataAggregated, spotId, buoyData);
  
  // Calculate overall confidence based on all sources
  const overallConfidence = (
    waveData.waveConfidence * 0.4 + // Wave data is most important
    windDataAggregated.windConfidence * 0.4 + // Wind data is equally important
    waterDataAggregated.waterTempF ? 0.8 : 0.3 // Water temp if available
  ) / 1.2; // Normalize to 0-1 range
  
  // Generate human-readable descriptions
  const conditions = generateConditionsDescription(
    waveData.avgWaveHeight, 
    windDataAggregated.avgWindSpeed, 
    windDataAggregated.windDirection, 
    waterDataAggregated.waterTempF
  );
  
  const recommendations = generateSurfRecommendations(
    waveData.avgWaveHeight, 
    windDataAggregated.avgWindSpeed, 
    windDataAggregated.windDirection, 
    waterDataAggregated.waterTempF
  );
  

  
  return {
    waveHeight: {
      min: Math.max(0, waveData.avgWaveHeight - 0.5),
      max: waveData.avgWaveHeight + 0.5,
      unit: 'ft',
      sources: waveData.sources,
      confidence: waveData.waveConfidence
    },
    wind: {
      speed: Math.round(windDataAggregated.avgWindSpeed),
      direction: windDataAggregated.windDirection,
      unit: 'mph',
      sources: windDataAggregated.sources,
      confidence: windDataAggregated.windConfidence
    },
    swell: buoyData.map(b => ({
      height: b.waveHeight,
      period: b.wavePeriod,
      direction: b.waveDirection,
      sources: [b.source]
    })),
    waterTemp: {
      value: waterDataAggregated.waterTempF,
      unit: 'F',
      sources: waterDataAggregated.sources
    },
    rating: calculateSurfRating(waveData.avgWaveHeight, windDataAggregated.avgWindSpeed, windDataAggregated.windDirection, spotId),
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
  waveHeight: number,
  wavePeriod: number,
  windSpeed: number,
  windDirection?: string,
  spotId: string = 'duluth'
): 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' => {
  // Check wind direction first - surf is only possible if wind is from ideal direction
  const windCheck = checkWindDirection(spotId, windDirection || '');
  
  // If wind is blocked, return Flat
  if (windCheck.isBlocked) {
    return 'Flat';
  }
  
  // Lake Superior-specific wave + period thresholds
  if (waveHeight < 0.5) {
    return 'Flat';
  }
  
  // Handle missing wave period (0 or undefined)
  const hasValidPeriod = wavePeriod > 0;
  
  // If no valid period data, return Flat (can't determine surf quality)
  if (!hasValidPeriod) {
    return 'Flat';
  }
  
  if (waveHeight < 1.5 && wavePeriod >= 4) {
    return 'Maybe Surf';
  }
  
  if (waveHeight < 3 && wavePeriod >= 5 && windSpeed < 12) {
    return 'Good';
  }
  
  if (waveHeight >= 3 && wavePeriod >= 6 && windSpeed < 12) {
    return 'Firing';
  }
  
  // If wave height is good but period is too short
  return 'Flat';
};

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
  
  // Sort by timestamp to get recent data
  const sortedData = weatherStations
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // For now, implement a basic check
  // In the future, we could enhance parseBuoyData to extract pressure values
  // and track pressure changes over time
  
  // Check if we have recent data (within last 6 hours)
  const now = new Date();
  const recentData = sortedData.filter(buoy => {
    const buoyTime = new Date(buoy.timestamp);
    const hoursDiff = (now.getTime() - buoyTime.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 6;
  });
  
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
  surfLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing',
  _notes: string[] // Prefixed with underscore to indicate intentionally unused
): string => {
  // Generate dynamic summaries based on actual conditions
  switch (surfLikelihood) {
    case 'Flat':
      if (waveHeight.max < 0.5) {
        return 'Flat conditions today. No surf expected.';
      } else {
        return `Flat conditions (${waveHeight.min}-${waveHeight.max}ft waves). Wind from ${windDirection} not ideal.`;
      }
    case 'Maybe Surf':
      if (wavePeriod > 0) {
        return `Maybe surf with ${waveHeight.min}-${waveHeight.max}ft waves @ ${wavePeriod}s. ${windDirection} winds.`;
      } else {
        return `Maybe surf with ${waveHeight.min}-${waveHeight.max}ft waves. ${windDirection} winds.`;
      }
    case 'Good':
      if (wavePeriod > 0) {
        return `Good conditions — ${waveHeight.min}-${waveHeight.max}ft waves @ ${wavePeriod}s. ${windDirection} winds.`;
      } else {
        return `Good conditions — ${waveHeight.min}-${waveHeight.max}ft waves. ${windDirection} winds.`;
      }
    case 'Firing':
      if (wavePeriod > 0) {
        return `Firing! ${waveHeight.min}-${waveHeight.max}ft waves @ ${wavePeriod}s. ${windDirection} winds.`;
      } else {
        return `Firing! ${waveHeight.min}-${waveHeight.max}ft waves. ${windDirection} winds.`;
      }
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
  
  // Check wind direction for this specific spot
  const isFavorableWind = isFavorableWindDirection(spotId, windDirection);
  
  // If wind is not favorable for this spot, significantly reduce rating
  if (!isFavorableWind) {
    rating = Math.max(1, rating - 4); // Major penalty for wrong wind direction
  }
  
  // Adjust for wind speed (only if wind direction is favorable)
  if (isFavorableWind) {
    if (windSpeed > 20) rating = Math.max(1, rating - 2);
    else if (windSpeed > 15) rating = Math.max(1, rating - 1);
  }
  
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

export const getLakeSuperiorBuoyStations = () => {
  return LAKE_SUPERIOR_BUOYS;
};

export const getLakeSuperiorWaterLevelStations = () => {
  return WATER_LEVEL_STATIONS;
};

// Legacy functions for backward compatibility
export const fetchLakeSuperiorWaterLevel = async (
  stationId: string = '9099064',
  days: number = 7
): Promise<WaterLevelData[]> => {
  try {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `${NOAA_WATER_LEVEL_BASE}?begin_date=${startDate}&end_date=${endDate}&station=${stationId}&product=water_level&datum=IGLD&time_zone=lst_ldt&units=english&format=json`;
    
    const response = await fetch(url);
    const data: NoaaWaterLevelResponse = await response.json();
    
    if (data.error) {
      throw new Error(`NOAA API error: ${data.error}`);
    }
    
    const waterLevels: WaterLevelData[] = data.data
      .filter(item => item.v && !isNaN(parseFloat(item.v)))
      .map((item, index, array) => {
        const level = parseFloat(item.v);
        const date = new Date(item.t).toISOString().split('T')[0];
        
        let trend: 'rising' | 'falling' | 'stable' = 'stable';
        if (index > 0) {
          const prevLevel = parseFloat(array[index - 1].v);
          if (level > prevLevel + 0.01) trend = 'rising';
          else if (level < prevLevel - 0.01) trend = 'falling';
        }
        
        return { date, level, trend };
      });
    
    return waterLevels;
  } catch (error) {
    console.error('🌊 Error fetching water level:', error);
    return [];
  }
};

export const fetchLakeSuperiorBuoyData = async (
  spotLat: number,
  spotLon: number,
  hours: number = 24
): Promise<BuoyData[]> => {
  const buoyData = await fetchAllBuoyData(spotLat, spotLon);
  return buoyData.slice(-hours);
};

export const fetchWindData = async (
  spotLat: number,
  spotLon: number
): Promise<WindData | null> => {
  return await fetchAllWindData(spotLat, spotLon);
};

export const calculateWaveHeightFromWind = (
  windSpeed: number,
  windDirection: string,
  fetchDistance: number
): number => {
  const waveHeight = 0.0026 * Math.pow(windSpeed, 2) * Math.sqrt(fetchDistance);
  return Math.min(waveHeight, 15);
};

export const fetchGreatLakesConditions = async (
  spotId: string,
  latitude: number,
  longitude: number
): Promise<SurfConditions | null> => {
  try {
    const aggregated = await fetchAllGreatLakesData(spotId, latitude, longitude);
    
    if (!aggregated) {
      return null;
    }
    
    return {
      spotId,
      timestamp: new Date().toISOString(),
      waveHeight: aggregated.waveHeight,
      wind: aggregated.wind,
      swell: aggregated.swell,
      weather: {
        temperature: aggregated.waterTemp.value,
        condition: 'partly-cloudy',
        unit: 'F'
      },
      rating: aggregated.rating,
      source: 'aggregated',
      surferCount: 0
    };
  } catch (error) {
    console.error('🌊 Error in fetchGreatLakesConditions:', error);
    return null;
  }
}; 