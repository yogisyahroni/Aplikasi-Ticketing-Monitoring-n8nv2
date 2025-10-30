import { createClient, SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Supabase configuration interface
export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'agent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'agent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'agent'
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          updated_at?: string
        }
      }
      broadcast_logs: {
        Row: {
          id: string
          message: string
          recipient: string
          status: 'pending' | 'sent' | 'delivered' | 'failed'
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message: string
          recipient: string
          status?: 'pending' | 'sent' | 'delivered' | 'failed'
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message?: string
          recipient?: string
          status?: 'pending' | 'sent' | 'delivered' | 'failed'
          sent_at?: string | null
        }
      }
    }
  }
}

// Get Supabase configuration from environment variables
export const getSupabaseConfig = (): SupabaseConfig => {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
    )
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  }
}

// Create Supabase client instance
let supabaseClient: SupabaseClient<Database> | null = null

export const createSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseClient) {
    return supabaseClient
  }

  try {
    const config = getSupabaseConfig()
    
    supabaseClient = createClient<Database>(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'ticketing-monitoring-app',
        },
      },
    })

    console.log('✅ Supabase client initialized successfully')
    return supabaseClient
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error)
    throw error
  }
}

// Create admin Supabase client with service role key
export const createSupabaseAdminClient = (): SupabaseClient<Database> => {
  try {
    const config = getSupabaseConfig()
    
    if (!config.serviceRoleKey) {
      throw new Error('Service role key is required for admin operations')
    }

    const adminClient = createClient<Database>(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    })

    console.log('✅ Supabase admin client initialized successfully')
    return adminClient
  } catch (error) {
    console.error('❌ Failed to initialize Supabase admin client:', error)
    throw error
  }
}

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const client = createSupabaseClient()
    
    // Test connection by querying a simple table or using a health check
    const { data, error } = await client
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Supabase connection test failed:', error.message)
      return false
    }

    console.log('✅ Supabase connection test successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error)
    return false
  }
}

// Export the client instance
export const supabase = createSupabaseClient()

// Export types
export type { Database, SupabaseClient }