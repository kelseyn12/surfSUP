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

// North Shore MN spots: face ENE into the lake, need NE/ENE/E wind for waves
const NORTH_SHORE_SPOTS = [
  'stoneypoint', 'parkpoint', 'lesterriver', 'brightonbeach',
  'boulders', 'guardrails', 'frenchriver', 'floodbay', 'beaverbay',
  'grandmaraismn', 'duluth'
];

// South Shore WI/MI spots: face N/NNE, need N/NW/W wind for waves
const SOUTH_SHORE_SPOTS = [
  'marquette', 'ashland', 'cornucopia', 'grandmaraismi'
];

/**
 * Check if wind direction creates favorable swell for a spot.
 * On Lake Superior all waves are wind-generated (no groundswell),
 * so swell-favorable = wind blowing FROM open lake toward shore.
 */
export const checkSwellDirections = (spotId: string, windDegrees: number): boolean => {
  const id = spotId.toLowerCase();

  if (NORTH_SHORE_SPOTS.includes(id)) {
    // NE–E (20°–110°) blows across max fetch toward North Shore
    return windDegrees >= 20 && windDegrees <= 110;
  }

  if (SOUTH_SHORE_SPOTS.includes(id)) {
    // N–NW (310°–360° or 0°–50°) blows toward South Shore
    return windDegrees >= 310 || windDegrees <= 50;
  }

  // Unknown spot — default to true so it doesn't silently hide data
  return true;
};

/**
 * Check local wind quality for a spot.
 *
 * On Lake Superior, swell is generated by onshore wind — the same wind that
 * makes waves also makes them choppy. "Clean" happens when wind has shifted
 * offshore after building swell, or is sideshore. "Strong" = blown out.
 *
 * Thresholds reflect real Lake Superior surfing: people go out in 20-30mph
 * NE gales. "Blown Out" is reserved for extreme/unsafe wind (35+ mph).
 */
export const checkLocalWindQuality = (spotId: string, windDegrees: number, windSpeed: number): 'clean' | 'onshore' | 'strong' => {
  const id = spotId.toLowerCase();

  // Blown out overrides everything — 35mph is genuinely unsafe on Lake Superior
  if (windSpeed > 35) {
    return 'strong';
  }

  if (NORTH_SHORE_SPOTS.includes(id)) {
    // Stoney Point faces more NE than the other Duluth spots
    const isStoney = id === 'stoneypoint';

    // Offshore/clean winds blow from land toward lake (W/SW/NW for North Shore)
    const cleanMin = isStoney ? 250 : 210;
    const cleanMax = isStoney ? 330 : 280;
    if (windDegrees >= cleanMin && windDegrees <= cleanMax) {
      return 'clean';
    }

    // Onshore: NE–E blows from lake toward shore (creates waves but choppy)
    if (windDegrees >= 20 && windDegrees <= 110) {
      return 'onshore';
    }

    // Everything else (S, SSE, NNW, etc.) is sideshore — treat as clean
    return 'clean';
  }

  if (SOUTH_SHORE_SPOTS.includes(id)) {
    // Offshore for South Shore = S/SE/SW winds
    if (windDegrees >= 130 && windDegrees <= 230) {
      return 'clean';
    }

    // Onshore: N/NW blows from lake toward South Shore
    if (windDegrees >= 310 || windDegrees <= 50) {
      return 'onshore';
    }

    return 'clean';
  }

  // Unknown spot
  return 'onshore';
};

/**
 * Adjust rating based on local wind quality and speed.
 *
 * Lake Superior context: onshore (NE/E) wind is the norm for surf days —
 * it's what generates the waves. Mild onshore wind doesn't mean bad surf.
 * Only downgrade for strong onshore wind (>20mph) which creates real chop.
 */
export const adjustRatingForLocalWinds = (
  baseRating: 'Maybe Surf' | 'Good' | 'Firing',
  windQuality: 'clean' | 'onshore' | 'strong',
  windSpeed: number = 0
): 'Maybe Surf' | 'Good' | 'Firing' | 'Blown Out' => {
  switch (windQuality) {
    case 'clean':
      return baseRating;

    case 'onshore':
      // Mild onshore (≤20mph): waves exist and are surfable, no downgrade
      if (windSpeed <= 20) return baseRating;
      // Moderate onshore (20–35mph): choppier, downgrade one step
      switch (baseRating) {
        case 'Firing':   return 'Good';
        case 'Good':     return 'Maybe Surf';
        case 'Maybe Surf': return 'Maybe Surf';
        default:         return baseRating;
      }

    case 'strong':
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