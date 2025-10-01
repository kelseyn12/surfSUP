/**
 * Lake Superior surf spots configuration with sophisticated wind direction logic
 * This replaces the old simple wind blocking logic with intelligent swell vs local wind analysis
 */

// Wind direction constants and types
export const WIND_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
] as const;

export type WindDirection = typeof WIND_DIRECTIONS[number];

export interface SurfSpotConfig {
  name: string;
  idealWindDirections: WindDirection[];      // e.g., ["NE", "ENE", "E"]
  marginalWindDirections?: WindDirection[];  // optional fallback (e.g., ["N"])
  blockedWindDirections?: WindDirection[];   // optional strong offshores (e.g., ["SW", "W"])
  confidence: 'high' | 'medium' | 'low';
  isFallback?: boolean; // Flag for fallback/default configurations
}

export const surfSpotsConfig: Record<string, SurfSpotConfig> = {
  stoneypoint: {
    name: 'Stoney Point',
    idealWindDirections: ['NE', 'ENE', 'E', 'NNE'] as WindDirection[],
    marginalWindDirections: ['N'] as WindDirection[],
    blockedWindDirections: ['SW', 'W', 'NW'] as WindDirection[],
    confidence: 'high',
  },
  boulders: {
    name: 'Boulders',
    idealWindDirections: ['NE', 'ENE', 'E'] as WindDirection[],
    marginalWindDirections: ['N'] as WindDirection[],
    blockedWindDirections: ['W', 'SW'] as WindDirection[],
    confidence: 'low',
  },
  guardrails: {
    name: 'Guardrails',
    idealWindDirections: ['NE', 'ENE', 'E'] as WindDirection[],
    marginalWindDirections: ['NNE'] as WindDirection[],
    blockedWindDirections: ['SW', 'W', 'NW'] as WindDirection[],
    confidence: 'low',
  },
  lesterriver: {
    name: 'Lester River',
    idealWindDirections: ['NE', 'E', 'ENE'] as WindDirection[],
    marginalWindDirections: ['NNE', 'SE'] as WindDirection[],
    blockedWindDirections: ['NW', 'W', 'SW'] as WindDirection[],
    confidence: 'high',
  },
  brightonbeach: {
    name: 'Brighton Beach',
    idealWindDirections: ['E', 'NE'] as WindDirection[],
    marginalWindDirections: ['NNE', 'ENE'] as WindDirection[],
    blockedWindDirections: ['SW', 'W'] as WindDirection[],
    confidence: 'high',
  },
  frenchriver: {
    name: 'French River',
    idealWindDirections: ['NE', 'ENE'] as WindDirection[],
    marginalWindDirections: ['E'] as WindDirection[],
    blockedWindDirections: ['SW', 'W', 'NW'] as WindDirection[],
    confidence: 'high',
  },
  parkpoint: {
    name: 'Park Point',
    idealWindDirections: ['E', 'N', 'NE', 'NNE'] as WindDirection[],
    marginalWindDirections: ['ENE', 'NNE', 'NW'] as WindDirection[],
    blockedWindDirections: ['W', 'WNW', 'SW', 'SSW'] as WindDirection[],
    confidence: 'high',
  },
  floodbay: {
    name: 'Flood Bay',
    idealWindDirections: ['NE', 'E'] as WindDirection[],
    marginalWindDirections: ['ENE'] as WindDirection[],
    blockedWindDirections: ['SW', 'W'] as WindDirection[],
    confidence: 'medium',
  },
  beaverbay: {
    name: 'Beaver Bay',
    idealWindDirections: ['E', 'NE', 'ENE'] as WindDirection[],
    marginalWindDirections: ['NNE'] as WindDirection[],
    blockedWindDirections: ['SW', 'W', 'NW'] as WindDirection[],
    confidence: 'medium',
  },
  grandmaraismn: {
    name: 'Grand Marais, MN',
    idealWindDirections: ['E', 'SE'] as WindDirection[],
    marginalWindDirections: ['S'] as WindDirection[],
    blockedWindDirections: ['W', 'NW'] as WindDirection[],
    confidence: 'high',
  },
  // South Shore
  marquette: {
    name: 'Marquette',
    idealWindDirections: ['W', 'WNW'] as WindDirection[],
    marginalWindDirections: ['NW'] as WindDirection[],
    blockedWindDirections: ['E', 'NE', 'SE'] as WindDirection[],
    confidence: 'high',
  },
  ashland: {
    name: 'Ashland',
    idealWindDirections: ['WNW', 'NW'] as WindDirection[],
    marginalWindDirections: ['W'] as WindDirection[],
    blockedWindDirections: ['E', 'NE', 'SE'] as WindDirection[],
    confidence: 'medium',
  },
  cornucopia: {
    name: 'Cornucopia',
    idealWindDirections: ['NW', 'WNW'] as WindDirection[],
    marginalWindDirections: ['W'] as WindDirection[],
    blockedWindDirections: ['E', 'NE', 'SE'] as WindDirection[],
    confidence: 'medium',
  },
  grandmaraismi: {
    name: 'Grand Marais, MI',
    idealWindDirections: ['W', 'WNW'] as WindDirection[],
    marginalWindDirections: ['NW'] as WindDirection[],
    blockedWindDirections: ['E', 'NE', 'SE'] as WindDirection[],
    confidence: 'high',
  },
  // Fallback for unknown spots - explicitly marked as fallback
  duluth: {
    name: 'Duluth Area (Fallback)',
    idealWindDirections: ['NE', 'E'] as WindDirection[],
    marginalWindDirections: ['NNE', 'ENE'] as WindDirection[],
    blockedWindDirections: ['SW', 'W', 'NW'] as WindDirection[],
    confidence: 'medium',
    isFallback: true,
  },
};

