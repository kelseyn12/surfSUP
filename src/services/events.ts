/**
 * A simple event system to handle global app events
 */

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  // Add an event listener
  on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  // Remove an event listener
  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  // Emit an event to all listeners
  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

// Event types
export enum AppEvents {
  CHECK_IN_STATUS_CHANGED = 'check_in_status_changed',
  SURFER_COUNT_UPDATED = 'surfer_count_updated',
}

// Create a singleton instance
export const eventEmitter = new EventEmitter();

// Helper functions
export const emitCheckInStatusChanged = (spotId: string, isCheckedIn: boolean): void => {
  eventEmitter.emit(AppEvents.CHECK_IN_STATUS_CHANGED, { spotId, isCheckedIn });
};

export const emitSurferCountUpdated = (spotId: string, count: number): void => {
  eventEmitter.emit(AppEvents.SURFER_COUNT_UPDATED, { spotId, count });
};

export default eventEmitter; 