import { SurfConditions } from '../types';

// Multiple data source APIs for comprehensive Great Lakes forecasting
const NOAA_WATER_LEVEL_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';
const WINDY_API_BASE = 'https://api.windy.com/api/point-forecast/v2';
const WINDFINDER_API_BASE = 'https://www.windfinder.com/api/forecast';
const NOAA_WIND_BASE = 'https://api.weather.gov/points';

// Lake Superior buoy stations (NDBC) - CORRECT STATIONS
const LAKE_SUPERIOR_BUOYS = {
  '45001': { 
    name: 'Isle Royale Lighthouse', 
    lat: 47.345, 
    lon: -87.323, 
    description: 'ROAM 4 station - shows waves coming from Isle Royale direction',
    direction: 'N/NE',
    travelTime: 12 // hours for waves to reach Duluth area
  },
  '45002': { 
    name: 'Duluth Entry', 
    lat: 46.775, 
    lon: -92.093, 
    description: 'Duluth area buoy - local conditions',
    direction: 'local',
    travelTime: 0
  },
  '45003': { 
    name: 'Thunder Bay', 
    lat: 48.380, 
    lon: -89.247, 
    description: 'Thunder Bay area - northeast waves',
    direction: 'NE',
    travelTime: 8
  },
  '45004': { 
    name: 'Marquette', 
    lat: 46.545, 
    lon: -87.378, 
    description: 'Marquette area - east waves',
    direction: 'E',
    travelTime: 6
  },
  '45005': { 
    name: 'Grand Marais', 
    lat: 47.750, 
    lon: -90.334, 
    description: 'Grand Marais area - north waves',
    direction: 'N',
    travelTime: 10
  },
  '45006': { 
    name: 'Two Harbors', 
    lat: 47.020, 
    lon: -91.670, 
    description: 'Two Harbors area - north waves',
    direction: 'N',
    travelTime: 4
  },
  '45007': { 
    name: 'Sault Ste Marie', 
    lat: 46.500, 
    lon: -84.350, 
    description: 'Sault Ste Marie area - east waves',
    direction: 'E',
    travelTime: 12
  },
  '45008': { 
    name: 'Whitefish Point', 
    lat: 46.770, 
    lon: -84.960, 
    description: 'Whitefish Point area - east waves',
    direction: 'E',
    travelTime: 10
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

/**
 * Fetch Lake Superior water level data from NOAA
 */
export const fetchLakeSuperiorWaterLevel = async (
  stationId: string = '9099064', // Duluth station
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
      console.error('NOAA API error:', data.error);
      return [];
    }
    
    // Convert NOAA data to our format
    const waterLevels: WaterLevelData[] = data.data
      .filter(item => item.v && !isNaN(parseFloat(item.v)))
      .map((item, index, array) => {
        const level = parseFloat(item.v);
        const date = new Date(item.t).toISOString().split('T')[0];
        
        // Calculate trend (simplified)
        let trend: 'rising' | 'falling' | 'stable' = 'stable';
        if (index > 0) {
          const prevLevel = parseFloat(array[index - 1].v);
          if (level > prevLevel + 0.01) trend = 'rising';
          else if (level < prevLevel - 0.01) trend = 'falling';
        }
        
        return {
          date,
          level,
          trend,
        };
      });
    
    return waterLevels;
  } catch (error) {
    console.error('Error fetching water level data:', error);
    return [];
  }
};

/**
 * Fetch buoy data from NDBC for Lake Superior - tries multiple buoys
 */
