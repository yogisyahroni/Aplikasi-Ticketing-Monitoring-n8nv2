import { Pool } from 'pg';
import { supabaseDb } from './supabaseDatabase.js';
import { MockDatabase } from './mockDatabase.js';
import { SQLiteDB } from './sqliteDatabase.js';

// Enhanced interfaces for better type safety and functionality
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  cache?: boolean;
  cacheTTL?: number; // Time to live in seconds
}

export interface SearchOptions extends QueryOptions {
  searchTerm?: string;
  searchFields?: string[];
}

export interface DatabaseAdapter {
  // User operations
  getUserById(id: string, options?: QueryOptions): Promise<any>;
  getUserByEmail(email: string, options?: QueryOptions): Promise<any>;
  createUser(userData: any): Promise<any>;
  updateUser(id: string, userData: any): Promise<any>;
  deleteUser(id: string): Promise<any>;
  getUsers(filters?: any, options?: SearchOptions): Promise<any>;
  searchUsers(searchTerm: string, options?: SearchOptions): Promise<any>;
  
  // Ticket operations
  getTickets(filters?: any, options?: SearchOptions): Promise<any>;
  getTicketById(id: string, options?: QueryOptions): Promise<any>;
  createTicket(ticketData: any): Promise<any>;
  updateTicket(id: string, ticketData: any): Promise<any>;
  deleteTicket(id: string): Promise<any>;
  searchTickets(searchTerm: string, options?: SearchOptions): Promise<any>;
  getTicketComments(ticketId: string, options?: QueryOptions): Promise<any>;
  addTicketComment(ticketId: string, commentData: any): Promise<any>;
  
  // Broadcast log operations
  getBroadcastLogs(filters?: any, options?: SearchOptions): Promise<any>;
  getBroadcastLogById(id: string, options?: QueryOptions): Promise<any>;
  createBroadcastLog(logData: any): Promise<any>;
  updateBroadcastLog(id: string, logData: any): Promise<any>;
  deleteBroadcastLog(id: string): Promise<any>;
  searchBroadcastLogs(searchTerm: string, options?: SearchOptions): Promise<any>;
  
  // Dashboard operations
  getDashboardStats(options?: QueryOptions): Promise<any>;
  getAdvancedAnalytics(dateRange?: { start: Date; end: Date }): Promise<any>;
  
  // Real-time subscriptions (Supabase specific)
  subscribeToTickets?(callback: (payload: any) => void): Promise<any>;
  subscribeToBroadcastLogs?(callback: (payload: any) => void): Promise<any>;
  subscribeToUsers?(callback: (payload: any) => void): Promise<any>;
  unsubscribe?(subscription: any): Promise<void>;
  
  // Advanced query operations
  query(text: string, params?: any[]): Promise<any>;
  transaction?(queries: Array<{ text: string; params?: any[] }>): Promise<any>;
  
  // Cache operations
  clearCache?(): Promise<void>;
  getCacheStats?(): Promise<any>;
  
  // Health check
  healthCheck(): Promise<boolean>;
}

// Simple in-memory cache implementation
class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, data: any, ttl: number = 300): void {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export class SupabaseAdapter implements DatabaseAdapter {
  private db = supabaseDb;
  private cache = new SimpleCache();

