import { SurfConditions } from '../types';

// Multiple data source APIs for comprehensive Great Lakes forecasting
const NOAA_WATER_LEVEL_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';
const WINDY_API_BASE = 'https://api.windy.com/api/point-forecast/v2';

// Lake Superior surf spots configuration with directional preferences
export const surfSpotsConfig = {
  parkpoint: {
    name: 'Park Point',
    idealSwell: ['NE', 'E'],
    offshoreWind: ['SW', 'W'],
    confidence: 'high',
  },
  lester: {
    name: 'Lester River',
    idealSwell: ['NE'],
    offshoreWind: ['W', 'NW'],
    confidence: 'high',
  },
  brighton: {
    name: 'Brighton Beach',
    idealSwell: ['NE'],
    offshoreWind: ['W', 'NW'],
    confidence: 'high',
  },
  frenchriver: {
    name: 'French River',
    idealSwell: ['NE'],
    offshoreWind: ['W', 'NW'],
    confidence: 'high',
  },
  stoney: {
    name: 'Stoney Point',
    idealSwell: ['NE'],
    offshoreWind: ['NW', 'NNW'],
    confidence: 'high',
  },
  boulders: {
    name: 'Boulders',
    idealSwell: ['NE'],
    offshoreWind: ['NW', 'NNW'],
    confidence: 'low',
  },
  guardrails: {
    name: 'Guardrails',
    idealSwell: ['NE'],
    offshoreWind: ['NW', 'NNW'],
    confidence: 'low',
  },
  beaverbay: {
    name: 'Beaver Bay',
    idealSwell: ['E', 'ENE'],
    offshoreWind: ['W', 'SW'],
    confidence: 'medium',
  },
  floodbay: {
    name: 'Flood Bay',
    idealSwell: ['E', 'ENE'],
    offshoreWind: ['W', 'SW'],
    confidence: 'medium',
  },
  grandmarais: {
    name: 'Grand Marais',
    idealSwell: ['E', 'ENE'],
    offshoreWind: ['W', 'SW'],
    confidence: 'high',
  },
  marquette: {
    name: 'Marquette',
    idealSwell: ['N', 'NE'],
    offshoreWind: ['SW'],
    confidence: 'high',
  },
  duluth: {
    name: 'Duluth Area',
    idealSwell: ['NE', 'E'],
    offshoreWind: ['SW', 'W'],
    confidence: 'medium',
  },
};

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
  'SUPERIOR_ENTRY': { id: '9099064', name: 'Superior Entry', lat: 46.715, lon: -92.059 },
  'THUNDER_BAY': { id: '9099090', name: 'Thunder Bay', lat: 48.380, lon: -89.247 },
};

interface WaterLevelData {
  date: string;
  level: number; // in feet above chart datum
  trend: 'rising' | 'falling' | 'stable';
}

interface BuoyData {
  timestamp: string;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: string;
  waterTemp: number;
  windSpeed: number;
  windDirection: string;
  source: string;
}

interface WindData {
  windSpeed: number;
  windDirection: string;
  temperature: number;
  pressure: number;
  waveHeight?: number;
  wavePeriod?: number;
  waveDirection?: string;
  source: string;
}

interface NoaaWaterLevelResponse {
  data: Array<{
    t: string; // time
    v: string; // value (water level)
  }>;
  error?: string;
}

interface NdbcBuoyResponse {
  time: string[];
  wvht: number[]; // significant wave height
  dpd: number[]; // dominant wave period
  mwd: number[]; // mean wave direction
  wspd: number[]; // wind speed
  wdir: number[]; // wind direction
  gst: number[]; // gust speed
  wtemp: number[]; // water temperature
  steepness: string[]; // wave steepness
}

