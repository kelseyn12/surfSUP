/**
 * Global State Service
 * 
 * A simple service to share state across components without complex state management.
 * This helps ensure all components display consistent data.
 */

// Global surfer counts that all components can access
export const globalSurferCounts: Record<string, number> = {
  'stonypoint': 0,
  'parkpoint': 0,
  'lesterriver': 0,
  'superiorentry': 0,
};

// Global list of which spots the user is checked into
export const userCheckIns: Record<string, boolean> = {
  'stonypoint': false,
  'parkpoint': false,
  'lesterriver': false,
  'superiorentry': false,
};

// Call this function to update the global surfer count
export const updateGlobalSurferCount = (spotId: string, count: number): void => {
  console.log(`[GLOBAL STATE] Setting surfer count for ${spotId} to ${count}`);
  globalSurferCounts[spotId] = count;
};

// Call this function to update check-in status
export const updateUserCheckedInStatus = (spotId: string, isCheckedIn: boolean): void => {
  console.log(`[GLOBAL STATE] Setting check-in status for ${spotId} to ${isCheckedIn}`);
  
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