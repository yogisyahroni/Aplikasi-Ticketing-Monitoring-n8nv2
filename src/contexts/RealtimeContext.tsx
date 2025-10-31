import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeHelpers } from '../lib/supabase';
import { Ticket, BroadcastLog, TicketComment } from '../lib/database.types';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
  // Tickets
  tickets: Ticket[];
  ticketComments: { [ticketId: string]: TicketComment[] };
  
  // Broadcast Logs
  broadcastLogs: BroadcastLog[];
  
  // Connection status
  isConnected: boolean;
  
  // Methods
  subscribeToTickets: () => void;
  unsubscribeFromTickets: () => void;
  subscribeToTicketComments: (ticketId: string) => void;
  unsubscribeFromTicketComments: (ticketId: string) => void;
  subscribeToBroadcastLogs: () => void;
  unsubscribeFromBroadcastLogs: () => void;
  
  // Manual refresh methods
  refreshTickets: () => Promise<void>;
  refreshBroadcastLogs: () => Promise<void>;
  refreshTicketComments: (ticketId: string) => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketComments, setTicketComments] = useState<{ [ticketId: string]: TicketComment[] }>({});
  const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Store active subscriptions
  const [subscriptions, setSubscriptions] = useState<{
    tickets?: RealtimeChannel;
    broadcastLogs?: RealtimeChannel;
    ticketComments: { [ticketId: string]: RealtimeChannel };
  }>({ ticketComments: {} });

  // Fetch initial data
  const refreshTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }, []);

  const refreshBroadcastLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/broadcast-logs');
      if (response.ok) {
        const data = await response.json();
        setBroadcastLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching broadcast logs:', error);
    }
  }, []);

  const refreshTicketComments = useCallback(async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setTicketComments(prev => ({
          ...prev,
          [ticketId]: data.comments || []
        }));
      }
    } catch (error) {
      console.error('Error fetching ticket comments:', error);
    }
  }, []);

  // Subscription methods
  const subscribeToTickets = useCallback(() => {
    if (subscriptions.tickets || !user) return;

    const subscription = realtimeHelpers.subscribeToTableChanges(
      'tickets',
      (payload) => {
        console.log('Tickets real-time update:', payload);
        
        switch (payload.eventType) {
          case 'INSERT':
            setTickets(prev => [...prev, payload.new as Ticket]);
            break;
          case 'UPDATE':
            setTickets(prev => prev.map(ticket => 
              ticket.id === payload.new.id ? payload.new as Ticket : ticket
            ));
            break;
          case 'DELETE':
            setTickets(prev => prev.filter(ticket => ticket.id !== payload.old.id));
            break;
        }
      },
      (status) => {
        console.log('Tickets subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      }
    );

    setSubscriptions(prev => ({ ...prev, tickets: subscription }));
  }, [subscriptions.tickets, user]);

  const unsubscribeFromTickets = useCallback(() => {
    if (subscriptions.tickets) {
      realtimeHelpers.unsubscribe(subscriptions.tickets);
      setSubscriptions(prev => ({ ...prev, tickets: undefined }));
    }
  }, [subscriptions.tickets]);

  const subscribeToTicketComments = useCallback((ticketId: string) => {
    if (subscriptions.ticketComments[ticketId] || !user) return;

    const subscription = realtimeHelpers.subscribeToTableChanges(
      'ticket_comments',
      (payload) => {
        console.log('Ticket comments real-time update:', payload);
        
        // Only process comments for the specific ticket
        const comment = payload.new || payload.old;
        if (comment && comment.ticket_id === ticketId) {
          switch (payload.eventType) {
            case 'INSERT':
              setTicketComments(prev => ({
                ...prev,
                [ticketId]: [...(prev[ticketId] || []), payload.new as TicketComment]
              }));
              break;
            case 'UPDATE':
              setTicketComments(prev => ({
                ...prev,
                [ticketId]: (prev[ticketId] || []).map(comment => 
                  comment.id === payload.new.id ? payload.new as TicketComment : comment
                )
              }));
              break;
            case 'DELETE':
              setTicketComments(prev => ({
                ...prev,
                [ticketId]: (prev[ticketId] || []).filter(comment => comment.id !== payload.old.id)
              }));
              break;
          }
        }
      },
      (status) => {
        console.log(`Ticket comments subscription status for ${ticketId}:`, status);
      },
      `ticket_id=eq.${ticketId}` // Filter for specific ticket
    );

    setSubscriptions(prev => ({
      ...prev,
      ticketComments: { ...prev.ticketComments, [ticketId]: subscription }
    }));
  }, [subscriptions.ticketComments, user]);

  const unsubscribeFromTicketComments = useCallback((ticketId: string) => {
    const subscription = subscriptions.ticketComments[ticketId];
    if (subscription) {
      realtimeHelpers.unsubscribe(subscription);
      setSubscriptions(prev => {
        const newTicketComments = { ...prev.ticketComments };
        delete newTicketComments[ticketId];
        return { ...prev, ticketComments: newTicketComments };
      });
    }
  }, [subscriptions.ticketComments]);

  const subscribeToBroadcastLogs = useCallback(() => {
    if (subscriptions.broadcastLogs || !user || userProfile?.role === 'user') return;

    const subscription = realtimeHelpers.subscribeToTableChanges(
      'broadcast_logs',
      (payload) => {
        console.log('Broadcast logs real-time update:', payload);
        
        switch (payload.eventType) {
          case 'INSERT':
            setBroadcastLogs(prev => [...prev, payload.new as BroadcastLog]);
            break;
          case 'UPDATE':
            setBroadcastLogs(prev => prev.map(log => 
              log.id === payload.new.id ? payload.new as BroadcastLog : log
            ));
            break;
          case 'DELETE':
            setBroadcastLogs(prev => prev.filter(log => log.id !== payload.old.id));
            break;
        }
      },
      (status) => {
        console.log('Broadcast logs subscription status:', status);
      }
    );

    setSubscriptions(prev => ({ ...prev, broadcastLogs: subscription }));
  }, [subscriptions.broadcastLogs, user, userProfile?.role]);

  const unsubscribeFromBroadcastLogs = useCallback(() => {
    if (subscriptions.broadcastLogs) {
      realtimeHelpers.unsubscribe(subscriptions.broadcastLogs);
      setSubscriptions(prev => ({ ...prev, broadcastLogs: undefined }));
    }
  }, [subscriptions.broadcastLogs]);

  // Auto-subscribe when user logs in
  useEffect(() => {
    if (user && userProfile) {
      // Always subscribe to tickets
      subscribeToTickets();
      
      // Subscribe to broadcast logs for admin/agent users
      if (userProfile.role === 'admin' || userProfile.role === 'agent') {
        subscribeToBroadcastLogs();
      }
      
      // Load initial data
      refreshTickets();
      if (userProfile.role === 'admin' || userProfile.role === 'agent') {
        refreshBroadcastLogs();
      }
    }
    
    return () => {
      // Cleanup subscriptions when user logs out
      unsubscribeFromTickets();
      unsubscribeFromBroadcastLogs();
      Object.keys(subscriptions.ticketComments).forEach(ticketId => {
        unsubscribeFromTicketComments(ticketId);
      });
    };
  }, [user, userProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(subscriptions).forEach(subscription => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
      Object.values(subscriptions.ticketComments).forEach(subscription => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
    };
  }, []);

  const value: RealtimeContextType = {
    tickets,
    ticketComments,
    broadcastLogs,
    isConnected,
    subscribeToTickets,
    unsubscribeFromTickets,
    subscribeToTicketComments,
    unsubscribeFromTicketComments,
    subscribeToBroadcastLogs,
    unsubscribeFromBroadcastLogs,
    refreshTickets,
    refreshBroadcastLogs,
    refreshTicketComments,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};