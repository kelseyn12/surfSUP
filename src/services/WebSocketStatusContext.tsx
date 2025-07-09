import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import webSocketService, { WebSocketMessageType, ConnectionStatusMessage, WebSocketStatus } from './websocket';

export type WebSocketStatusContextValue = WebSocketStatus & {
  reconnectAttempt: number;
  reconnectDelay: number;
  reconnectCountdown: number;
};

const WebSocketStatusContext = createContext<WebSocketStatusContextValue>({ connected: false, error: null, reconnectAttempt: 0, reconnectDelay: 0, reconnectCountdown: 0 });

export const WebSocketStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<WebSocketStatusContextValue>({ connected: false, error: null, reconnectAttempt: 0, reconnectDelay: 0, reconnectCountdown: 0 });
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const lastReconnectAttempt = useRef<number>(0);

  useEffect(() => {
    const updateStatus = (message: ConnectionStatusMessage) => {
      setStatus(prev => ({
        connected: message.connected,
        error: message.error || null,
        reconnectAttempt: webSocketService.currentReconnectAttempt,
        reconnectDelay: webSocketService.currentReconnectDelay,
        reconnectCountdown: prev.reconnectCountdown, // preserve countdown
      }));
    };

    const unsubscribe = webSocketService.subscribe<ConnectionStatusMessage>(
      WebSocketMessageType.CONNECTION_STATUS,
      (message) => {
        updateStatus(message.payload);
      }
    );
    // Connect on mount
    webSocketService.connect().catch((error) => {
      setStatus(prev => ({ ...prev, connected: false, error: error.message, reconnectAttempt: webSocketService.currentReconnectAttempt, reconnectDelay: webSocketService.currentReconnectDelay, reconnectCountdown: prev.reconnectCountdown }));
    });
    return () => {
      unsubscribe();
      webSocketService.disconnect();
    };
  }, []);

  // Live countdown effect
  useEffect(() => {
    // Only start countdown if reconnecting and not already started for this attempt
    if (
      status.error &&
      status.reconnectDelay > 0 &&
      status.reconnectAttempt > 0 &&
      status.reconnectAttempt < 5 &&
      lastReconnectAttempt.current !== status.reconnectAttempt
    ) {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      let countdown = Math.round(status.reconnectDelay / 1000);
      setStatus(prev => ({ ...prev, reconnectCountdown: countdown }));
      lastReconnectAttempt.current = status.reconnectAttempt;
      countdownInterval.current = setInterval(() => {
        countdown -= 1;
        setStatus(prev => ({ ...prev, reconnectCountdown: countdown }));
        if (countdown <= 0) {
          if (countdownInterval.current) clearInterval(countdownInterval.current);
        }
      }, 1000);
    }
    // Stop countdown if connected or max attempts reached
    if (!status.error || status.reconnectAttempt >= 5) {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      setStatus(prev => ({ ...prev, reconnectCountdown: 0 }));
      lastReconnectAttempt.current = 0;
    }
    // Cleanup on unmount
    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [status.error, status.reconnectDelay, status.reconnectAttempt]);

  return (
    <WebSocketStatusContext.Provider value={status}>
      {children}
    </WebSocketStatusContext.Provider>
  );
};

export const useWebSocketStatus = () => useContext(WebSocketStatusContext); 