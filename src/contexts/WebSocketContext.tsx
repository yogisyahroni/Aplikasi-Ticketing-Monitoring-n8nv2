import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket, useRealTimeUpdates } from '../hooks/useWebSocket';

interface WebSocketContextType {
  isConnected: boolean;
  connectionError: string | null;
  lastUpdate: any;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isConnected, connectionError, emit, on, off } = useWebSocket();
  const { lastUpdate } = useRealTimeUpdates();

  const value: WebSocketContextType = {
    isConnected,
    connectionError,
    lastUpdate,
    emit,
    on,
    off,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};