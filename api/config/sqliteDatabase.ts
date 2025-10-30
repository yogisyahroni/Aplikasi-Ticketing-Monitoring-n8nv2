// import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SQLiteDatabase {
  private db: any; // Database.Database;
  private isInitialized = false;

  constructor() {
    console.log('SQLite database constructor called but disabled due to native module issues');
    // Temporarily disabled due to better-sqlite3 native module issues
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('SQLite initialize called but disabled due to native module issues');
    throw new Error('SQLite is temporarily disabled due to native module issues');
  }

  private async seedInitialData() {
    try {
      // Check if admin user already exists
      const existingAdmin = this.db.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.com');
      
      if (!existingAdmin) {
        console.log('Seeding initial admin user...');
        
        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Insert admin user
        this.db.prepare(`
          INSERT INTO users (id, full_name, email, password_hash, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          '550e8400-e29b-41d4-a716-446655440000',
          'Administrator',
          'admin@example.com',
          hashedPassword,
          'admin',
          1
        );
        
        // Insert agent user
        this.db.prepare(`
          INSERT INTO users (id, full_name, email, password_hash, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          '550e8400-e29b-41d4-a716-446655440001',
          'Agent Satu',
          'agent1@example.com',
          hashedPassword,
          'agent',
          1
        );
        
        console.log('Initial users seeded successfully');
      }
      
      // Seed dashboard summary
      this.seedDashboardSummary();
    } catch (error) {
      console.error('Error seeding initial data:', error);
      throw error;
    }
  }

  private seedDashboardSummary() {
    try {
      // Check if dashboard_summary table exists and has data
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='dashboard_summary'
      `).get();
      
      if (tableExists) {
        const count = this.db.prepare('SELECT COUNT(*) as count FROM dashboard_summary').get() as { count: number };
        
        if (count.count === 0) {
          this.db.prepare(`
            INSERT INTO dashboard_summary (total_tickets, open_tickets, closed_tickets, total_broadcasts, active_broadcasts, last_updated)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `).run(0, 0, 0, 0, 0);
          
          console.log('Initial dashboard summary seeded successfully');
        }
      }
    } catch (error) {
      console.error('Error seeding dashboard summary:', error);
      // Don't throw error for dashboard summary
    }
  }

  private generateId(): string {
    // Generate a UUID-like string for SQLite
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    await this.initialize();
    
    try {
      // Convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?, ?)
      const sqliteQuery = this.convertQuery(sql);
      
      if (sqliteQuery.toLowerCase().trim().startsWith('select')) {
        const stmt = this.db.prepare(sqliteQuery);
        const rows = stmt.all(...params);
        return { rows: rows || [] };
      } else {
        const stmt = this.db.prepare(sqliteQuery);
        const result = stmt.run(...params);
        return { 
          rows: [{ 
            affectedRows: result.changes,
            insertId: result.lastInsertRowid 
          }]
        };
      }
    } catch (error) {
      console.error('SQLite query error:', error);
      throw error;
    }
  }

  private convertQuery(query: string): string {
    // Convert PostgreSQL syntax to SQLite
    let converted = query;
    
    // Replace PostgreSQL-specific functions and syntax
    converted = converted.replace(/NOW\(\)/g, "datetime('now')");
    converted = converted.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");
    converted = converted.replace(/CURRENT_DATE/g, "date('now')");
    
    // Replace PostgreSQL UUID generation
    converted = converted.replace(/uuid_generate_v4\(\)/g, "lower(hex(randomblob(16)))");
    
    // Replace RETURNING clause (SQLite doesn't support it directly)
    converted = converted.replace(/RETURNING\s+\*/g, '');
    converted = converted.replace(/RETURNING\s+id/g, '');
    
    // Replace ILIKE with LIKE (case-insensitive search)
    converted = converted.replace(/ILIKE/g, 'LIKE');
    
    // Replace PostgreSQL-style parameter placeholders ($1, $2) with SQLite (?, ?)
    converted = converted.replace(/\$(\d+)/g, '?');
    
    // Replace boolean values
    converted = converted.replace(/\btrue\b/g, '1');
    converted = converted.replace(/\bfalse\b/g, '0');
    
    // Replace TIMESTAMPTZ with DATETIME
    converted = converted.replace(/TIMESTAMPTZ/g, 'DATETIME');
    
    return converted;
  }

  async connect() {
    await this.initialize();
    return {
      query: this.query.bind(this),
      release: () => {} // SQLite doesn't need connection release
    };
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export const SQLiteDB = new SQLiteDatabase();

