/**
 * Lake Superior surf spots configuration with detailed wind direction logic
 */

// Wind direction constants and types
export const WIND_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
] as const;

export type WindDirection = typeof WIND_DIRECTIONS[number];

// Wind check result type for consistent return values
export type WindCheckResult = {
  isIdeal: boolean;
  isMarginal: boolean;
  isBlocked: boolean;
  note: string | null;
};

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
    idealWindDirections: ['E', 'SE', 'S'] as WindDirection[],
    marginalWindDirections: ['ENE', 'SSE', 'SW'] as WindDirection[],
    blockedWindDirections: ['NW', 'N'] as WindDirection[],
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
 * Type-safe helper to create spot configurations
 * Ensures all wind directions are valid at compile time
 */
const createSpotConfig = (config: SurfSpotConfig): SurfSpotConfig => config;

/**
 * Validate spot configuration at runtime
 * @param spotId - The spot ID to validate
 * @param config - The spot configuration to validate
 */
const validateSpotConfig = (spotId: string, config: SurfSpotConfig): void => {
  const allDirections = [
    ...config.idealWindDirections,
    ...(config.marginalWindDirections || []),
    ...(config.blockedWindDirections || [])
  ];
  
  const invalidDirections = allDirections.filter(dir => !WIND_DIRECTIONS.includes(dir));
  if (invalidDirections.length > 0) {
    throw new Error(`Invalid wind directions for ${spotId}: ${invalidDirections.join(', ')}`);
  }
  
  // Check for overlapping directions
  const ideal = new Set(config.idealWindDirections);
  const marginal = new Set(config.marginalWindDirections || []);
  const blocked = new Set(config.blockedWindDirections || []);
  
  const overlaps = [...ideal].filter(dir => marginal.has(dir) || blocked.has(dir));
  if (overlaps.length > 0) {
    console.warn(`Overlapping wind directions for ${spotId}: ${overlaps.join(', ')}`);
  }
};

/**
 * Normalize wind direction to standard format and validate
 * @param direction - The wind direction string to normalize
 * @returns Normalized WindDirection or null if invalid
 */
export const normalizeWindDirection = (direction: string): WindDirection | null => {
  if (!direction) return null;
  
  const normalized = direction.toUpperCase();
  return WIND_DIRECTIONS.includes(normalized as WindDirection) ? (normalized as WindDirection) : null;
};

/**
 * Check wind direction against spot configuration
 * @param spotId - The spot ID to check against
 * @param windDirection - The wind direction to check
 * @returns WindCheckResult with detailed information
 */
export const checkWindDirection = (spotId: string, windDirection: string): WindCheckResult => {
  if (!windDirection) {
    return { isIdeal: true, isMarginal: false, isBlocked: false, note: null };
  }

  const spotConfig = surfSpotsConfig[spotId];
  if (!spotConfig) {
    console.warn(`Unknown wind configuration for spotId: ${spotId}`);
    return { isIdeal: true, isMarginal: false, isBlocked: false, note: null };
  }

  // Normalize and validate wind direction
  const normalizedDirection = normalizeWindDirection(windDirection);
  if (!normalizedDirection) {
    console.warn(`Invalid wind direction: ${windDirection} (expected one of: ${WIND_DIRECTIONS.join(', ')})`);
    return { isIdeal: true, isMarginal: false, isBlocked: false, note: null };
  }

  // Use Sets for O(1) lookups instead of O(n) array includes
  const idealSet = new Set(spotConfig.idealWindDirections);
  const marginalSet = new Set(spotConfig.marginalWindDirections || []);
  const blockedSet = new Set(spotConfig.blockedWindDirections || []);

  const isIdeal = idealSet.has(normalizedDirection);
  const isMarginal = marginalSet.has(normalizedDirection);
  const isBlocked = blockedSet.has(normalizedDirection);

  let note = null;
  if (isIdeal) {
    note = `Ideal wind direction for ${spotConfig.name}.`;
  } else if (isBlocked) {
    note = `Unfavorable wind direction (${normalizedDirection}) for ${spotConfig.name}.`;
  } else if (isMarginal) {
    note = `Not ideal wind direction (${normalizedDirection}) — may produce waves with enough fetch.`;
  }

  return { isIdeal, isMarginal, isBlocked, note };
};

/**
 * Get spot configuration by ID
 */
export const getSpotConfig = (spotId: string): SurfSpotConfig | undefined => {
  return surfSpotsConfig[spotId];
};

/**
 * Check if wind direction is favorable for surfing at a specific spot
 */
