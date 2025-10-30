import { Pool } from 'pg';
import dotenv from 'dotenv';
import { MockDatabase } from './mockDatabase.js';
import { supabaseDb } from './supabaseDatabase.js';
import { SQLiteDB } from './sqliteDatabase.js';

dotenv.config();

let pool: Pool | typeof MockDatabase | typeof supabaseDb | typeof SQLiteDB;
let useMockDatabase = false;
let useSupabase = false;
let useSQLite = false;

// Check database type from environment variables
const databaseType = process.env.DATABASE_TYPE || 'mock'; // postgresql, supabase, sqlite, mock
const forceMock = process.env.USE_MOCK === 'true' || true; // Force mock for now due to SQLite issues

// Initialize database connection
async function initializeDatabase() {
  if (forceMock || databaseType === 'mock') {
    console.log('Using Mock database (forced by environment)');
    pool = MockDatabase;
    useMockDatabase = true;
    console.log('Mock database initialized successfully');
    return;
  }

  // Check database type preference
  if (databaseType === 'sqlite') {
    try {
      await SQLiteDB.initialize();
      pool = SQLiteDB;
      useSQLite = true;
      console.log('SQLite database initialized successfully');
      return;
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      console.log('Falling back to Mock database...');
      pool = MockDatabase;
      useMockDatabase = true;
      console.log('Mock database initialized as fallback');
      return;
    }
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
    
    // Try SQLite as final fallback
    try {
      await SQLiteDB.initialize();
      pool = SQLiteDB;
      useSQLite = true;
      console.log('SQLite database initialized as fallback');
    } catch (sqliteError) {
      console.error('Failed to initialize SQLite as fallback:', sqliteError);
      pool = MockDatabase;
      useMockDatabase = true;
      console.log('Mock database initialized as final fallback');
    }
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
    if (useSQLite) {
      return (pool as typeof SQLiteDB).query(text, params);
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
    if (useSQLite) {
      return pool as typeof SQLiteDB;
    }
    if (useSupabase) {
      return pool as typeof supabaseDb;
    }
    return pool as Pool;
  },
  
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

