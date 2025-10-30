import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: string
          priority: string
          assignee_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status?: string
          priority?: string
          assignee_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: string
          priority?: string
          assignee_id?: string | null
          updated_at?: string
        }
      }
      broadcast_logs: {
        Row: {
          id: string
          message: string
          status: string
          recipient_count: number
          sent_at: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          message: string
          status?: string
          recipient_count?: number
          sent_at?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message?: string
          status?: string
          recipient_count?: number
          sent_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for authentication
export const auth = {
  signUp: async (email: string, password: string, userData?: { name: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Helper functions for database operations
export const database = {
  // Users
  getUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  getUserById: async (id: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  createUser: async (userData: Database['public']['Tables']['users']['Insert']) => {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    return { data, error }
  },

  updateUser: async (id: string, updates: Database['public']['Tables']['users']['Update']) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Tickets
  getTickets: async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  getTicketById: async (id: string) => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  createTicket: async (ticketData: Database['public']['Tables']['tickets']['Insert']) => {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single()
    return { data, error }
  },

  updateTicket: async (id: string, updates: Database['public']['Tables']['tickets']['Update']) => {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Broadcast Logs
  getBroadcastLogs: async () => {
    const { data, error } = await supabase
      .from('broadcast_logs')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  createBroadcastLog: async (logData: Database['public']['Tables']['broadcast_logs']['Insert']) => {
    const { data, error } = await supabase
      .from('broadcast_logs')
      .insert(logData)
      .select()
      .single()
    return { data, error }
  }
}

// Real-time subscriptions
export const realtime = {
  subscribeToTickets: (callback: (payload: any) => void) => {
    return supabase
      .channel('tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, callback)
      .subscribe()
  },

  subscribeToBroadcastLogs: (callback: (payload: any) => void) => {
    return supabase
      .channel('broadcast_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_logs' }, callback)
      .subscribe()
  },

  subscribeToUsers: (callback: (payload: any) => void) => {
    return supabase
      .channel('users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, callback)
      .subscribe()
  },

  unsubscribe: (channel: any) => {
    return supabase.removeChannel(channel)
  }
}

// Connection test
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    return !error
  } catch (error) {
    console.error('Supabase connection test failed:', error)
    return false
  }
}

export default supabase