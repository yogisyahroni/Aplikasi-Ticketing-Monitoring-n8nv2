-- Database Schema for Dashboard Monitoring Broadcast & Ticketing Logistik
-- Terintegrasi dengan n8n

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('agent', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create ENUM types for ticket status and priority
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'on_hold', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
END$$;

-- Main tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_uid VARCHAR(30) UNIQUE NOT NULL,
    tracking_number VARCHAR(50) UNIQUE,
    customer_phone VARCHAR(30),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'open',
    priority ticket_priority DEFAULT 'medium',
    assigned_to_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(50),
    consignee_phone VARCHAR(30),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    message_content TEXT,
    error_message TEXT,
    broadcast_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments table for internal notes and customer replies
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id BIGINT NOT NULL,
    user_id UUID,
    comment_text TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Dashboard summary table for performance optimization
CREATE TABLE IF NOT EXISTS dashboard_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(50) NOT NULL,
    metric_value INTEGER NOT NULL,
    metric_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tickets table
DROP TRIGGER IF EXISTS set_timestamp_tickets ON tickets;
CREATE TRIGGER set_timestamp_tickets
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Apply trigger to users table
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Function to generate ticket UID
CREATE OR REPLACE FUNCTION generate_ticket_uid()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_uid = 'CS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket UID
DROP TRIGGER IF EXISTS generate_ticket_uid_trigger ON tickets;
CREATE TRIGGER generate_ticket_uid_trigger
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_uid();