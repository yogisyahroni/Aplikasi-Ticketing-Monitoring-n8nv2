-- Fix schema to match existing structure

-- Add created_by column to tickets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'created_by') THEN
        ALTER TABLE tickets ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
        -- Set default value for existing records
        UPDATE tickets SET created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) WHERE created_by IS NULL;
    END IF;
END $$;

-- Rename subject to title if subject exists and title doesn't
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tickets' AND column_name = 'subject') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'tickets' AND column_name = 'title') THEN
        ALTER TABLE tickets RENAME COLUMN subject TO title;
    END IF;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies for tickets (without auth.uid since we're using custom auth)
DROP POLICY IF EXISTS "Enable read access for all users" ON tickets;
CREATE POLICY "Enable read access for all users" ON tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON tickets;
CREATE POLICY "Enable insert for all users" ON tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON tickets;
CREATE POLICY "Enable update for all users" ON tickets FOR UPDATE USING (true);

-- Create simple RLS policies for ticket_comments
DROP POLICY IF EXISTS "Enable read access for all users" ON ticket_comments;
CREATE POLICY "Enable read access for all users" ON ticket_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON ticket_comments;
CREATE POLICY "Enable insert for all users" ON ticket_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON ticket_comments;
CREATE POLICY "Enable update for all users" ON ticket_comments FOR UPDATE USING (true);

-- Create simple RLS policies for users
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON users;
CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON users;
CREATE POLICY "Enable update for all users" ON users FOR UPDATE USING (true);

-- Create simple RLS policies for broadcast_logs
DROP POLICY IF EXISTS "Enable read access for all users" ON broadcast_logs;
CREATE POLICY "Enable read access for all users" ON broadcast_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON broadcast_logs;
CREATE POLICY "Enable insert for all users" ON broadcast_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON broadcast_logs;
CREATE POLICY "Enable update for all users" ON broadcast_logs FOR UPDATE USING (true);