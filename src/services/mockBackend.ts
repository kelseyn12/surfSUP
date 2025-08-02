import { CheckIn, SurfSpot } from '../types';
import { 
  globalSurferCounts, 
  updateGlobalSurferCount, 
  updateUserCheckedInStatus 
} from './globalState';
import webSocketService, { 
  WebSocketMessageType, 
  SurferCountUpdateMessage,
  CheckInStatusMessage
} from './websocket';
import { emitSurferCountUpdated, emitCheckInStatusChanged } from './events';

// Mock database for storing active check-ins and surfer counts
let activeSurferCounts: Record<string, number> = {
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

// Initialize with empty arrays for all spots to avoid undefined
let activeCheckIns: Record<string, CheckIn[]> = {
  'stoneypoint': [],
  'boulders': [],
  'guardrails': [],
  'lesterriver': [],
  'brightonbeach': [],
  'frenchriver': [],
  'parkpoint': [],
  'floodbay': [],
  'beaverbay': [],
  'grandmaraismn': [],
  'marquette': [],
  'ashland': [],
  'cornucopia': [],
  'grandmaraismi': [],
  'duluth': [],
};

/**
 * Clear all active check-ins and reset surfer counts
 */
export const resetAllCheckInsAndCounts = () => {
  // Reset all surfer counts to 0
  Object.keys(activeSurferCounts).forEach(spotId => {
    activeSurferCounts[spotId] = 0;
    updateGlobalSurferCount(spotId, 0);
  });
  
  // Clear all active check-ins
  Object.keys(activeCheckIns).forEach(spotId => {
    activeCheckIns[spotId] = [];
  });
  
  // Broadcast updates via WebSocket
  Object.keys(activeSurferCounts).forEach(spotId => {
    webSocketService.send({
      type: WebSocketMessageType.SURFER_COUNT_UPDATE,
      payload: {
        spotId,
        count: 0,
        lastUpdated: new Date().toISOString()
      }
    });
  });
};

/**
 * Initialize the global state with our initial data
 */
export const initializeMockBackend = () => {
  Object.keys(activeSurferCounts).forEach(spotId => {
    updateGlobalSurferCount(spotId, activeSurferCounts[spotId]);
  });
  
  // Reset everything on app initialization
  resetAllCheckInsAndCounts();
};

/**
 * Get the current active surfer count for a spot
 */
export const getSurferCount = async (spotId: string): Promise<number> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Make sure we're returning the most current count from global state
    const currentCount = globalSurferCounts[spotId] || 0;
    
    // Also update the local state to ensure it's in sync
    activeSurferCounts[spotId] = currentCount;
    
    return currentCount;
  } catch (error) {
    console.error('Error getting surfer count:', error);
    return 0;
  }
};

/**
 * Check in to a surf spot
 */
export const checkInToSpot = async (
  userId: string, 
  spotId: string, 
  data?: Partial<CheckIn>
): Promise<CheckIn | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate expiration time (2 hours from now by default)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    
    const checkIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      userId,
      spotId,
      timestamp: now.toISOString(),
      expiresAt,
      isActive: true,
      conditions: data?.conditions,
      comment: data?.comment,
      imageUrls: data?.imageUrls,
    };
    
    // Add to active check-ins
    if (!activeCheckIns[spotId]) {
      activeCheckIns[spotId] = [];
    }
    activeCheckIns[spotId].push(checkIn);
    
    // Increment surfer count
    if (!activeSurferCounts[spotId]) {
      activeSurferCounts[spotId] = 0;
    }
    activeSurferCounts[spotId]++;
    
    // Update the global user check-in status
    updateUserCheckedInStatus(spotId, true);
    
    // Create WebSocket messages
    const surferCountMsg: SurferCountUpdateMessage = {
      spotId,
      count: activeSurferCounts[spotId],
      lastUpdated: now.toISOString()
    };
    
    const checkInStatusMsg: CheckInStatusMessage = {
      userId,
      spotId,
      isCheckedIn: true,
      timestamp: now.toISOString()
    };
    
    // Send WebSocket messages to notify all clients
    webSocketService.send({
      type: WebSocketMessageType.SURFER_COUNT_UPDATE,
      payload: surferCountMsg
    });
    
    webSocketService.send({
      type: WebSocketMessageType.CHECK_IN_STATUS_CHANGE,
      payload: checkInStatusMsg
    });
    
    // For backward compatibility, still emit events
    emitCheckInStatusChanged(spotId, true);
    emitSurferCountUpdated(spotId, activeSurferCounts[spotId]);
    
    return checkIn;
  } catch (error) {
    console.error('Error checking in to spot:', error);
    return null;
  }
};