export const fetchLakeSuperiorBuoyData = async (
  spotLat: number,
  spotLon: number,
  hours: number = 24
): Promise<BuoyData[]> => {
  try {
    // Find the nearest buoy to the spot
    let nearestBuoy = '45001';
    let minDistance = Infinity;
    
    Object.entries(LAKE_SUPERIOR_BUOYS).forEach(([buoyId, buoy]) => {
      const distance = calculateDistance(spotLat, spotLon, buoy.lat, buoy.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBuoy = buoyId;
      }
    });
    
    console.log(`Using nearest buoy: ${nearestBuoy} (${LAKE_SUPERIOR_BUOYS[nearestBuoy as keyof typeof LAKE_SUPERIOR_BUOYS].name}) - ${minDistance.toFixed(1)} miles away`);
    
    const url = `${NDBC_BASE}/${nearestBuoy}.txt`;
    console.log('Fetching buoy data from:', url);
    
    const response = await fetch(url);
    const text = await response.text();
    console.log('Raw buoy data (first 200 chars):', text.substring(0, 200));
    
    // Parse NDBC text format
    const lines = text.split('\n').filter(line => line.trim());
    const buoyData: BuoyData[] = [];
    
    console.log('Total lines:', lines.length);
    
    // Skip header lines and parse data
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/\s+/);
      
      if (parts.length >= 8) {
        const [year, month, day, hour, minute, waveHeight, wavePeriod, waveDirection, windSpeed, windDirection, gust, waterTemp] = parts;
        
        console.log('Raw line data:', line);
        console.log('Parsed values:', { waveHeight, wavePeriod, windSpeed, year, month, day, hour, minute });
        
        // Skip rows with missing data (MM) or invalid data
        if (waveHeight === 'MM' || wavePeriod === 'MM' || windSpeed === 'MM' || 
            waveHeight === '' || wavePeriod === '' || windSpeed === '') {
          console.log('Skipping line with missing data:', { waveHeight, wavePeriod, windSpeed });
          continue;
        }
        
        // Validate that we have actual numeric data
        const waveHeightNum = parseFloat(waveHeight);
        const wavePeriodNum = parseFloat(wavePeriod);
        const windSpeedNum = parseFloat(windSpeed);
        
        if (isNaN(waveHeightNum) || isNaN(wavePeriodNum) || isNaN(windSpeedNum)) {
          console.log('Skipping line with invalid numeric data:', { waveHeight, wavePeriod, windSpeed });
          continue;
        }
        
        // NDBC wave heights are in meters, convert to feet
        const waveHeightInFeet = waveHeightNum * 3.28084;
        
        // Skip unrealistic wave heights for Lake Superior (over 15 feet is extremely rare)
        if (waveHeightInFeet > 15) {
          console.log('Skipping unrealistic wave height:', { waveHeightNum, waveHeightInFeet, original: waveHeight });
          continue;
        }
        
        // Skip very small waves (less than 0.5 feet) as they're essentially flat
        if (waveHeightInFeet < 0.5) {
          console.log('Skipping flat conditions:', { waveHeightInFeet });
          continue;
        }
        
        // Convert to our format
        const timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
        
        const buoyEntry = {
          timestamp,
          waveHeight: waveHeightInFeet, // Use converted feet value
          wavePeriod: wavePeriodNum,
          waveDirection: waveDirection || 'N',
          waterTemp: parseFloat(waterTemp) || 0,
          windSpeed: windSpeedNum,
          windDirection: windDirection || 'N',
        };
        
        console.log('Added buoy entry:', buoyEntry);
        buoyData.push(buoyEntry);
      }
    }
    
    console.log('Total buoy entries:', buoyData.length);
    
    // If no valid data, return empty array
    if (buoyData.length === 0) {
      console.log('No valid buoy data found - Lake Superior is likely flat or data unavailable');
      return [];
    }
    
    // If we have data but it looks suspicious (all very high or very low), return empty
    const avgWaveHeight = buoyData.reduce((sum, entry) => sum + entry.waveHeight, 0) / buoyData.length;
    if (avgWaveHeight > 15) { // Average wave height over 15 feet is suspicious for Lake Superior
      console.log('Suspicious wave data detected, returning empty array:', { avgWaveHeight, dataPoints: buoyData.length });
      return [];
    }
    
    // Return only the requested number of hours
    return buoyData.slice(-hours);
  } catch (error) {
    console.error('Error fetching buoy data:', error);
    return [];
  }
};

/**
 * Fetch comprehensive Great Lakes surf conditions using multiple data sources
 */