// Aggregated data from all sources
interface AggregatedConditions {
  waveHeight: {
    min: number;
    max: number;
    unit: 'ft';
    sources: string[];
    confidence: number; // 0-1 based on data consistency
  };
  wind: {
    speed: number;
    direction: string;
    unit: 'mph';
    sources: string[];
    confidence: number;
  };
  swell: {
    height: number;
    period: number;
    direction: string;
    sources: string[];
  }[];
  waterTemp: {
    value: number;
    unit: 'F';
    sources: string[];
  };
  rating: number;
  conditions: string; // Human-readable description
  recommendations: string[]; // Surf recommendations
  surfLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing';
  surfReport: string;
  notes: string[];
}

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
    
    // Log errors only
    if (buoyData.status === 'rejected') {
      console.error('🌊 Buoy data error:', buoyData.reason);
    }
    if (windData.status === 'rejected') {
      console.error('🌊 Wind data error:', windData.reason);
    }
    if (waterLevelData.status === 'rejected') {
      console.error('🌊 Water data error:', waterLevelData.reason);
    }
    
    // Check if we got any real data from ANY of the 3 sources
    const hasRealData = (buoyData.status === 'fulfilled' && buoyData.value.length > 0) ||
                       (windData.status === 'fulfilled' && windData.value !== null) ||
                       (waterLevelData.status === 'fulfilled' && waterLevelData.value.waterTemp !== null);
    
    if (!hasRealData) {
      console.error('🌊 No real data available from any source');
      return null;
    }
    
    // Aggregate all the data from ALL 4 sources
    const aggregated = aggregateAllData(
      buoyData.status === 'fulfilled' ? buoyData.value : [],
      windData.status === 'fulfilled' ? windData.value : null,
      waterLevelData.status === 'fulfilled' ? waterLevelData.value : { waterLevel: null, waterTemp: null },
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
              allBuoyData.push(latestData);
            }
        } else {
          console.error(`🌊 Buoy ${buoyId} HTTP error:`, response.status, response.statusText);
        }
      } catch (error) {
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
    const WINDY_API_KEY = process.env.EXPO_PUBLIC_WINDY_API_KEY || 'demo';
    const url = 'https://api.windy.com/api/point-forecast/v2';
    
    // Make two separate requests: one for wind data, one for wave data
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
        })
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
        })
      })
    ]);
    
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
        const windDirection = getWindDirectionFromDegrees(Math.atan2(windV, windU) * 180 / Math.PI);
        
        windData = {
          windSpeed: windSpeed || 0,
          windDirection: windDirection || 'N',
          temperature: temperature || 50,
          pressure: pressure || 1013,
          source: 'windy'
        };
      }
    } else {
      console.error('🌊 Windy wind data request failed:', windResponse.status === 'rejected' ? windResponse.reason : windResponse.value?.status);
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
      console.error('🌊 Windy wave data request failed:', waveResponse.status === 'rejected' ? waveResponse.reason : waveResponse.value?.status);
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
      source: 'windy'
    };
    
    console.log('🌊 Windy API working - combined data:', result);
    return result;
  } catch (error) {
    console.error('🌊 Error fetching Windy data:', error);
    return null;
  }
};



/**
 * Fetch NOAA wind data
 */
