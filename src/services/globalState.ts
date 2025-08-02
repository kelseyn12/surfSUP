/**
 * Global State Service
 * 
 * A simple service to share state across components without complex state management.
 * This helps ensure all components display consistent data.
 */

// Global surfer counts that all components can access
export const globalSurferCounts: Record<string, number> = {
  'stoneypoint': 0,
  'boulders': 0,
  'guardrails': 0,
  'lesterriver': 0,
  'brightonbeach': 0,
  'frenchriver': 0,
  'parkpoint': 0,
  'floodbay': 0,
  'beaverbay': 0,
  'grandmaraismn': 0,
  'marquette': 0,
  'ashland': 0,
  'cornucopia': 0,
  'grandmaraismi': 0,
  'duluth': 0,
};

// Global list of which spots the user is checked into
export const userCheckIns: Record<string, boolean> = {
  'stoneypoint': false,
  'boulders': false,
  'guardrails': false,
  'lesterriver': false,
  'brightonbeach': false,
  'frenchriver': false,
  'parkpoint': false,
  'floodbay': false,
  'beaverbay': false,
  'grandmaraismn': false,
  'marquette': false,
  'ashland': false,
  'cornucopia': false,
  'grandmaraismi': false,
  'duluth': false,
};

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