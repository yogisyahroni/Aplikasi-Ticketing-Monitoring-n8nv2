import { Pool } from 'pg';
import dotenv from 'dotenv';
import { MockDatabase } from './mockDatabase.js';
import { supabaseDb } from './supabaseDatabase.js';

dotenv.config();

let pool: Pool | typeof MockDatabase | typeof supabaseDb;
let useMockDatabase = false;
let useSupabase = false;

// Check database type from environment variables
const databaseType = process.env.DATABASE_TYPE || 'postgresql'; // postgresql, supabase, sqlite, mock
const forceMock = process.env.USE_SQLITE === 'true';

// Initialize database connection
async function initializeDatabase() {
  if (forceMock) {
    console.log('Using SQLite/Mock database (forced by environment)');
    pool = MockDatabase;
    useMockDatabase = true;
    return;
  }

  // Check database type preference
  if (databaseType === 'supabase') {
    try {
      // Test Supabase connection
      const isConnected = await supabaseDb.testConnection();
      if (isConnected) {
        pool = supabaseDb;
        useSupabase = true;
        console.log('Connected to Supabase database successfully');
        return;
      } else {
        throw new Error('Supabase connection test failed');
      }
    } catch (error) {
      console.error('Failed to connect to Supabase:', error);
      console.log('Falling back to PostgreSQL...');
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
    console.log('Connected to PostgreSQL database successfully');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    console.log('Falling back to SQLite/Mock database');
    pool = MockDatabase;
    useMockDatabase = true;
  }
}

// Initialize the database connection
initializeDatabase();

// Create a wrapper that handles PostgreSQL, Supabase, and mock database
export const db = {
  query: async (text: string, params?: any[]) => {
    if (useMockDatabase) {
      return MockDatabase.query(text, params);
    }
    if (useSupabase) {
      // For Supabase, we need to handle SQL queries differently
      // This is a compatibility layer for existing SQL queries
      return (pool as typeof supabaseDb).query(text, params);
    }
    return (pool as Pool).query(text, params);
  },
  
  getPool: () => {
    if (useMockDatabase) {
      return MockDatabase;
    }
    if (useSupabase) {
      return pool as typeof supabaseDb;
    }
    return pool as Pool;
  },
  
  isUsingMockDatabase: () => useMockDatabase,
  isUsingSupabase: () => useSupabase,
  getDatabaseType: () => {
    if (useMockDatabase) return 'mock';
    if (useSupabase) return 'supabase';
    return 'postgresql';
  }
};

export default db;
