/**
 * WebSocket Service
 * 
 * This is a mock WebSocket implementation that simulates real-time updates.
 * In a production app, this would connect to a real WebSocket server.
 */

import { globalSurferCounts, updateGlobalSurferCount, updateUserCheckedInStatus } from './globalState';
import { emitSurferCountUpdated, emitCheckInStatusChanged } from './events';

// Types for the messages
export enum WebSocketMessageType {
  SURFER_COUNT_UPDATE = 'SURFER_COUNT_UPDATE',
  CHECK_IN_STATUS_CHANGE = 'CHECK_IN_STATUS_CHANGE',
  CONNECTION_STATUS = 'CONNECTION_STATUS',
}

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
}

export interface SurferCountUpdateMessage {
  spotId: string;
  count: number;
  lastUpdated: string;
}

export interface CheckInStatusMessage {
  userId: string;
  spotId: string;
  isCheckedIn: boolean;
  timestamp: string;
}

export interface ConnectionStatusMessage {
  connected: boolean;
  error?: string;
}

export type WebSocketStatus = {
  connected: boolean;
  error?: string | null;
};

// Subscribers will receive messages based on the type they're interested in
type MessageCallback<T = unknown> = (message: WebSocketMessage<T>) => void;

class WebSocketService {
  private _isConnected: boolean = false;
  private subscribers: Map<WebSocketMessageType, MessageCallback[]> = new Map();
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectDelay: number = 2000; // Start with 2 seconds
  private readonly MAX_RECONNECT_DELAY = 30000; // Max 30 seconds

  // Public getter for connection status
  get isConnected(): boolean {
    return this._isConnected;
  }

  get currentReconnectAttempt(): number {
    return this.reconnectAttempts;
  }

  get currentReconnectDelay(): number {
    return this.reconnectDelay;
  }

  // Connect to the WebSocket server
  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (__DEV__) console.log('[WebSocket] Connecting...');

      setTimeout(() => {
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000;
        if (__DEV__) console.log('[WebSocket] Connected');

        this.broadcastMessage({
          type: WebSocketMessageType.CONNECTION_STATUS,
          payload: { connected: true }
        });

        resolve(true);
      }, 1000);
    });
  }

  // Disconnect from the WebSocket server
  public disconnect(): void {
    if (!this._isConnected) return;

    if (__DEV__) console.log('[WebSocket] Disconnecting...');
    this._isConnected = false;

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    // Notify subscribers
    this.broadcastMessage({
      type: WebSocketMessageType.CONNECTION_STATUS,
      payload: { connected: false, error: 'Disconnected from server' }
    });
  }

  // Handle connection errors and attempt reconnection
  private handleConnectionError(error: Error): void {
    this._isConnected = false;

    this.broadcastMessage({
      type: WebSocketMessageType.CONNECTION_STATUS,
      payload: { connected: false, error: error.message }
    });

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      if (__DEV__) {
        console.log(`[WebSocket] Reconnecting (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${this.reconnectDelay / 1000}s`);
      }
      this.broadcastMessage({
        type: WebSocketMessageType.CONNECTION_STATUS,
        payload: {
          connected: false,
          error: `Reconnecting (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`,
        }
      });
      this.reconnectInterval = setTimeout(() => {
        this.connect().catch(() => {});
      }, this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.MAX_RECONNECT_DELAY);
    } else {
      if (__DEV__) console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  // Subscribe to a message type
  public subscribe<T = unknown>(type: WebSocketMessageType, callback: MessageCallback<T>): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    
    this.subscribers.get(type)?.push(callback as MessageCallback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(type);
      if (callbacks) {
        const index = callbacks.indexOf(callback as MessageCallback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Send a message to the server
  public send<T>(message: WebSocketMessage<T>): void {
    if (!this._isConnected) {
      if (__DEV__) console.warn('[WebSocket] Cannot send message: not connected');
      return;
    }
    
    // In a real implementation, this would send the message to the server
    // For the mock implementation, we'll just echo it back after a delay
    setTimeout(() => {
      // Handle message based on type
      switch (message.type) {
        case WebSocketMessageType.SURFER_COUNT_UPDATE:
          this.handleSurferCountUpdate(message.payload as SurferCountUpdateMessage);
          break;
        case WebSocketMessageType.CHECK_IN_STATUS_CHANGE:
          this.handleCheckInStatusChange(message.payload as CheckInStatusMessage);
          break;
        default:
          if (__DEV__) console.warn(`[WebSocket] Unhandled message type: ${message.type}`);
      }
    }, 300);
  }

  // Handle a surfer count update message
  private handleSurferCountUpdate(data: SurferCountUpdateMessage): void {
    // Update the global state
    updateGlobalSurferCount(data.spotId, data.count);
    
    // Emit event for components that are still using the event system
    emitSurferCountUpdated(data.spotId, data.count);
    
    // Broadcast to subscribers
    this.broadcastMessage({
      type: WebSocketMessageType.SURFER_COUNT_UPDATE,
      payload: data
    });
  }

  // Handle a check-in status change message
  private handleCheckInStatusChange(data: CheckInStatusMessage): void {
    // Update the global state
    updateUserCheckedInStatus(data.spotId, data.isCheckedIn);
    
    // Emit event for components that are still using the event system
    emitCheckInStatusChanged(data.spotId, data.isCheckedIn);
    
    // Broadcast to subscribers
    this.broadcastMessage({
      type: WebSocketMessageType.CHECK_IN_STATUS_CHANGE,
      payload: data
    });
  }

  // Broadcast a message to all subscribers of a specific type
  private broadcastMessage<T>(message: WebSocketMessage<T>): void {
    const callbacks = this.subscribers.get(message.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        if (__DEV__) console.error('[WebSocket] Error in subscriber callback:', error);
      }
    });
  }
}

// Create and export a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 