  private getCacheKey(method: string, params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private async withCache<T>(
    key: string, 
    fn: () => Promise<T>, 
    options?: QueryOptions
  ): Promise<T> {
    if (options?.cache !== false) {
      const cached = this.cache.get(key);
      if (cached) return cached;
    }

    const result = await fn();
    
    if (options?.cache !== false) {
      this.cache.set(key, result, options?.cacheTTL || 300);
    }
    
    return result;
  }

  async getUserById(id: string, options?: QueryOptions) {
    const cacheKey = this.getCacheKey('getUserById', [id]);
    return await this.withCache(cacheKey, () => this.db.getUserById(id), options);
  }

  async getUserByEmail(email: string, options?: QueryOptions) {
    const cacheKey = this.getCacheKey('getUserByEmail', [email]);
    return await this.withCache(cacheKey, () => this.db.getUserByEmail(email), options);
  }

  async createUser(userData: any) {
    const result = await this.db.createUser(userData);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async updateUser(id: string, userData: any) {
    const result = await this.db.updateUser(id, userData);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async deleteUser(id: string) {
    const result = await this.db.deleteUser(id);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async getUsers(filters?: any, options?: SearchOptions) {
    const cacheKey = this.getCacheKey('getUsers', [filters, options]);
    return await this.withCache(cacheKey, () => this.db.getUsers(filters), options);
  }

  async searchUsers(searchTerm: string, options?: SearchOptions) {
    // Implement search functionality using Supabase's text search
    const filters = {
      search: searchTerm,
      searchFields: options?.searchFields || ['full_name', 'email']
    };
    return await this.getUsers(filters, options);
  }

  async getTickets(filters?: any, options?: SearchOptions) {
    const cacheKey = this.getCacheKey('getTickets', [filters, options]);
    return await this.withCache(cacheKey, () => this.db.getTickets(filters), options);
  }

  async getTicketById(id: string, options?: QueryOptions) {
    const cacheKey = this.getCacheKey('getTicketById', [id]);
    return await this.withCache(cacheKey, () => this.db.getTicketById(id), options);
  }

  async createTicket(ticketData: any) {
    const result = await this.db.createTicket(ticketData);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async updateTicket(id: string, ticketData: any) {
    const result = await this.db.updateTicket(id, ticketData);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async deleteTicket(id: string) {
    const result = await this.db.deleteTicket(id);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async searchTickets(searchTerm: string, options?: SearchOptions) {
    const filters = {
      search: searchTerm,
      searchFields: options?.searchFields || ['title', 'description', 'tracking_number']
    };
    return await this.getTickets(filters, options);
  }

  async getTicketComments(ticketId: string, options?: QueryOptions) {
    // This would need to be implemented in supabaseDatabase.ts
    throw new Error('getTicketComments not yet implemented in SupabaseDatabase');
  }

  async addTicketComment(ticketId: string, commentData: any) {
    // This would need to be implemented in supabaseDatabase.ts
    throw new Error('addTicketComment not yet implemented in SupabaseDatabase');
  }

  async getBroadcastLogs(filters?: any, options?: SearchOptions) {
    const cacheKey = this.getCacheKey('getBroadcastLogs', [filters, options]);
    return await this.withCache(cacheKey, () => this.db.getBroadcastLogs(filters), options);
  }

  async getBroadcastLogById(id: string, options?: QueryOptions) {
    const cacheKey = this.getCacheKey('getBroadcastLogById', [id]);
    return await this.withCache(cacheKey, () => this.db.getBroadcastLogById(id), options);
  }

  async createBroadcastLog(logData: any) {
    const result = await this.db.createBroadcastLog(logData);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async updateBroadcastLog(id: string, logData: any) {
    const result = await this.db.updateBroadcastLog(id, logData);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async deleteBroadcastLog(id: string) {
    const result = await this.db.deleteBroadcastLog(id);
    this.cache.clear(); // Clear cache after mutations
    return result;
  }

  async searchBroadcastLogs(searchTerm: string, options?: SearchOptions) {
    const filters = {
      search: searchTerm,
      searchFields: options?.searchFields || ['tracking_number', 'message_content']
    };
    return await this.getBroadcastLogs(filters, options);
  }

  async getDashboardStats(options?: QueryOptions) {
    const cacheKey = this.getCacheKey('getDashboardStats', []);
    return await this.withCache(cacheKey, () => this.db.getDashboardStats(), options);
  }

  async getAdvancedAnalytics(dateRange?: { start: Date; end: Date }) {
    // Advanced analytics implementation
    const filters = dateRange ? {
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString()
    } : {};
    
    return await this.db.getDashboardStats(); // Enhanced version would be implemented
  }

  // Real-time subscriptions
  async subscribeToTickets(callback: (payload: any) => void) {
    return await this.db.subscribeToTickets(callback);
  }

  async subscribeToBroadcastLogs(callback: (payload: any) => void) {
    return await this.db.subscribeToBroadcastLogs(callback);
  }

  async subscribeToUsers(callback: (payload: any) => void) {
    return await this.db.subscribeToUsers(callback);
  }

  async unsubscribe(subscription: any) {
    return await this.db.unsubscribe(subscription);
  }

  async clearCache() {
    this.cache.clear();
  }

  async getCacheStats() {
    return this.cache.getStats();
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.db.testConnection();
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async query(text: string, params?: any[]) {
    // For Supabase, we need to convert SQL queries to Supabase methods
    // This is a simplified implementation - in production, you'd want more sophisticated parsing
    throw new Error('Direct SQL queries are not supported with Supabase. Use specific methods instead.');
  }
}

export class PostgreSQLAdapter implements DatabaseAdapter {
  constructor(private pool: Pool) {}

  async getUserById(id: string) {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email: string) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async createUser(userData: any) {
    const { full_name, email, password_hash, role } = userData;
    const result = await this.pool.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, email, password_hash, role]
    );
    return result.rows[0];
  }

  async updateUser(id: string, userData: any) {
    const fields = Object.keys(userData);
    const values = Object.values(userData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await this.pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async deleteUser(id: string) {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getUsers(filters?: any) {
    let query = 'SELECT * FROM users';
    const params: any[] = [];
    
    if (filters) {
      const conditions: string[] = [];
      let paramIndex = 1;
      
      if (filters.role) {
        conditions.push(`role = $${paramIndex++}`);
        params.push(filters.role);
      }
      
      if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        params.push(filters.is_active);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }
    
    if (filters?.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(filters.offset);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTickets(filters?: any) {
    let query = `
      SELECT t.*, u.full_name as assigned_to_name 
      FROM tickets t 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
    `;
    const params: any[] = [];
    
    if (filters) {
      const conditions: string[] = [];
      let paramIndex = 1;
      
      if (filters.status) {
        conditions.push(`t.status = $${paramIndex++}`);
        params.push(filters.status);
      }
      
      if (filters.priority) {
        conditions.push(`t.priority = $${paramIndex++}`);
        params.push(filters.priority);
      }
      
      if (filters.assigned_to_user_id) {
        conditions.push(`t.assigned_to_user_id = $${paramIndex++}`);
        params.push(filters.assigned_to_user_id);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }
    
    if (filters?.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(filters.offset);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getTicketById(id: string) {
    const result = await this.pool.query(`
      SELECT t.*, u.full_name as assigned_to_name 
      FROM tickets t 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id 
      WHERE t.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async createTicket(ticketData: any) {
    const { tracking_number, customer_phone, title, description, priority, assigned_to_user_id } = ticketData;
    const result = await this.pool.query(
      'INSERT INTO tickets (tracking_number, customer_phone, title, description, priority, assigned_to_user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [tracking_number, customer_phone, title, description, priority || 'medium', assigned_to_user_id]
    );
    return result.rows[0];
  }

  async updateTicket(id: string, ticketData: any) {
    const fields = Object.keys(ticketData);
    const values = Object.values(ticketData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await this.pool.query(
      `UPDATE tickets SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async deleteTicket(id: string) {
    const result = await this.pool.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getBroadcastLogs(filters?: any) {
    let query = 'SELECT * FROM broadcast_logs';
    const params: any[] = [];
    
    if (filters) {
      const conditions: string[] = [];
      let paramIndex = 1;
      
      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }
      
      if (filters.tracking_number) {
        conditions.push(`tracking_number = $${paramIndex++}`);
        params.push(filters.tracking_number);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    query += ' ORDER BY broadcast_at DESC';
    
    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getBroadcastLogById(id: string) {
    const result = await this.pool.query('SELECT * FROM broadcast_logs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async createBroadcastLog(logData: any) {
    const { tracking_number, consignee_phone, status, message_content, error_message } = logData;
    const result = await this.pool.query(
      'INSERT INTO broadcast_logs (tracking_number, consignee_phone, status, message_content, error_message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tracking_number, consignee_phone, status, message_content, error_message]
    );
    return result.rows[0];
  }

  async updateBroadcastLog(id: string, logData: any) {
    const fields = Object.keys(logData);
    const values = Object.values(logData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await this.pool.query(
      `UPDATE broadcast_logs SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async getDashboardStats() {
    const [ticketStats, broadcastStats, userStats] = await Promise.all([
      this.pool.query(`
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tickets,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets
        FROM tickets
      `),
      this.pool.query(`
        SELECT 
          COUNT(*) as total_broadcasts,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_broadcasts,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_broadcasts
        FROM broadcast_logs
        WHERE DATE(broadcast_at) = CURRENT_DATE
      `),
      this.pool.query(`
        SELECT COUNT(*) as active_agents 
        FROM users 
        WHERE role = 'agent' AND is_active = true
      `)
    ]);

    return {
      tickets: ticketStats.rows[0],
      broadcasts: broadcastStats.rows[0],
      users: userStats.rows[0]
    };
  }

  async query(text: string, params?: any[]) {
    return await this.pool.query(text, params);
  }
}

export class MockAdapter implements DatabaseAdapter {
  private db = MockDatabase;

  async getUserById(id: string) {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email: string) {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async createUser(userData: any) {
    const { full_name, email, password_hash, role } = userData;
    const result = await this.db.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, email, password_hash, role]
    );
    return result.rows[0];
  }

  async updateUser(id: string, userData: any) {
    const fields = Object.keys(userData);
    const values = Object.values(userData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await this.db.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async deleteUser(id: string) {
    const result = await this.db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getUsers(filters?: any) {
    const result = await this.db.query('SELECT * FROM users ORDER BY created_at DESC', []);
    return result.rows;
  }

  async getTickets(filters?: any) {
    const result = await this.db.query(`
      SELECT t.*, u.full_name as assigned_to_name 
      FROM tickets t 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      ORDER BY t.created_at DESC
    `, []);
    return result.rows;
  }

  async getTicketById(id: string) {
    const result = await this.db.query(`
      SELECT t.*, u.full_name as assigned_to_name 
      FROM tickets t 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id 
      WHERE t.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async createTicket(ticketData: any) {
    const { tracking_number, customer_phone, title, description, priority, assigned_to_user_id } = ticketData;
    const result = await this.db.query(
      'INSERT INTO tickets (tracking_number, customer_phone, title, description, priority, assigned_to_user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [tracking_number, customer_phone, title, description, priority || 'medium', assigned_to_user_id]
    );
    return result.rows[0];
  }

  async updateTicket(id: string, ticketData: any) {
    const fields = Object.keys(ticketData);
    const values = Object.values(ticketData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await this.db.query(
      `UPDATE tickets SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async deleteTicket(id: string) {
    const result = await this.db.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getBroadcastLogs(filters?: any) {
    const result = await this.db.query('SELECT * FROM broadcast_logs ORDER BY broadcast_at DESC', []);
    return result.rows;
  }

  async getBroadcastLogById(id: string) {
    const result = await this.db.query('SELECT * FROM broadcast_logs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async createBroadcastLog(logData: any) {
    const { tracking_number, consignee_phone, status, message_content, error_message } = logData;
    const result = await this.db.query(
      'INSERT INTO broadcast_logs (tracking_number, consignee_phone, status, message_content, error_message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tracking_number, consignee_phone, status, message_content, error_message]
    );
    return result.rows[0];
  }

  async updateBroadcastLog(id: string, logData: any) {
    const fields = Object.keys(logData);
    const values = Object.values(logData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const result = await this.db.query(
      `UPDATE broadcast_logs SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async getDashboardStats() {
    const result = await this.db.query('SELECT * FROM dashboard_summary', []);
    return {
      tickets: { total_tickets: 10, open_tickets: 3, pending_tickets: 2, closed_tickets: 5 },
      broadcasts: { total_broadcasts: 25, successful_broadcasts: 20, failed_broadcasts: 5 },
      users: { active_agents: 3 }
    };
  }

  async query(text: string, params?: any[]) {
    return await this.db.query(text, params);
  }
}