import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SQLiteDatabase {
  private db: sqlite3.Database;
  private isInitialized = false;

  constructor() {
    // Create database file in the project root
    const dbPath = join(__dirname, '../../database/ticketing_monitoring.sqlite');
    this.db = new sqlite3.Database(dbPath);
    
    // Enable foreign keys and WAL mode
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA journal_mode = WAL');
    
    console.log('SQLite database initialized at:', dbPath);
  }

  async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      try {
        // Read and execute schema
        const schemaPath = join(__dirname, '../../database/sqlite-schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');
        
        // Split schema by statements and execute each one
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        this.db.serialize(() => {
          for (const statement of statements) {
            if (statement.trim()) {
              this.db.run(statement);
            }
          }
          
          // Insert initial data if tables are empty
          this.seedInitialData()
            .then(() => {
              this.isInitialized = true;
              console.log('SQLite database schema initialized successfully');
              resolve(undefined);
            })
            .catch(reject);
        });
      } catch (error) {
        console.error('Error initializing SQLite database:', error);
        reject(error);
      }
    });
  }

  private async seedInitialData() {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if users table has data
        this.db.get('SELECT COUNT(*) as count FROM users', (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row.count === 0) {
            // Hash password for admin user
            bcrypt.hash('admin123', 10, (err, hashedPassword) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Insert admin user
              this.db.run(`
                INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              `, ['admin', 'admin@example.com', hashedPassword, 'admin', 1], (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                // Insert sample regular user
                bcrypt.hash('user123', 10, (err, userPassword) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  this.db.run(`
                    INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                  `, ['user', 'user@example.com', userPassword, 'user', 1], (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    
                    console.log('Initial users seeded successfully');
                    this.seedDashboardSummary(resolve, reject);
                  });
                });
              });
            });
          } else {
            this.seedDashboardSummary(resolve, reject);
          }
        });
      } catch (error) {
        console.error('Error seeding initial data:', error);
        reject(error);
      }
    });
  }
  
  private seedDashboardSummary(resolve: Function, reject: Function) {
    // Seed dashboard summary if empty
    this.db.get('SELECT COUNT(*) as count FROM dashboard_summary', (err, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count === 0) {
        this.db.run(`
          INSERT INTO dashboard_summary (total_tickets, open_tickets, closed_tickets, total_broadcasts, active_broadcasts, last_updated)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [0, 0, 0, 0, 0], (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('Initial dashboard summary seeded successfully');
          resolve(undefined);
        });
      } else {
        resolve(undefined);
      }
    });
  }

  private generateId(): string {
    // Generate a UUID-like string for SQLite
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      try {
        // Convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?, ?)
        const sqliteQuery = this.convertQuery(sql);
        
        if (sqliteQuery.toLowerCase().trim().startsWith('select')) {
          this.db.all(sqliteQuery, params, (err, rows) => {
            if (err) {
              console.error('SQLite query error:', err);
              reject(err);
            } else {
              resolve(rows || []);
            }
          });
        } else {
          this.db.run(sqliteQuery, params, function(err) {
            if (err) {
              console.error('SQLite query error:', err);
              reject(err);
            } else {
              resolve([{ 
                affectedRows: this.changes,
                insertId: this.lastID 
              }]);
            }
          });
        }
      } catch (error) {
        console.error('SQLite query error:', error);
        reject(error);
      }
    });
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