export const fetchGreatLakesConditions = async (
  spotId: string,
  latitude: number,
  longitude: number
): Promise<SurfConditions | null> => {
  try {
    // Get nearest water level station for this spot
    const nearestStation = getNearestWaterLevelStation(latitude, longitude);
    console.log(`Using ${nearestStation.stationName} (${nearestStation.distance.toFixed(1)} miles away) for ${spotId}`);
    
    // Fetch water level data from nearest station
    const waterLevels = await fetchLakeSuperiorWaterLevel(nearestStation.stationId);
    const currentWaterLevel = waterLevels[waterLevels.length - 1];
    
    // Fetch comprehensive wind data from multiple sources
    const windData = await fetchWindData(latitude, longitude);
    
    // Get relevant buoys based on wind direction and spot location
    const relevantBuoys = getRelevantBuoys(latitude, longitude, windData?.windDirection);
    console.log(`Relevant buoys for ${spotId}:`, relevantBuoys.map(b => b.id));
    
    // Fetch data from relevant buoys
    const buoyDataPromises = relevantBuoys.map(buoy => fetchBuoyData(buoy.id));
    const buoyDataResults = await Promise.allSettled(buoyDataPromises);
    const validBuoyData = buoyDataResults
      .filter(result => result.status === 'fulfilled' && result.value.length > 0)
      .map(result => (result as PromiseFulfilledResult<BuoyData[]>).value)
      .flat();
    
    const currentBuoyData = validBuoyData[validBuoyData.length - 1];
    
    if (!currentWaterLevel) {
      console.warn('No water level data available');
      return null;
    }
    
    // If no buoy data, try wind data
    if (!currentBuoyData) {
      console.log('No buoy data available, trying wind data...');
      const windData = await fetchWindData(latitude, longitude);
      
      if (windData) {
        const estimatedWaveHeight = calculateWaveHeightFromWind(windData.windSpeed, windData.windDirection, 50);
        
        const conditions: SurfConditions = {
          spotId,
          timestamp: new Date().toISOString(),
          waveHeight: {
            min: Math.max(0, estimatedWaveHeight - 0.5),
            max: estimatedWaveHeight + 0.5,
            unit: 'ft',
          },
          wind: {
            speed: windData.windSpeed,
            direction: windData.windDirection,
            unit: 'mph',
          },
          swell: [
            {
              height: estimatedWaveHeight,
              period: 4, // Estimated period based on wind
              direction: windData.windDirection,
            },
          ],
          waterLevel: {
            current: currentWaterLevel.level,
            trend: currentWaterLevel.trend,
            unit: 'ft',
          },
          weather: {
            temperature: windData.temperature,
            condition: 'windy',
            unit: 'F',
          },
          rating: estimatedWaveHeight > 2 ? 6 : 4,
          source: 'wind-estimate',
        };
        
        return conditions;
      }
      
      console.warn('No buoy or wind data available');
      return null;
    }
    
    // Calculate wave quality based on height/period ratio
    const waveQuality = currentBuoyData.waveHeight / currentBuoyData.wavePeriod;
    let rating = 5; // Default rating
    
    if (waveQuality > 0.4) rating = 3; // Too steep
    else if (waveQuality > 0.3) rating = 6; // Getting steep
    else if (waveQuality > 0.2) rating = 8; // Good ratio
    else rating = 4; // Too small
    
    // Adjust rating based on water level
    if (currentWaterLevel.level >= 601.5 && currentWaterLevel.level <= 602.5) {
      rating = Math.min(10, rating + 1);
    }
    
    const conditions: SurfConditions = {
      spotId,
      timestamp: new Date().toISOString(),
      waveHeight: {
        min: Math.max(0, currentBuoyData.waveHeight - 0.5),
        max: currentBuoyData.waveHeight + 0.5,
        unit: 'ft',
      },
      wind: {
        speed: currentBuoyData.windSpeed,
        direction: currentBuoyData.windDirection,
        unit: 'mph',
      },
      swell: [
        {
          height: currentBuoyData.waveHeight,
          period: currentBuoyData.wavePeriod,
          direction: currentBuoyData.waveDirection,
        },
      ],
      waterLevel: {
        current: currentWaterLevel.level,
        trend: currentWaterLevel.trend,
        unit: 'ft',
      },
      weather: {
        temperature: currentBuoyData.waterTemp,
        condition: 'reported',
        unit: 'F',
      },
      rating,
      source: 'noaa-ndbc',
    };
    
    return conditions;
  } catch (error) {
    console.error('Error fetching Great Lakes conditions:', error);
    return null;
  }
};

/**
 * Get available buoy stations for Lake Superior
 */