// Spot ID type for better type safety
export type SpotId = keyof typeof surfSpotsConfig;

/**
 * Convert wind direction from cardinal to degrees
 */
export const convertWindDirectionToDegrees = (direction: string): number => {
  const directionMap: { [key: string]: number } = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
  };
  return directionMap[direction.toUpperCase()] || 0;
};

/**
 * Convert degrees to cardinal wind direction
 */
export const getWindDirectionFromDegrees = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Check if wind direction creates favorable swell for a spot
 */
export const checkSwellDirections = (spotId: string, windDegrees: number): boolean => {
  // North Shore (MN spots) - include variations of park point
  if (['duluth', 'parkpoint', 'park-point', 'park_point', 'lester', 'stoney', 'brighton'].includes(spotId.toLowerCase())) {
    // NE–E (30°–100°) creates swell across the lake
    return windDegrees >= 30 && windDegrees <= 100;
  }
  
  // South Shore (WI/MI spots)
  if (['marquette', 'ashland', 'cornucopia', 'grandmarais'].includes(spotId.toLowerCase())) {
    // N–NE (330°–60°) creates swell
    return (windDegrees >= 330 || windDegrees <= 60);
  }
  
  // Default to true for unknown spots
  return true;
};

/**
 * Check local wind quality for a spot
 */
export const checkLocalWindQuality = (spotId: string, windDegrees: number, windSpeed: number): 'clean' | 'onshore' | 'strong' => {
  // North Shore (MN spots) - include variations of park point
  if (['duluth', 'parkpoint', 'park-point', 'park_point', 'lester', 'brighton'].includes(spotId.toLowerCase())) {
    // Clean local winds: W–SW (220°–260°)
    if (windDegrees >= 220 && windDegrees <= 260) {
      return 'clean';
    }
    // Onshore local winds: E–NE (still swell-making but messy)
    if (windDegrees >= 30 && windDegrees <= 100) {
      return 'onshore';
    }
  }
  
  // Stoney Point has different clean wind sector
  if (spotId.toLowerCase() === 'stoney') {
    // Clean local winds: W–NW (260°–320°)
    if (windDegrees >= 260 && windDegrees <= 320) {
      return 'clean';
    }
    // Onshore local winds: E–NE (still swell-making but messy)
    if (windDegrees >= 30 && windDegrees <= 100) {
      return 'onshore';
    }
  }
  
  // South Shore (WI/MI spots)
  if (['marquette', 'ashland', 'cornucopia', 'grandmarais'].includes(spotId.toLowerCase())) {
    // Clean local winds: S–SE (150°–120°)
    if (windDegrees >= 120 && windDegrees <= 150) {
      return 'clean';
    }
    // Onshore local winds: N–NE (still swell-making but messy)
    if (windDegrees >= 330 || windDegrees <= 60) {
      return 'onshore';
    }
  }
  
  // Strong winds override everything
  if (windSpeed > 18) {
    return 'strong';
  }
  
  // Default to onshore for unknown conditions
  return 'onshore';
};

