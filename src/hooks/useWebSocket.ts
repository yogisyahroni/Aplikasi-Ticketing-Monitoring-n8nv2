import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface WebSocketHookReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

export const useWebSocket = (): WebSocketHookReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const socket = io('http://localhost:3001', {
      auth: {
        token: accessToken
      },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('connected', (data) => {
      console.log('WebSocket connection confirmed:', data);
      toast.success('Connected to real-time updates');
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      
      if (error.message.includes('Authentication error')) {
        toast.error('Authentication failed for real-time updates');
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      toast.success('Reconnected to real-time updates');
    });

    socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      toast.error('Failed to reconnect to real-time updates');
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [accessToken, isAuthenticated]);

  const emit = (event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    on,
    off,
  };
};

// Hook for specific real-time events
export const useRealTimeUpdates = () => {
  const { on, off, isConnected } = useWebSocket();
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useEffect(() => {
    if (!isConnected) return;

    const handleTicketUpdate = (data: any) => {
      console.log('Ticket updated:', data);
      setLastUpdate({ type: 'ticket_updated', ...data });
      toast.info(`Ticket ${data.data.uid} has been updated`);
    };

    const handleTicketCreated = (data: any) => {
      console.log('Ticket created:', data);
      setLastUpdate({ type: 'ticket_created', ...data });
      toast.success(`New ticket ${data.data.uid} created`);
    };

    const handleBroadcastUpdate = (data: any) => {
      console.log('Broadcast updated:', data);
      setLastUpdate({ type: 'broadcast_updated', ...data });
    };

    const handleDashboardUpdate = (data: any) => {
      console.log('Dashboard updated:', data);
      setLastUpdate({ type: 'dashboard_updated', ...data });
    };

    const handleNotification = (data: any) => {
      console.log('Notification received:', data);
      toast.info(data.data.message || 'New notification received');
    };

    // Subscribe to events
    on('ticket:updated', handleTicketUpdate);
    on('ticket:created', handleTicketCreated);
    on('broadcast:updated', handleBroadcastUpdate);
    on('dashboard:updated', handleDashboardUpdate);
    on('notification', handleNotification);

    // Cleanup
    return () => {
      off('ticket:updated', handleTicketUpdate);
      off('ticket:created', handleTicketCreated);
      off('broadcast:updated', handleBroadcastUpdate);
      off('dashboard:updated', handleDashboardUpdate);
      off('notification', handleNotification);
    };
  }, [isConnected, on, off]);

  return {
    isConnected,
    lastUpdate,
  };
};