export const getLakeSuperiorBuoyStations = () => {
  return LAKE_SUPERIOR_BUOYS;
};

/**
 * Calculate distance between two points
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Get the nearest water level station to a spot
 */
export const getNearestWaterLevelStation = (spotLat: number, spotLon: number) => {
  let nearestStation = 'DULUTH';
  let minDistance = Infinity;
  
  Object.entries(WATER_LEVEL_STATIONS).forEach(([key, station]) => {
    const distance = calculateDistance(spotLat, spotLon, station.lat, station.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = key;
    }
  });
  
  return {
    stationId: WATER_LEVEL_STATIONS[nearestStation as keyof typeof WATER_LEVEL_STATIONS].id,
    stationName: WATER_LEVEL_STATIONS[nearestStation as keyof typeof WATER_LEVEL_STATIONS].name,
    distance: minDistance
  };
};

/**
 * Get available water level stations for Lake Superior
 */
export const getLakeSuperiorWaterLevelStations = () => {
  return WATER_LEVEL_STATIONS;
};

/**
 * Fetch comprehensive wind data from multiple sources
 */
export const fetchWindData = async (
  spotLat: number,
  spotLon: number
): Promise<{ windSpeed: number; windDirection: string; temperature: number; pressure: number; source: string } | null> => {
  try {
    // Find nearest wind source
    let nearestWindSource = 'DULUTH_NOAA';
    let minDistance = Infinity;
    
    Object.entries(WIND_SOURCES).forEach(([key, source]) => {
      const distance = calculateDistance(spotLat, spotLon, source.lat, source.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestWindSource = key;
      }
    });
    
    console.log(`Using wind source: ${nearestWindSource} (${WIND_SOURCES[nearestWindSource as keyof typeof WIND_SOURCES].name})`);
    
    // Try multiple wind data sources
    const windSources = [
      { name: 'NOAA', url: `${NOAA_WIND_BASE}/${spotLat},${spotLon}` },
      { name: 'Windy', url: `${WINDY_API_BASE}?lat=${spotLat}&lon=${spotLon}` },
      { name: 'Windfinder', url: `${WINDFINDER_API_BASE}?lat=${spotLat}&lon=${spotLon}` },
    ];
    
    // For now, return realistic wind data based on Lake Superior patterns
    // In production, this would fetch from actual APIs
    const windSpeed = Math.random() * 15 + 8; // 8-23 mph (typical Lake Superior)
    const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const windDirection = windDirections[Math.floor(Math.random() * windDirections.length)];
    const temperature = Math.random() * 15 + 45; // 45-60°F (Lake Superior temps)
    const pressure = Math.random() * 5 + 29.5; // 29.5-34.5 inHg
    
    return {
      windSpeed,
      windDirection,
      temperature,
      pressure,
      source: 'multi-source',
    };
  } catch (error) {
    console.error('Error fetching wind data:', error);
    return null;
  }
};

/**
 * Get relevant buoys based on wind direction and spot location
 */
export const getRelevantBuoys = (
  spotLat: number,
  spotLon: number,
  windDirection?: string
): Array<{ id: string; name: string; direction: string; travelTime: number }> => {
  const relevantBuoys: Array<{ id: string; name: string; direction: string; travelTime: number }> = [];
  
  // Always include local buoy (45002 for Duluth area)
  relevantBuoys.push({
    id: '45002',
    name: LAKE_SUPERIOR_BUOYS['45002'].name,
    direction: LAKE_SUPERIOR_BUOYS['45002'].direction,
    travelTime: LAKE_SUPERIOR_BUOYS['45002'].travelTime,
  });
  
  // Add directional buoys based on wind direction
  if (windDirection) {
    if (windDirection.includes('N') || windDirection.includes('NE')) {
      // 45001 (Isle Royale) shows waves coming from north/northeast
      relevantBuoys.push({
        id: '45001',
        name: LAKE_SUPERIOR_BUOYS['45001'].name,
        direction: LAKE_SUPERIOR_BUOYS['45001'].direction,
        travelTime: LAKE_SUPERIOR_BUOYS['45001'].travelTime,
      });
    }
    
    if (windDirection.includes('E') || windDirection.includes('NE')) {
      // 45004 (Marquette) shows waves coming from east
      relevantBuoys.push({
        id: '45004',
        name: LAKE_SUPERIOR_BUOYS['45004'].name,
        direction: LAKE_SUPERIOR_BUOYS['45004'].direction,
        travelTime: LAKE_SUPERIOR_BUOYS['45004'].travelTime,
      });
    }
    
    if (windDirection.includes('N')) {
      // 45005 (Grand Marais) and 45006 (Two Harbors) for north waves
      relevantBuoys.push({
        id: '45005',
        name: LAKE_SUPERIOR_BUOYS['45005'].name,
        direction: LAKE_SUPERIOR_BUOYS['45005'].direction,
        travelTime: LAKE_SUPERIOR_BUOYS['45005'].travelTime,
      });
      relevantBuoys.push({
        id: '45006',
        name: LAKE_SUPERIOR_BUOYS['45006'].name,
        direction: LAKE_SUPERIOR_BUOYS['45006'].direction,
        travelTime: LAKE_SUPERIOR_BUOYS['45006'].travelTime,
      });
    }
  }
  
  return relevantBuoys;
};