export const isFavorableWindDirection = (spotId: string, windDirection: string): boolean => {
  if (!windDirection) return true; // If no wind direction, assume favorable
  
  const windCheck = checkWindDirection(spotId, windDirection);
  return windCheck.isIdeal || windCheck.isMarginal; // Allow both ideal and marginal directions
};

/**
 * Generate wind direction notes using the enhanced surfConfig logic
 */
export const generateWindDirectionNotes = (spotId: string, windDirection: string): string[] => {
  if (!windDirection) return [];
  
  const windCheck = checkWindDirection(spotId, windDirection);
  const notes: string[] = [];
  
  // Use the normalized direction from the wind check for consistency
  const normalizedDirection = normalizeWindDirection(windDirection);
  
  if (windCheck.isIdeal) {
    notes.push(`Ideal wind direction (${normalizedDirection || windDirection}) for ${windCheck.note || 'surfing'}.`);
  } else if (windCheck.isMarginal) {
    notes.push(windCheck.note || `Marginal wind direction (${normalizedDirection || windDirection}) — may produce waves with enough fetch.`);
  } else if (windCheck.isBlocked) {
    notes.push(windCheck.note || `Unfavorable wind direction (${normalizedDirection || windDirection}) for ${getSpotConfig(spotId)?.name || 'this spot'}.`);
  }
  
  return notes;
};

/**
 * Debug utility: Get all configured spots
 */
export const getAllConfiguredSpots = (): SurfSpotConfig[] =>
  Object.values(surfSpotsConfig);

/**
 * Debug utility: Get all spot IDs
 */
export const getAllSpotIds = (): string[] =>
  Object.keys(surfSpotsConfig);

/**
 * Debug utility: Get spots by confidence level
 */
export const getSpotsByConfidence = (confidence: 'high' | 'medium' | 'low'): SurfSpotConfig[] =>
  Object.values(surfSpotsConfig).filter(spot => spot.confidence === confidence);

/**
 * Debug utility: Get fallback spots
 */
export const getFallbackSpots = (): SurfSpotConfig[] =>
  Object.values(surfSpotsConfig).filter(spot => spot.isFallback);

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
  const config = getSpotConfig(spotId);
  return config?.name || `Unknown Spot (${spotId})`;
}; 

/**
 * Convert Windy API wind components to cardinal direction
 */
export const convertWindyWindDirection = (windU: number, windV: number): string => {
  const degrees = Math.atan2(windV, windU) * 180 / Math.PI;
  return getWindDirectionFromDegrees(degrees);
};

/**
 * Convert degrees to cardinal direction
 */
export const getWindDirectionFromDegrees = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Generate documentation for a spot's wind configuration
 * @param spotId - The spot ID to document
 * @returns Formatted documentation string
 */
export const generateSpotDocumentation = (spotId: string): string => {
  const config = getSpotConfig(spotId);
  if (!config) return `No configuration found for ${spotId}`;
  
  return `
Spot: ${config.name} (${spotId})
Confidence: ${config.confidence}
${config.isFallback ? '⚠️  Fallback configuration' : ''}

Wind Directions:
- Ideal: ${config.idealWindDirections.join(', ')}
- Marginal: ${config.marginalWindDirections?.join(', ') || 'None'}
- Blocked: ${config.blockedWindDirections?.join(', ') || 'None'}
`.trim();
};

/**
 * Generate a simple wind rose representation for a spot
 * @param spotId - The spot ID to generate wind rose for
 * @returns ASCII wind rose representation
 */
export const generateWindRose = (spotId: string): string => {
  const config = getSpotConfig(spotId);
  if (!config) return `No configuration found for ${spotId}`;
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idealSet = new Set(config.idealWindDirections);
  const marginalSet = new Set(config.marginalWindDirections || []);
  const blockedSet = new Set(config.blockedWindDirections || []);
  
  let rose = `Wind Rose for ${config.name}:\n`;
  rose += '    N    \n';
  rose += '  NW   NE  \n';
  rose += 'W         E\n';
  rose += '  SW   SE  \n';
  rose += '    S    \n\n';
  
  rose += 'Legend:\n';
  rose += '🟢 Ideal  🟡 Marginal  🔴 Blocked  ⚪ Other\n\n';
  
  directions.forEach(dir => {
    let symbol = '⚪';
    if (idealSet.has(dir as WindDirection)) symbol = '🟢';
    else if (marginalSet.has(dir as WindDirection)) symbol = '🟡';
    else if (blockedSet.has(dir as WindDirection)) symbol = '🔴';
    
    rose += `${symbol} ${dir}\n`;
  });
  
  return rose;
};

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