const fetchNOAAWindData = async (stationId: string): Promise<WindData | null> => {
  try {
    // Get the appropriate forecast zone based on location
    // For Duluth area spots (Stoney Point, Park Point), use DLH (Duluth)
    // For other Lake Superior spots, we can expand this logic
    const forecastZone = 'DLH'; // Duluth area
    const url = `https://api.weather.gov/products/types/GLFLS/locations/${forecastZone}`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
  
      
      // Parse the marine forecast text to extract current conditions
      if (data.features && data.features.length > 0) {
        const forecast = data.features[0].properties.productText;
        
        // More flexible wind parsing - look for various patterns
        const windPatterns = [
          /(\w+) winds (\d+) to (\d+) knots/,
          /(\w+) winds (\d+) knots/,
          /winds (\w+) (\d+) to (\d+) knots/,
          /winds (\w+) (\d+) knots/
        ];
        
        let windMatch = null;
        let windDirection = 'SW';
        let windSpeed = 10; // Default fallback
        
        for (const pattern of windPatterns) {
          windMatch = forecast.match(pattern);
          if (windMatch) {
            break;
          }
        }
        
        if (windMatch) {
          if (windMatch.length === 4) {
            // Pattern: "Southwest winds 5 to 15 knots"
            windDirection = windMatch[1];
            const windSpeedMin = parseInt(windMatch[2]);
            const windSpeedMax = parseInt(windMatch[3]);
            windSpeed = (windSpeedMin + windSpeedMax) / 2 * 1.15078; // Convert knots to mph
          } else if (windMatch.length === 3) {
            // Pattern: "Southwest winds 10 knots"
            windDirection = windMatch[1];
            windSpeed = parseInt(windMatch[2]) * 1.15078; // Convert knots to mph
          }
          

          
          return {
            windSpeed: windSpeed,
            windDirection: windDirection,
            temperature: 67, // Use water temp as air temp approximation
            pressure: 1013,
            source: 'noaa-marine-forecast'
          };
        }
      }
    }
    
        
        
        // Fallback to reasonable Lake Superior conditions based on the forecast
        return {
          windSpeed: 10, // Southwest 5-15 knots average
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
  try {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Find the latest valid data line (only check last 10 lines for efficiency)
    const recentLines = lines.slice(-10);
    for (let i = recentLines.length - 1; i >= 0; i--) {
      const line = recentLines[i];
      const parts = line.split(/\s+/);
      
             if (parts.length >= 12) {
                 // NDBC format: YY MM DD hh mm WVHT DPD MWD WSPD WDIR GST WTMP
        const [year, month, day, hour, minute, waveHeight, wavePeriod, waveDirection, windSpeed, windDirection, gust, waterTemp] = parts;
        
        // Check if any values are valid
        const hasValidWaveHeight = waveHeight !== 'MM' && !isNaN(parseFloat(waveHeight));
        const hasValidWavePeriod = wavePeriod !== 'MM' && !isNaN(parseFloat(wavePeriod));
        const hasValidWindSpeed = windSpeed !== 'MM' && !isNaN(parseFloat(windSpeed));
        
        // Check if we have ANY valid data (be more lenient)
        if ((waveHeight !== 'MM' && !isNaN(parseFloat(waveHeight))) || 
            (wavePeriod !== 'MM' && !isNaN(parseFloat(wavePeriod))) ||
            (windSpeed !== 'MM' && !isNaN(parseFloat(windSpeed)))) {
          
                  // Check if this is recent data (within last 24 hours)
        // Handle both 2-digit (25) and 4-digit (2025) year formats
        const yearNum = parseInt(year);
        const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;
        
        const dataDate = new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        const now = new Date();
        const hoursDiff = (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60);
        
        // Only use data from last 24 hours - buoys should update every 10 minutes
        if (hoursDiff > 24) {
          continue;
        }
          
          const waveHeightNum = parseFloat(waveHeight);
          const wavePeriodNum = parseFloat(wavePeriod);
          // NDBC reports wave height in centimeters, convert to feet
          const waveHeightInFeet = (waveHeightNum / 100) * 3.28084; // cm to feet
          
          // Skip unrealistic data (0.1 to 15 feet is reasonable for Lake Superior)
          if (waveHeightInFeet > 15 || waveHeightInFeet < 0.1) {
            continue;
          }
          
          // Handle missing wind data
          const windSpeedNum = windSpeed !== 'MM' ? parseFloat(windSpeed) : 0;
          const windDirectionValue = windDirection !== 'MM' ? windDirection : 'N';
          
          const timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
          
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
             windDirection: windDirectionValue,
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
 * Aggregate all data sources into intuitive conditions
 */
const aggregateAllData = (
  buoyData: BuoyData[],
  windData: WindData | null,
  waterData: { waterLevel: WaterLevelData | null; waterTemp: number | null },
  spotId: string = 'duluth'
): AggregatedConditions => {
  
      // Aggregate wave height from ALL sources (buoys + surf APIs)
    const waveHeights = buoyData.map(b => b.waveHeight);
    const wavePeriods = buoyData.map(b => b.wavePeriod);
    const waveDirections = buoyData.map(b => b.waveDirection);
    

    
    // Create forecast based on buoy travel times
    const forecasts = [];
    buoyData.forEach(buoy => {
      const buoyId = buoy.source.replace('ndbc-', '');
      const buoyInfo = LAKE_SUPERIOR_BUOYS[buoyId as keyof typeof LAKE_SUPERIOR_BUOYS];
      if (buoyInfo && buoyInfo.travelTime > 0) {
        forecasts.push({
          hours: buoyInfo.travelTime,
          waveHeight: buoy.waveHeight,
          wavePeriod: buoy.wavePeriod,
          waveDirection: buoy.waveDirection,
          source: buoy.source
        });
      }
    });
    
    // Include Windy wave data if available
    if (windData && windData.waveHeight) {
      waveHeights.push(windData.waveHeight);
    }
    
    const avgWaveHeight = waveHeights.length > 0 ? 
      waveHeights.reduce((sum, h) => sum + h, 0) / waveHeights.length : 0;
  
  // Aggregate wind data
  const windSpeeds = [...buoyData.map(b => b.windSpeed)];
  if (windData) windSpeeds.push(windData.windSpeed);
  
  const avgWindSpeed = windSpeeds.length > 0 ? 
    windSpeeds.reduce((sum, s) => sum + s, 0) / windSpeeds.length : 0;
  
  // Get most common wind direction
  const windDirections = [...buoyData.map(b => b.windDirection)];
  if (windData) windDirections.push(windData.windDirection);
  
  const windDirection = getMostCommonDirection(windDirections);
  
  // Aggregate water temperature from multiple sources
  const waterTemps = buoyData.map(b => b.waterTemp);
  
  let finalWaterTempF = 60; // Default to 60°F for Lake Superior summer
  
  // Try buoy data first
  if (waterTemps.length > 0) {
    const avgWaterTempC = waterTemps.reduce((sum, t) => sum + t, 0) / waterTemps.length;
    
    // Convert to Fahrenheit and validate
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
  
  // Calculate confidence based on data consistency
  const waveConfidence = calculateConfidence(waveHeights);
  const windConfidence = calculateConfidence(windSpeeds);
  
  // Include Windy wave period if available
  if (windData && windData.wavePeriod) {
    wavePeriods.push(windData.wavePeriod);
  }
  
  // Calculate surf likelihood and generate notes
  const avgWavePeriod = wavePeriods.length > 0 ? 
      wavePeriods.reduce((sum, p) => sum + p, 0) / wavePeriods.length : 0;
  
  const surfLikelihood = calculateSurfLikelihood(avgWaveHeight, avgWavePeriod, avgWindSpeed, windDirection, spotId);
  
  // Generate notes
  const notes: string[] = [];
  
  // Check for pressure drops (seiche risk)
  if (detectPressureDrop(buoyData)) {
    notes.push('Seiche risk — rapid pressure drop');
  }
  
  // Add wind-related notes
  const windNotes = generateWindNotes(avgWindSpeed);
  notes.push(...windNotes);
  
  // Add wind direction note if unfavorable
  const isFavorableWind = isFavorableWindDirection(spotId, windDirection);
  if (!isFavorableWind && windDirection) {
    const spotConfig = surfSpotsConfig[spotId as keyof typeof surfSpotsConfig];
    const spotName = spotConfig ? spotConfig.name : spotId;
    notes.push(`Unfavorable wind direction (${windDirection}) for ${spotName}`);
  }
  
  // Generate comprehensive surf report
  const surfReport = generateUserSummary(
    { min: Math.max(0, avgWaveHeight - 0.5), max: avgWaveHeight + 0.5, unit: 'ft' },
    avgWavePeriod,
    avgWindSpeed,
    windDirection,
    finalWaterTempF,
    surfLikelihood,
    notes
  );
  
  // Generate human-readable conditions
  const conditions = generateConditionsDescription(avgWaveHeight, avgWindSpeed, windDirection, finalWaterTempF);
  const recommendations = generateSurfRecommendations(avgWaveHeight, avgWindSpeed, windDirection, finalWaterTempF);
  
  return {
    waveHeight: {
      min: Math.max(0, avgWaveHeight - 0.5),
      max: avgWaveHeight + 0.5,
      unit: 'ft',
      sources: buoyData.map(b => b.source),
      confidence: waveConfidence
    },
    wind: {
      speed: Math.round(avgWindSpeed), // Already in mph from our APIs
      direction: windDirection,
      unit: 'mph',
      sources: [...buoyData.map(b => b.source), ...(windData ? [windData.source] : [])],
      confidence: windConfidence
    },
    swell: buoyData.map(b => ({
      height: b.waveHeight,
      period: b.wavePeriod,
      direction: b.waveDirection,
      sources: [b.source]
    })),
    waterTemp: {
      value: Math.round(finalWaterTempF),
      unit: 'F',
      sources: [...buoyData.map(b => b.source), ...(waterData.waterTemp !== null ? ['noaa-water-temp'] : [])]
    },
    rating: calculateSurfRating(avgWaveHeight, avgWindSpeed, windDirection),
    conditions,
    recommendations,
    surfLikelihood,
    surfReport,
    notes
  };
};

/**
 * Calculate surf likelihood based on Lake Superior conditions
 */
// Wind direction helper for Lake Superior surf spots
export const isFavorableWindDirection = (spotId: string, windDirection: string): boolean => {
  if (!windDirection) return true; // If no direction data, assume favorable
  
  const direction = windDirection.toUpperCase();
  
  // Check if spot is in our configuration
  const spotConfig = surfSpotsConfig[spotId as keyof typeof surfSpotsConfig];
  
  if (!spotConfig) {
    // Default: assume favorable unless clearly offshore
    const defaultUnfavorable = ['SW', 'W', 'WSW'];
    return !defaultUnfavorable.includes(direction);
  }
  
  // Check if wind direction is in the offshore wind list for this spot
  const isOffshore = spotConfig.offshoreWind.includes(direction);
  
  return !isOffshore;
};

const calculateSurfLikelihood = (
  waveHeight: number,
  wavePeriod: number,
  windSpeed: number,
  windDirection?: string,
  spotId: string = 'duluth'
): 'Flat' | 'Maybe Surf' | 'Good' | 'Firing' => {
  // Check wind direction first
  const isFavorableWind = isFavorableWindDirection(spotId, windDirection || '');
  
  // Calculate base likelihood without wind direction consideration
  let baseLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing';
  
  if (waveHeight < 0.5) {
    baseLikelihood = 'Flat';
  } else if (waveHeight >= 0.5 && waveHeight < 1.5 && wavePeriod >= 4) {
    baseLikelihood = 'Maybe Surf';
  } else if (waveHeight >= 1.5 && waveHeight < 3 && wavePeriod >= 5 && windSpeed < 12) {
    baseLikelihood = 'Good';
  } else if (waveHeight >= 3 && wavePeriod >= 6 && windSpeed < 12) {
    baseLikelihood = 'Firing';
  } else {
    baseLikelihood = 'Maybe Surf';
  }
  
  // If wind is unfavorable, downgrade by one tier
  if (!isFavorableWind) {
    switch (baseLikelihood) {
      case 'Firing':
        return 'Good';
      case 'Good':
        return 'Maybe Surf';
      case 'Maybe Surf':
        return 'Flat';
      case 'Flat':
        return 'Flat'; // Can't go lower
      default:
        return 'Maybe Surf';
    }
  }
  
  return baseLikelihood;
};

/**
 * Detect pressure drops for seiche risk
 */
const detectPressureDrop = (buoyData: BuoyData[]): boolean => {
  if (buoyData.length < 2) return false;
  
  // Sort by timestamp to get recent data
  const sortedData = buoyData
    .filter(b => b.source.includes('weather')) // Only weather stations have pressure
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (sortedData.length < 2) return false;
  
  // For now, skip seiche detection since pressure data isn't parsed from NDBC
  // In the future, we could enhance parseBuoyData to extract pressure values
  // and track pressure changes over time

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
 * Generate human-readable surf summary
 */
const generateUserSummary = (
  waveHeight: { min: number; max: number; unit: string },
  wavePeriod: number,
  windSpeed: number,
  windDirection: string,
  waterTemp: number,
  surfLikelihood: 'Flat' | 'Maybe Surf' | 'Good' | 'Firing',
  notes: string[]
): string => {
  // Generate short, human-readable captions
  switch (surfLikelihood) {
    case 'Flat':
      return 'Flat conditions today. No surf expected.';
    case 'Maybe Surf':
      return 'Maybe surf. Watch for a bump later today.';
    case 'Good':
      return 'Good conditions — grab your board.';
    case 'Firing':
      return 'Firing! Best window early afternoon.';
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
  const windSpeedMph = windSpeed * 2.23694;
  if (windSpeedMph < 5) description += " with light winds";
  else if (windSpeedMph < 10) description += " with light breeze";
  else if (windSpeedMph < 15) description += " with moderate winds";
  else if (windSpeedMph < 20) description += " with strong winds";
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
  windDirection: string,
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
  const windSpeedMph = windSpeed * 2.23694;
  if (windSpeedMph > 20) {
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
const calculateSurfRating = (waveHeight: number, windSpeed: number, windDirection: string): number => {
  let rating = 1;
  
  // Base rating on wave height
  if (waveHeight > 3) rating = 8;
  else if (waveHeight > 2) rating = 6;
  else if (waveHeight > 1) rating = 4;
  else if (waveHeight > 0.5) rating = 2;
  else rating = 1;
  
  // Adjust for wind (offshore is better)
  const windSpeedMph = windSpeed * 2.23694;
  if (windSpeedMph > 20) rating = Math.max(1, rating - 2);
  else if (windSpeedMph > 15) rating = Math.max(1, rating - 1);
  
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

const getWindDirectionFromDegrees = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
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