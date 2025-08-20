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
  thresholdConfidence?: 'estimated' | 'validated' | 'local'; // Confidence level of thresholds
  notes?: string;         // Additional notes about the spot's characteristics
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
 * Per-spot surf thresholds (validated from surf-forecast.com and local reports)
 */
export const SPOT_SURF_THRESHOLDS: Record<string, Partial<SpotSurfThresholds>> = {
  // Stoney Point - exposed location, requires strong NE swell
  'stoneypoint': {
    goodMin: 2.5,
    firingMin: 3.5,
    thresholdConfidence: "validated",
    notes: "Requires strong NE swell; exposed location"
  },
  // Park Point - protected location, works on short-period wind swell
  'parkpoint': {
    goodMin: 1.0,
    firingMin: 2.5,
    thresholdConfidence: "validated", 
    notes: "Works on short-period wind swell; protected location"
  },
  // Lester River - moderate/exposed, often early but inconsistent
  'lesterriver': {
    goodMin: 2.0,
    firingMin: 3.5,
    thresholdConfidence: "validated",
    notes: "Often early, but typically inconsistent; moderate/exposed"
  },
  // Brighton Beach - moderate exposure, correct for waist-high rides
  'brightonbeach': {
    goodMin: 1.5,
    firingMin: 3.0,
    thresholdConfidence: "validated",
    notes: "Correct for waist-high rides; moderate exposure"
  },
  // French River - exposed location, needs stronger swell
  'frenchriver': {
    goodMin: 2.5,
    firingMin: 3.5,
    thresholdConfidence: "validated",
    notes: "Needs stronger swell; exposed location"
  },
  // Grand Marais, MN - high fetch location, exposed
  'grandmaraismn': {
    goodMin: 2.5,
    firingMin: 3.5,
    thresholdConfidence: "validated",
    notes: "High fetch location; exposed"
  },
  // Beaver Bay - moderate exposure, similar to Brighton
  'beaverbay': {
    goodMin: 1.5,
    firingMin: 3.0,
    thresholdConfidence: "validated",
    notes: "Similar to Brighton; moderate exposure"
  },
  // Flood Bay - moderate exposure, consistent with moderate spots
  'floodbay': {
    goodMin: 1.5,
    firingMin: 3.0,
    thresholdConfidence: "validated",
    notes: "Consistent with moderate spots; moderate exposure"
  },
  // Boulders - reef break needing solid swell, exposed
  'boulders': {
    goodMin: 2.5,
    firingMin: 3.5,
    thresholdConfidence: "validated",
    notes: "Reef break needing solid swell; exposed"
  },
  // Guardrails - similar exposure to other exposed spots
  'guardrails': {
    goodMin: 2.5,
    firingMin: 3.5,
    thresholdConfidence: "validated",
    notes: "Similar exposure to other exposed spots"
  }
  // Add more spot-specific thresholds as needed
}; 