/**
 * Adjust rating based on local wind quality
 */
export const adjustRatingForLocalWinds = (
  baseRating: 'Maybe Surf' | 'Good' | 'Firing', 
  windQuality: 'clean' | 'onshore' | 'strong'
): 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out' => {
  switch (windQuality) {
    case 'clean':
      // Clean/offshore winds maintain or improve rating
      return baseRating;
    
    case 'onshore':
      // Onshore winds downgrade rating but don't block surf entirely
      switch (baseRating) {
        case 'Firing':
          return 'Good'; // Downgrade from Firing to Good
        case 'Good':
          return 'Maybe Surf'; // Downgrade from Good to Maybe Surf
        case 'Maybe Surf':
          return 'Maybe Surf'; // Keep Maybe Surf
        default:
          return baseRating;
      }
    
    case 'strong':
      // Strong winds blow out conditions
      return 'Blown Out';
    
    default:
      return baseRating;
  }
};

/**
 * Generate wind direction notes using our new sophisticated logic
 */
export const generateWindDirectionNotes = (spotId: string, windDirection: string, windSpeed: number): string[] => {
  if (!windDirection) return [];
  
  const windDegrees = convertWindDirectionToDegrees(windDirection);
  const hasFavorableSwell = checkSwellDirections(spotId, windDegrees);
  const localWindQuality = checkLocalWindQuality(spotId, windDegrees, windSpeed);
  
  const notes: string[] = [];
  
  if (hasFavorableSwell) {
    if (localWindQuality === 'clean') {
      notes.push(`Clean offshore winds from ${windDirection} - ideal conditions`);
    } else if (localWindQuality === 'onshore') {
      notes.push(`Swell-building winds from ${windDirection} but local conditions may be choppy`);
    } else if (localWindQuality === 'strong') {
      notes.push(`Strong winds from ${windDirection} - conditions may be blown out`);
    }
  } else {
    notes.push(`Wind from ${windDirection} - not favorable for swell generation`);
  }
  
  return notes;
};

/**
 * Check if wind direction is favorable for surfing at a specific spot
 */
export const isFavorableWindDirection = (spotId: string, windDirection: string, windSpeed: number): boolean => {
  if (!windDirection) return true; // If no wind direction, assume favorable
  
  const windDegrees = convertWindDirectionToDegrees(windDirection);
  const hasFavorableSwell = checkSwellDirections(spotId, windDegrees);
  const localWindQuality = checkLocalWindQuality(spotId, windDegrees, windSpeed);
  
  // Wind is favorable if it creates swell AND isn't too strong
  return hasFavorableSwell && localWindQuality !== 'strong';
};

/**
 * Validate if a spot ID exists in configuration
 */
export const isValidSpotId = (spotId: string): boolean => {
  return spotId in surfSpotsConfig;
};

/**
 * Get spot name by ID with fallback
 */
export const getSpotName = (spotId: string): string => {
  const config = surfSpotsConfig[spotId];
  return config?.name || `Unknown Spot (${spotId})`;
};

/**
 * Get all configured spots
 */
export const getAllConfiguredSpots = (): SurfSpotConfig[] =>
  Object.values(surfSpotsConfig);

/**
 * Get all spot IDs
 */
export const getAllSpotIds = (): string[] =>
  Object.keys(surfSpotsConfig);

/**
 * Get spots by confidence level
 */
export const getSpotsByConfidence = (confidence: 'high' | 'medium' | 'low'): SurfSpotConfig[] =>
  Object.values(surfSpotsConfig).filter(spot => spot.confidence === confidence);

/**
 * Get fallback spots
 */
export const getFallbackSpots = (): SurfSpotConfig[] =>
  Object.values(surfSpotsConfig).filter(spot => spot.isFallback);

/**
 * Export all spot configurations as a structured object for documentation
 */
export const exportSpotConfigurations = () => {
  return Object.entries(surfSpotsConfig).reduce((acc, [spotId, config]) => {
    acc[spotId] = {
      name: config.name,
      confidence: config.confidence,
      isFallback: config.isFallback || false,
      windDirections: {
        ideal: config.idealWindDirections,
        marginal: config.marginalWindDirections || [],
        blocked: config.blockedWindDirections || []
      }
    };
    return acc;
  }, {} as Record<string, any>);
}; 