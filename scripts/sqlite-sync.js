import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SQLiteSync {
  constructor() {
    this.sqliteDb = null;
    this.pgPool = null;
  }

  async initSQLite() {
    const dbPath = join(__dirname, '../database/ticketing_monitoring.sqlite');
    this.sqliteDb = new Database(dbPath);
    console.log('SQLite database connected');
  }

  async initPostgreSQL() {
    this.pgPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'ticketing_monitoring',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT || '5432'),
    });
    
    // Test connection
    await this.pgPool.query('SELECT NOW()');
    console.log('PostgreSQL database connected');
  }

  async exportSQLiteToJSON() {
    await this.initSQLite();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    const tables = ['users', 'tickets', 'ticket_comments', 'broadcast_logs', 'dashboard_summary'];
    
    for (const table of tables) {
      try {
        const stmt = this.sqliteDb.prepare(`SELECT * FROM ${table}`);
        const rows = stmt.all();
        exportData.tables[table] = rows;
        console.log(`Exported ${rows.length} rows from ${table}`);
      } catch (error) {
        console.error(`Error exporting table ${table}:`, error.message);
        exportData.tables[table] = [];
      }
    }

    const exportPath = join(__dirname, '../database/sqlite-export.json');
    writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`Data exported to: ${exportPath}`);
    
    this.sqliteDb.close();
    return exportPath;
  }

  async importJSONToPostgreSQL(jsonPath) {
    await this.initPostgreSQL();
    
    const exportData = JSON.parse(readFileSync(jsonPath, 'utf8'));
    console.log(`Importing data from: ${jsonPath}`);
    console.log(`Export timestamp: ${exportData.timestamp}`);

    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');

      // Import users
      if (exportData.tables.users && exportData.tables.users.length > 0) {
        for (const user of exportData.tables.users) {
          await client.query(`
            INSERT INTO users (id, full_name, email, password_hash, role, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              is_active = EXCLUDED.is_active,
              updated_at = EXCLUDED.updated_at
          `, [user.id, user.full_name, user.email, user.password_hash, user.role, user.is_active, user.created_at, user.updated_at]);
        }
        console.log(`Imported ${exportData.tables.users.length} users`);
      }

      // Import tickets
      if (exportData.tables.tickets && exportData.tables.tickets.length > 0) {
        for (const ticket of exportData.tables.tickets) {
          await client.query(`
            INSERT INTO tickets (id, ticket_uid, tracking_number, customer_phone, subject, description, status, priority, assigned_to_user_id, created_at, updated_at, closed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (ticket_uid) DO UPDATE SET
              tracking_number = EXCLUDED.tracking_number,
              customer_phone = EXCLUDED.customer_phone,
              subject = EXCLUDED.subject,
              description = EXCLUDED.description,
              status = EXCLUDED.status,
              priority = EXCLUDED.priority,
              assigned_to_user_id = EXCLUDED.assigned_to_user_id,
              updated_at = EXCLUDED.updated_at,
              closed_at = EXCLUDED.closed_at
          `, [ticket.id, ticket.ticket_uid, ticket.tracking_number, ticket.customer_phone, ticket.subject, ticket.description, ticket.status, ticket.priority, ticket.assigned_to_user_id, ticket.created_at, ticket.updated_at, ticket.closed_at]);
        }
        console.log(`Imported ${exportData.tables.tickets.length} tickets`);
      }

      // Import ticket comments
      if (exportData.tables.ticket_comments && exportData.tables.ticket_comments.length > 0) {
        for (const comment of exportData.tables.ticket_comments) {
          await client.query(`
            INSERT INTO ticket_comments (id, ticket_id, user_id, comment_text, is_internal_note, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              comment_text = EXCLUDED.comment_text,
              is_internal_note = EXCLUDED.is_internal_note
          `, [comment.id, comment.ticket_id, comment.user_id, comment.comment_text, comment.is_internal_note, comment.created_at]);
        }
        console.log(`Imported ${exportData.tables.ticket_comments.length} ticket comments`);
      }

      // Import broadcast logs
      if (exportData.tables.broadcast_logs && exportData.tables.broadcast_logs.length > 0) {
        for (const log of exportData.tables.broadcast_logs) {
          await client.query(`
            INSERT INTO broadcast_logs (id, tracking_number, consignee_phone, status, message_content, error_message, broadcast_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              message_content = EXCLUDED.message_content,
              error_message = EXCLUDED.error_message
          `, [log.id, log.tracking_number, log.consignee_phone, log.status, log.message_content, log.error_message, log.broadcast_at]);
        }
        console.log(`Imported ${exportData.tables.broadcast_logs.length} broadcast logs`);
      }

      // Import dashboard summary
      if (exportData.tables.dashboard_summary && exportData.tables.dashboard_summary.length > 0) {
        for (const summary of exportData.tables.dashboard_summary) {
          await client.query(`
            INSERT INTO dashboard_summary (id, metric_name, metric_value, metric_date, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (metric_name, metric_date) DO UPDATE SET
              metric_value = EXCLUDED.metric_value,
              updated_at = EXCLUDED.updated_at
          `, [summary.id, summary.metric_name, summary.metric_value, summary.metric_date, summary.updated_at]);
        }
        console.log(`Imported ${exportData.tables.dashboard_summary.length} dashboard summary records`);
      }

      await client.query('COMMIT');
      console.log('Data import completed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error importing data:', error);
      throw error;
    } finally {
      client.release();
      await this.pgPool.end();
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(__dirname, `../database/backup-${timestamp}.json`);
    
    await this.exportSQLiteToJSON();
    
    // Copy the export file as backup
    const exportPath = join(__dirname, '../database/sqlite-export.json');
    const exportData = readFileSync(exportPath);
    writeFileSync(backupPath, exportData);
    
    console.log(`Backup created: ${backupPath}`);
    return backupPath;
  }

  async syncToPostgreSQL() {
    try {
      console.log('Starting SQLite to PostgreSQL synchronization...');
      
      // Create backup first
      await this.createBackup();
      
      // Export SQLite data
      const exportPath = await this.exportSQLiteToJSON();
      
      // Import to PostgreSQL
      await this.importJSONToPostgreSQL(exportPath);
      
      console.log('Synchronization completed successfully');
      
    } catch (error) {
      console.error('Synchronization failed:', error);
      throw error;
    }
  }
}

// CLI interface
const command = process.argv[2];
const sync = new SQLiteSync();

switch (command) {
  case 'export':
    sync.exportSQLiteToJSON()
      .then(path => console.log(`Export completed: ${path}`))
      .catch(console.error);
    break;
    
  case 'import':
    const jsonPath = process.argv[3] || join(__dirname, '../database/sqlite-export.json');
    sync.importJSONToPostgreSQL(jsonPath)
      .then(() => console.log('Import completed'))
      .catch(console.error);
    break;
    
  case 'backup':
    sync.createBackup()
      .then(path => console.log(`Backup completed: ${path}`))
      .catch(console.error);
    break;
    
  case 'sync':
    sync.syncToPostgreSQL()
      .then(() => console.log('Sync completed'))
      .catch(console.error);
    break;
    
  default:
    console.log(`
Usage: node sqlite-sync.js <command>

Commands:
  export  - Export SQLite data to JSON
  import  - Import JSON data to PostgreSQL
  backup  - Create backup of SQLite data
  sync    - Full synchronization from SQLite to PostgreSQL

Examples:
  node sqlite-sync.js export
  node sqlite-sync.js import
  node sqlite-sync.js backup
  node sqlite-sync.js sync
    `);
}

export default SQLiteSync;