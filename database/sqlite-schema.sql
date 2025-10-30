-- SQLite Schema for Dashboard Monitoring Broadcast & Ticketing Logistik
-- Converted from PostgreSQL schema for temporary use

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('agent', 'admin')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Main tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_uid TEXT UNIQUE NOT NULL,
    tracking_number TEXT UNIQUE,
    customer_phone TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'on_hold', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for tickets table
CREATE INDEX IF NOT EXISTS idx_tickets_tracking_number ON tickets(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- Broadcast logs table for n8n integration
CREATE TABLE IF NOT EXISTS broadcast_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tracking_number TEXT,
    consignee_phone TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    message_content TEXT,
    error_message TEXT,
    broadcast_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments table for internal notes and customer replies
CREATE TABLE IF NOT EXISTS ticket_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    ticket_id INTEGER NOT NULL,
    user_id TEXT,
    comment_text TEXT NOT NULL,
    is_internal_note INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Dashboard summary table for performance optimization
CREATE TABLE IF NOT EXISTS dashboard_summary (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    metric_name TEXT NOT NULL,
    metric_value INTEGER NOT NULL,
    metric_date DATE DEFAULT (date('now')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(metric_name, metric_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_tracking_number ON broadcast_logs(tracking_number);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_phone ON broadcast_logs(consignee_phone);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_status ON broadcast_logs(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_broadcast_at ON broadcast_logs(broadcast_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_summary_date ON dashboard_summary(metric_date DESC);

-- Triggers for updated_at timestamp (SQLite equivalent)
CREATE TRIGGER IF NOT EXISTS trigger_users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS trigger_tickets_updated_at 
    AFTER UPDATE ON tickets
    FOR EACH ROW
    BEGIN
        UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger to auto-generate ticket UID (SQLite equivalent)
CREATE TRIGGER IF NOT EXISTS trigger_generate_ticket_uid
    AFTER INSERT ON tickets
    FOR EACH ROW
    WHEN NEW.ticket_uid IS NULL OR NEW.ticket_uid = ''
    BEGIN
        UPDATE tickets 
        SET ticket_uid = 'CS-' || strftime('%Y', 'now') || '-' || printf('%04d', NEW.id)
        WHERE id = NEW.id;
    END;