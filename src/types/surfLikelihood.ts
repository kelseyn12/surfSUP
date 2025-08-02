/**
 * Surf likelihood enum for type safety
 */
export enum SurfLikelihood {
  FLAT = 'Flat',
  MAYBE_SURF = 'Maybe Surf',
  GOOD = 'Good',
  FIRING = 'Firing'
}

/**
 * Type for surf likelihood values
 */
export type SurfLikelihoodType = `${SurfLikelihood}`;

/**
 * Per-spot surf thresholds configuration
 */
export interface SpotSurfThresholds {
  flatMax: number;        // Max wave height for flat conditions
  maybeMin: number;       // Min wave height for maybe surf
  maybePeriodMin: number; // Min period for maybe surf
  goodMin: number;        // Min wave height for good surf
  goodPeriodMin: number;  // Min period for good surf
  goodWindMax: number;    // Max wind speed for good surf
  firingMin: number;      // Min wave height for firing
  firingPeriodMin: number; // Min period for firing
  firingWindMax: number;  // Max wind speed for firing
}

/**
 * Default Lake Superior surf thresholds
 */
export const DEFAULT_SURF_THRESHOLDS: SpotSurfThresholds = {
  flatMax: 0.5,
  maybeMin: 0.5,
  maybePeriodMin: 4,
  goodMin: 1.5,
  goodPeriodMin: 5,
  goodWindMax: 12,
  firingMin: 3,
  firingPeriodMin: 6,
  firingWindMax: 12
};

/**
 * Per-spot surf thresholds (can be customized per spot)
 */
export const SPOT_SURF_THRESHOLDS: Record<string, Partial<SpotSurfThresholds>> = {
  // Example: Stoney Point might need bigger waves due to exposure
  'stoneypoint': {
    goodMin: 2.0,
    firingMin: 3.5
  },
  // Example: Park Point might work with smaller waves
  'parkpoint': {
    goodMin: 1.0,
    firingMin: 2.5
  }
  // Add more spot-specific thresholds as needed
}; 