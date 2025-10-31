-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'agent', 'user')),
    is_active BOOLEAN DEFAULT true,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'on_hold', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Create ticket_comments table
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create broadcast_logs table
CREATE TABLE IF NOT EXISTS broadcast_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(255) NOT NULL,
    consignee_name VARCHAR(255) NOT NULL,
    consignee_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    response_message TEXT,
    broadcast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_user_id ON ticket_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_status ON broadcast_logs(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_tracking_number ON broadcast_logs(tracking_number);
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_broadcast_at ON broadcast_logs(broadcast_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broadcast_logs_updated_at BEFORE UPDATE ON broadcast_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

CREATE POLICY "Admins can update users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create RLS policies for tickets table
CREATE POLICY "Users can view tickets they created or are assigned to" ON tickets
    FOR SELECT USING (
        created_by::text = auth.uid()::text 
        OR assigned_to_user_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

CREATE POLICY "Users can create tickets" ON tickets
    FOR INSERT WITH CHECK (created_by::text = auth.uid()::text);

CREATE POLICY "Users can update their own tickets or admins/agents can update any" ON tickets
    FOR UPDATE USING (
        created_by::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

-- Create RLS policies for ticket_comments table
CREATE POLICY "Users can view comments on tickets they have access to" ON ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE id = ticket_comments.ticket_id 
            AND (
                created_by::text = auth.uid()::text 
                OR assigned_to_user_id::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE id::text = auth.uid()::text 
                    AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
                )
            )
        )
    );

CREATE POLICY "Users can create comments on tickets they have access to" ON ticket_comments
    FOR INSERT WITH CHECK (
        user_id::text = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM tickets 
            WHERE id = ticket_comments.ticket_id 
            AND (
                created_by::text = auth.uid()::text 
                OR assigned_to_user_id::text = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE id::text = auth.uid()::text 
                    AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
                )
            )
        )
    );

-- Create RLS policies for broadcast_logs table
CREATE POLICY "Admins and agents can view all broadcast logs" ON broadcast_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

CREATE POLICY "Admins and agents can create broadcast logs" ON broadcast_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

CREATE POLICY "Admins and agents can update broadcast logs" ON broadcast_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

-- Insert default admin user (password: admin123)
INSERT INTO users (id, email, full_name, role, password_hash) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@ticketing.com', 'System Administrator', 'admin', '$2b$10$rQZ8kHWKtGXGvqWfqvq4/.K8YQZ8kHWKtGXGvqWfqvq4/.K8YQZ8k')
ON CONFLICT (email) DO NOTHING;