import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { supabase } from '../lib/supabase';
import { 
  Ticket, 
  TicketInsert, 
  TicketUpdate, 
  BroadcastLog, 
  BroadcastLogInsert, 
  BroadcastLogUpdate,
  TicketComment,
  TicketCommentInsert,
  TicketCommentUpdate,
  User,
  UserInsert,
  UserUpdate
} from '../lib/database.types';

// Hook for ticket operations with real-time updates
export const useTickets = () => {
  const { tickets, refreshTickets } = useRealtime();
  const { userProfile } = useAuth();

  const createTicket = useCallback(async (ticketData: TicketInsert) => {
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ...ticketData,
        created_by: userProfile?.id || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }

    return data;
  }, [userProfile?.id]);

  const updateTicket = useCallback(async (id: string, updates: TicketUpdate) => {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }

    return data;
  }, []);

  const deleteTicket = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  }, []);

  const getTicketById = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }

    return data;
  }, []);

  return {
    tickets,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketById,
    refreshTickets,
  };
};

// Hook for ticket comments with real-time updates
export const useTicketComments = (ticketId: string) => {
  const { ticketComments, subscribeToTicketComments, unsubscribeFromTicketComments, refreshTicketComments } = useRealtime();
  const { userProfile } = useAuth();

  const comments = ticketComments[ticketId] || [];

  const createComment = useCallback(async (commentData: Omit<TicketCommentInsert, 'ticket_id' | 'user_id'>) => {
    const { data, error } = await supabase
      .from('ticket_comments')
      .insert({
        ...commentData,
        ticket_id: ticketId,
        user_id: userProfile?.id || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      throw error;
    }

    return data;
  }, [ticketId, userProfile?.id]);

  const updateComment = useCallback(async (id: string, updates: TicketCommentUpdate) => {
    const { data, error } = await supabase
      .from('ticket_comments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      throw error;
    }

    return data;
  }, []);

  const deleteComment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('ticket_comments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }, []);

  return {
    comments,
    createComment,
    updateComment,
    deleteComment,
    subscribeToComments: () => subscribeToTicketComments(ticketId),
    unsubscribeFromComments: () => unsubscribeFromTicketComments(ticketId),
    refreshComments: () => refreshTicketComments(ticketId),
  };
};

// Hook for broadcast logs with real-time updates
export const useBroadcastLogs = () => {
  const { broadcastLogs, refreshBroadcastLogs } = useRealtime();
  const { userProfile } = useAuth();

  const createBroadcastLog = useCallback(async (logData: BroadcastLogInsert) => {
    // Only admin/agent can create broadcast logs
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'agent') {
      throw new Error('Unauthorized: Only admin or agent can create broadcast logs');
    }

    const { data, error } = await supabase
      .from('broadcast_logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error('Error creating broadcast log:', error);
      throw error;
    }

    return data;
  }, [userProfile?.role]);

  const updateBroadcastLog = useCallback(async (id: string, updates: BroadcastLogUpdate) => {
    // Only admin/agent can update broadcast logs
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'agent') {
      throw new Error('Unauthorized: Only admin or agent can update broadcast logs');
    }

    const { data, error } = await supabase
      .from('broadcast_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating broadcast log:', error);
      throw error;
    }

    return data;
  }, [userProfile?.role]);

  const deleteBroadcastLog = useCallback(async (id: string) => {
    // Only admin can delete broadcast logs
    if (userProfile?.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can delete broadcast logs');
    }

    const { error } = await supabase
      .from('broadcast_logs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting broadcast log:', error);
      throw error;
    }
  }, [userProfile?.role]);

  return {
    broadcastLogs,
    createBroadcastLog,
    updateBroadcastLog,
    deleteBroadcastLog,
    refreshBroadcastLogs,
  };
};

// Hook for user management (admin only)
export const useUsers = () => {
  const { userProfile } = useAuth();

  const getUsers = useCallback(async () => {
    if (userProfile?.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can access user management');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return data;
  }, [userProfile?.role]);

  const createUser = useCallback(async (userData: UserInsert) => {
    if (userProfile?.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can create users');
    }

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return data;
  }, [userProfile?.role]);

  const updateUser = useCallback(async (id: string, updates: UserUpdate) => {
    if (userProfile?.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can update users');
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }

    return data;
  }, [userProfile?.role]);

  const deleteUser = useCallback(async (id: string) => {
    if (userProfile?.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can delete users');
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }, [userProfile?.role]);

  return {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
  };
};

// Hook for dashboard statistics
export const useDashboard = () => {
  const { tickets, broadcastLogs } = useRealtime();

  const getStats = useCallback(() => {
    const ticketStats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      pending: tickets.filter(t => t.status === 'pending').length,
      onHold: tickets.filter(t => t.status === 'on_hold').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };

    const broadcastStats = {
      total: broadcastLogs.length,
      pending: broadcastLogs.filter(b => b.status === 'pending').length,
      success: broadcastLogs.filter(b => b.status === 'success').length,
      failed: broadcastLogs.filter(b => b.status === 'failed').length,
    };

    const priorityStats = {
      low: tickets.filter(t => t.priority === 'low').length,
      medium: tickets.filter(t => t.priority === 'medium').length,
      high: tickets.filter(t => t.priority === 'high').length,
      urgent: tickets.filter(t => t.priority === 'urgent').length,
    };

    return {
      tickets: ticketStats,
      broadcasts: broadcastStats,
      priorities: priorityStats,
    };
  }, [tickets, broadcastLogs]);

  return {
    getStats,
    tickets,
    broadcastLogs,
  };
};