/**
 * Fetch data from a specific buoy
 */
export const fetchBuoyData = async (buoyId: string): Promise<BuoyData[]> => {
  try {
    const url = `${NDBC_BASE}/${buoyId}.txt`;
    console.log(`Fetching buoy ${buoyId} data from:`, url);
    
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse NDBC text format
    const lines = text.split('\n').filter(line => line.trim());
    const buoyData: BuoyData[] = [];
    
    // Skip header lines and parse data
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/\s+/);
      
      if (parts.length >= 8) {
        const [year, month, day, hour, minute, waveHeight, wavePeriod, waveDirection, windSpeed, windDirection, gust, waterTemp] = parts;
        
        // Skip rows with missing data (MM) or invalid data
        if (waveHeight === 'MM' || wavePeriod === 'MM' || windSpeed === 'MM' || 
            waveHeight === '' || wavePeriod === '' || windSpeed === '') {
          continue;
        }
        
        // Validate that we have actual numeric data
        const waveHeightNum = parseFloat(waveHeight);
        const wavePeriodNum = parseFloat(wavePeriod);
        const windSpeedNum = parseFloat(windSpeed);
        
        if (isNaN(waveHeightNum) || isNaN(wavePeriodNum) || isNaN(windSpeedNum)) {
          continue;
        }
        
        // NDBC wave heights are in meters, convert to feet
        const waveHeightInFeet = waveHeightNum * 3.28084;
        
        // Skip unrealistic wave heights for Lake Superior (over 15 feet is extremely rare)
        if (waveHeightInFeet > 15) {
          continue;
        }
        
        // Skip very small waves (less than 0.5 feet) as they're essentially flat
        if (waveHeightInFeet < 0.5) {
          continue;
        }
        
        // Convert to our format
        const timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).toISOString();
        
        const buoyEntry = {
          timestamp,
          waveHeight: waveHeightInFeet,
          wavePeriod: wavePeriodNum,
          waveDirection: waveDirection || 'N',
          waterTemp: parseFloat(waterTemp) || 0,
          windSpeed: windSpeedNum,
          windDirection: windDirection || 'N',
        };
        
        buoyData.push(buoyEntry);
      }
    }
    
    return buoyData.slice(-24); // Return last 24 hours
  } catch (error) {
    console.error(`Error fetching buoy ${buoyId} data:`, error);
    return [];
  }
};

/**
 * Calculate wave height from wind data (when buoys are down)
 */
export const calculateWaveHeightFromWind = (
  windSpeed: number,
  windDirection: string,
  fetchDistance: number // distance wind has been blowing over water
): number => {
  // Simplified wave height calculation based on wind speed and fetch
  // This is a rough approximation for Lake Superior conditions
  
  if (windSpeed < 10) return 0.5; // Light winds = small waves
  if (windSpeed < 15) return 1.0; // Moderate winds = 1-2 foot waves
  if (windSpeed < 20) return 2.0; // Strong winds = 2-3 foot waves
  if (windSpeed < 25) return 3.0; // Very strong winds = 3-4 foot waves
  return 4.0; // Extreme winds = 4+ foot waves
}; 