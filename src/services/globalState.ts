/**
 * Global State Service
 *
 * Shared in-memory state for surfer counts and check-in status.
 * Spot IDs are derived dynamically from the spots registry — adding a spot
 * to spots.json automatically includes it here.
 */
import { getAllSpots } from '../utils/spotHelpers';

// Initialize maps from the live spot registry so new spots are included automatically
function buildInitialCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  getAllSpots().forEach(spot => { counts[spot.id] = 0; });
  return counts;
}

function buildInitialCheckIns(): Record<string, boolean> {
  const checkIns: Record<string, boolean> = {};
  getAllSpots().forEach(spot => { checkIns[spot.id] = false; });
  return checkIns;
}

// Global surfer counts that all components can access
export const globalSurferCounts: Record<string, number> = buildInitialCounts();

// Global list of which spots the user is checked into
export const userCheckIns: Record<string, boolean> = buildInitialCheckIns();

// Call this function to update the global surfer count
export const updateGlobalSurferCount = (spotId: string, count: number): void => {
  globalSurferCounts[spotId] = count;
};

// Call this function to update check-in status
export const updateUserCheckedInStatus = (spotId: string, isCheckedIn: boolean): void => {
  // If checking in to a spot, make sure user is checked out everywhere else
  if (isCheckedIn) {
    Object.keys(userCheckIns).forEach(id => {
      userCheckIns[id] = (id === spotId);
    });
  } else {
    // Just update the specific spot
    userCheckIns[spotId] = isCheckedIn;
  }
};

// Helper to get the current surfer count
export const getGlobalSurferCount = (spotId: string): number => {
  return globalSurferCounts[spotId] || 0;
};

// Helper to check if user is checked in at a specific spot
export const isUserCheckedInAt = (spotId: string): boolean => {
  return userCheckIns[spotId] || false;
};
