import { Pool } from 'pg';
import dotenv from 'dotenv';
import { MockDatabase } from './mockDatabase.js';
import { supabaseDb } from './supabaseDatabase.js';
import { SQLiteDB } from './sqliteDatabase.js';
import { DatabaseAdapter, SupabaseAdapter, PostgreSQLAdapter, MockAdapter } from './databaseAdapter.js';

dotenv.config();

let pool: Pool | typeof MockDatabase | typeof supabaseDb | typeof SQLiteDB;
let adapter: DatabaseAdapter;
let useMockDatabase = false;
let useSupabase = false;
let useSQLite = false;

// Check database type from environment variables
const databaseType = process.env.DATABASE_TYPE || 'supabase'; // supabase, postgresql, sqlite, mock
const forceMock = process.env.USE_MOCK === 'true';

// Initialize database connection
async function initializeDatabase() {
  // Only use mock if explicitly requested
  if (forceMock && databaseType === 'mock') {
    console.log('Using Mock database (explicitly requested)');
    pool = MockDatabase;
    adapter = new MockAdapter();
    useMockDatabase = true;
    console.log('Mock database initialized successfully');
    return;
  }

  // Prioritize Supabase first - this is our primary database
  if (databaseType === 'supabase' || !databaseType || databaseType === 'auto') {
    try {
      console.log('Attempting to connect to Supabase...');
      // Test Supabase connection
      const isConnected = await supabaseDb.testConnection();
      if (isConnected) {
        pool = supabaseDb;
        adapter = new SupabaseAdapter();
        useSupabase = true;
        console.log('✅ Connected to Supabase database successfully');
        return;
      } else {
        throw new Error('Supabase connection test failed');
      }
    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error);
      if (databaseType === 'supabase') {
        // If Supabase is explicitly requested but fails, don't fallback
        throw new Error('Supabase connection required but failed. Please check your configuration.');
      }
      console.log('Falling back to PostgreSQL...');
    }
  }

  // Check database type preference
  if (databaseType === 'sqlite') {
    try {
      await SQLiteDB.initialize();
      pool = SQLiteDB;
      adapter = new MockAdapter(); // SQLite uses similar interface to Mock for now
      useSQLite = true;
      console.log('SQLite database initialized successfully');
      return;
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      console.log('Falling back to Mock database...');
      pool = MockDatabase;
      adapter = new MockAdapter();
      useMockDatabase = true;
      console.log('Mock database initialized as fallback');
      return;
    }
  }



  try {
    // Try PostgreSQL connection
    const pgPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'ticketing_db',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT || '5432'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    pool = pgPool;
    adapter = new PostgreSQLAdapter(pgPool);
    console.log('Connected to PostgreSQL database successfully');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    console.log('Falling back to SQLite/Mock database');
    
    // Try SQLite as final fallback
    try {
      await SQLiteDB.initialize();
      pool = SQLiteDB;
      adapter = new MockAdapter(); // SQLite uses similar interface to Mock for now
      useSQLite = true;
      console.log('SQLite database initialized as fallback');
    } catch (sqliteError) {
      console.error('Failed to initialize SQLite as fallback:', sqliteError);
      pool = MockDatabase;
      adapter = new MockAdapter();
      useMockDatabase = true;
      console.log('Mock database initialized as final fallback');
    }
  }
}

// Initialize the database connection
initializeDatabase();

// Create a wrapper that handles PostgreSQL, Supabase, and mock database
export const db = {
  // Adapter methods (preferred)
  getUserById: (id: string) => adapter.getUserById(id),
  getUserByEmail: (email: string) => adapter.getUserByEmail(email),
  createUser: (userData: any) => adapter.createUser(userData),
  updateUser: (id: string, userData: any) => adapter.updateUser(id, userData),
  deleteUser: (id: string) => adapter.deleteUser(id),
  getUsers: (filters?: any) => adapter.getUsers(filters),
  
  getTickets: (filters?: any) => adapter.getTickets(filters),
  getTicketById: (id: string) => adapter.getTicketById(id),
  createTicket: (ticketData: any) => adapter.createTicket(ticketData),
  updateTicket: (id: string, ticketData: any) => adapter.updateTicket(id, ticketData),
  deleteTicket: (id: string) => adapter.deleteTicket(id),
  
  getBroadcastLogs: (filters?: any) => adapter.getBroadcastLogs(filters),
  getBroadcastLogById: (id: string) => adapter.getBroadcastLogById(id),
  createBroadcastLog: (logData: any) => adapter.createBroadcastLog(logData),
  updateBroadcastLog: (id: string, logData: any) => adapter.updateBroadcastLog(id, logData),
  
  getDashboardStats: () => adapter.getDashboardStats(),
  
  // Legacy query method (for backward compatibility)
  query: async (text: string, params?: any[]) => {
    if (useSupabase) {
      // For Supabase, direct SQL queries are not supported
      console.warn('Direct SQL queries are not recommended with Supabase. Use adapter methods instead.');
      throw new Error('Direct SQL queries are not supported with Supabase. Use specific methods instead.');
    }
    return adapter.query(text, params);
  },
  
  getPool: () => {
    if (useMockDatabase) {
      return MockDatabase;
    }
    if (useSQLite) {
      return pool as typeof SQLiteDB;
    }
    if (useSupabase) {
      return pool as typeof supabaseDb;
    }
    return pool as Pool;
  },
  
  getAdapter: () => adapter,
  isUsingMockDatabase: () => useMockDatabase,
  isUsingSupabase: () => useSupabase,
  isUsingSQLite: () => useSQLite,
  getDatabaseType: () => {
    if (useMockDatabase) return 'mock';
    if (useSQLite) return 'sqlite';
    if (useSupabase) return 'supabase';
    return 'postgresql';
  }
};

export default db;