/**
 * Check out from a surf spot
 */
export const checkOutFromSpot = async (checkInId: string): Promise<boolean> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Find the check-in
    let foundSpotId: string | null = null;
    let foundCheckIn: CheckIn | null = null;
    
    for (const spotId in activeCheckIns) {
      const checkInIndex = activeCheckIns[spotId].findIndex(checkin => checkin.id === checkInId);
      if (checkInIndex >= 0) {
        foundSpotId = spotId;
        foundCheckIn = activeCheckIns[spotId][checkInIndex];
        // Remove from active check-ins
        activeCheckIns[spotId].splice(checkInIndex, 1);
        break;
      }
    }
    
    if (foundSpotId && foundCheckIn) {
      // Update the global user check-in status
      updateUserCheckedInStatus(foundSpotId, false);
      
      // Decrement surfer count
      if (activeSurferCounts[foundSpotId] > 0) {
        activeSurferCounts[foundSpotId]--;
      }
      
      const now = new Date();
      
      // Create WebSocket messages
      const surferCountMsg: SurferCountUpdateMessage = {
        spotId: foundSpotId,
        count: activeSurferCounts[foundSpotId],
        lastUpdated: now.toISOString()
      };
      
      const checkInStatusMsg: CheckInStatusMessage = {
        userId: foundCheckIn.userId,
        spotId: foundSpotId,
        isCheckedIn: false,
        timestamp: now.toISOString()
      };
      
      // Send WebSocket messages to notify all clients
      webSocketService.send({
        type: WebSocketMessageType.SURFER_COUNT_UPDATE,
        payload: surferCountMsg
      });
      
      webSocketService.send({
        type: WebSocketMessageType.CHECK_IN_STATUS_CHANGE,
        payload: checkInStatusMsg
      });
      
      // For backward compatibility, still emit events
      emitCheckInStatusChanged(foundSpotId, false);
      emitSurferCountUpdated(foundSpotId, activeSurferCounts[foundSpotId]);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking out from spot:', error);
    return false;
  }
};

/**
 * Get active check-in for a user at a specific spot
 */
export const getActiveCheckInForUser = async (
  userId: string, 
  spotId: string
): Promise<CheckIn | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if this spot has active check-ins
    if (!activeCheckIns[spotId]) {
      return null;
    }
    
    // Find active check-in for this user at this spot
    const activeCheckIn = activeCheckIns[spotId].find(
      checkin => checkin.userId === userId && checkin.isActive
    );
    
    return activeCheckIn || null;
  } catch (error) {
    console.error('Error getting active check-in:', error);
    return null;
  }
};

/**
 * Get active check-in for a user at any spot
 */
export const getActiveCheckInForUserAnywhere = async (
  userId: string
): Promise<CheckIn | null> => {
  try {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check all spots for an active check-in by this user
    for (const spotId in activeCheckIns) {
      const checkIn = activeCheckIns[spotId].find(
        checkin => checkin.userId === userId && checkin.isActive
      );
      
      if (checkIn) {
        return checkIn;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting active check-in anywhere:', error);
    return null;
  }
}; 