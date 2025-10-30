import { Pool } from 'pg';
import dotenv from 'dotenv';
import { MockDatabase } from './mockDatabase.js';

dotenv.config();

let pool: Pool | typeof MockDatabase;
let useMockDatabase = false;

// Check if we should use Mock database (environment variable or fallback)
const forceMock = process.env.USE_SQLITE === 'true';

if (forceMock) {
  console.log('Using Mock database as temporary solution');
  pool = MockDatabase;
  useMockDatabase = true;
} else {
  try {
    pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'ticketing_monitoring',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT || '5432'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test database connection
    pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL connection error, switching to Mock database:', err.message);
      pool = MockDatabase;
      useMockDatabase = true;
    });

  } catch (error) {
    console.log('PostgreSQL not available, using Mock database for development');
    pool = MockDatabase;
    useMockDatabase = true;
  }
}

// Create a wrapper that handles PostgreSQL and mock database
export const db = {
  query: async (text: string, params?: any[]) => {
    try {
      if (useMockDatabase) {
        return await MockDatabase.query(text, params);
      } else {
        const result = await db.query(text, params);
        return result.rows;
      }
    } catch (error) {
      console.error('Database query failed, falling back to Mock database:', error);
      // Fallback to Mock database if PostgreSQL fails
      return await MockDatabase.query(text, params);
    }
  },
  connect: async () => {
    if (useMockDatabase) {
      return {
        query: MockDatabase.query,
        release: () => {}
      };
    } else {
      return await pool.connect();
    }
  }
};

export default db;
