import { createSupabaseClient, createSupabaseAdminClient, testSupabaseConnection, Database } from './supabase.js'
import { SupabaseClient } from '@supabase/supabase-js'

// Supabase database wrapper to match existing database interface
export class SupabaseDatabase {
  private client: SupabaseClient<Database> | null
  private adminClient: SupabaseClient<Database> | null

  constructor() {
    this.client = createSupabaseClient()
    this.adminClient = createSupabaseAdminClient()
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false
    }
    return await testSupabaseConnection()
  }

  // Users operations
  async getUsers() {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getUserById(id: string) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getUserByEmail(email: string) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  }

  async createUser(userData: Database['public']['Tables']['users']['Insert']) {
    const { data, error } = await this.adminClient
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateUser(id: string, updates: Database['public']['Tables']['users']['Update']) {
    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteUser(id: string) {
    const { error } = await this.adminClient
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }

  // Tickets operations
  async getTickets() {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getTicketById(id: string) {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getTicketsByStatus(status: string) {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getTicketsByAssignee(userId: string) {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createTicket(ticketData: Database['public']['Tables']['tickets']['Insert']) {
    const { data, error } = await this.client
      .from('tickets')
      .insert(ticketData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTicket(id: string, updates: Database['public']['Tables']['tickets']['Update']) {
    const { data, error } = await this.client
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTicket(id: string) {
    const { error } = await this.client
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }

  // Broadcast logs operations
  async getBroadcastLogs() {
    const { data, error } = await this.client
      .from('broadcast_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getBroadcastLogById(id: string) {
    const { data, error } = await this.client
      .from('broadcast_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getBroadcastLogsByStatus(status: string) {
    const { data, error } = await this.client
      .from('broadcast_logs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createBroadcastLog(logData: Database['public']['Tables']['broadcast_logs']['Insert']) {
    const { data, error } = await this.client
      .from('broadcast_logs')
      .insert(logData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateBroadcastLog(id: string, updates: Database['public']['Tables']['broadcast_logs']['Update']) {
    const { data, error } = await this.client
      .from('broadcast_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteBroadcastLog(id: string) {
    const { error } = await this.client
      .from('broadcast_logs')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }

  // Dashboard statistics
  async getDashboardStats() {
    try {
      // Get tickets count by status
      const { data: ticketsData, error: ticketsError } = await this.client
        .from('tickets')
        .select('status')

      if (ticketsError) throw ticketsError

      // Get broadcast logs count by status
      const { data: logsData, error: logsError } = await this.client
        .from('broadcast_logs')
        .select('status')

      if (logsError) throw logsError

      // Get users count
      const { data: usersData, error: usersError } = await this.client
        .from('users')
        .select('id')

      if (usersError) throw usersError

      // Calculate statistics
      const ticketStats = ticketsData.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      }, {})

      const broadcastStats = logsData.reduce((acc: any, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1
        return acc
      }, {})

      return {
        tickets: {
          total: ticketsData.length,
          open: ticketStats.open || 0,
          in_progress: ticketStats.in_progress || 0,
          resolved: ticketStats.resolved || 0,
          closed: ticketStats.closed || 0,
        },
        broadcasts: {
          total: logsData.length,
          pending: broadcastStats.pending || 0,
          sent: broadcastStats.sent || 0,
          delivered: broadcastStats.delivered || 0,
          failed: broadcastStats.failed || 0,
        },
        users: {
          total: usersData.length,
        },
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      throw error
    }
  }

  // Real-time subscriptions
  subscribeToTickets(callback: (payload: any) => void) {
    return this.client
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, callback)
      .subscribe()
  }

  subscribeToBroadcastLogs(callback: (payload: any) => void) {
    return this.client
      .channel('public:broadcast_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_logs' }, callback)
      .subscribe()
  }

  subscribeToUsers(callback: (payload: any) => void) {
    return this.client
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, callback)
      .subscribe()
  }

  unsubscribe(channel: any) {
    return this.client.removeChannel(channel)
  }

  // Generic query method for compatibility
  async query(text: string, params?: any[]) {
    // This is a simplified implementation for compatibility
    // In a real implementation, you would need to parse SQL and convert to Supabase queries
    console.warn('Direct SQL queries are not supported with Supabase. Use specific methods instead.')
    throw new Error('Direct SQL queries are not supported with Supabase. Use specific methods instead.')
  }

  // Connection method for compatibility
  async connect() {
    const isConnected = await this.testConnection()
    if (!isConnected) {
      throw new Error('Failed to connect to Supabase')
    }
    return {
      query: this.query.bind(this),
      release: () => {}, // No-op for Supabase
    }
  }
}

// Export singleton instance
export const supabaseDb = new SupabaseDatabase()
export default supabaseDb