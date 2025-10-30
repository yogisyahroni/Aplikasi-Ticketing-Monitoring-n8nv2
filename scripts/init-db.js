import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Connect to default database first
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Initializing database...');
    
    // Create database if not exists
    const dbName = process.env.DB_NAME || 'ticketing_monitoring';
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database '${dbName}' created successfully`);
    
  } catch (error) {
    if (error.code === '42P04') {
      console.log('ℹ️  Database already exists, continuing...');
    } else {
      console.error('❌ Error creating database:', error.message);
      throw error;
    }
  } finally {
    client.release();
  }
  
  // Connect to the target database
  const targetPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ticketing_monitoring',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
  
  const targetClient = await targetPool.connect();
  
  try {
    // Run schema.sql
    console.log('🔄 Running database schema...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await targetClient.query(schemaSQL);
    console.log('✅ Database schema created successfully');
    
    // Run seed.sql
    console.log('🔄 Seeding initial data...');
    const seedSQL = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf8');
    await targetClient.query(seedSQL);
    console.log('✅ Initial data seeded successfully');
    
    console.log('🎉 Database initialization completed!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    targetClient.release();
    await targetPool.end();
  }
  
  await pool.end();
}

// Run initialization
initializeDatabase()
  .then(() => {
    console.log('✅ Database setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  });