-- Add missing columns to existing tables

-- Add created_by column to tickets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'created_by') THEN
        ALTER TABLE tickets ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add title column to tickets table if it doesn't exist (rename subject to title if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'title') THEN
        -- If subject exists, rename it to title
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'subject') THEN
            ALTER TABLE tickets RENAME COLUMN subject TO title;
        ELSE
            -- Otherwise add title column
            ALTER TABLE tickets ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Untitled';
        END IF;
    END IF;
END $$;

-- Update ticket status enum to match expected values
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name LIKE '%tickets_status_check%') THEN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
        CHECK (status IN ('open', 'pending', 'on_hold', 'closed'));
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies for tickets
DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
CREATE POLICY "Users can view tickets" ON tickets
    FOR SELECT USING (
        created_by::text = auth.uid()::text 
        OR assigned_to_user_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
CREATE POLICY "Users can create tickets" ON tickets
    FOR INSERT WITH CHECK (
        created_by::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );

DROP POLICY IF EXISTS "Users can update tickets" ON tickets;
CREATE POLICY "Users can update tickets" ON tickets
    FOR UPDATE USING (
        created_by::text = auth.uid()::text 
        OR assigned_to_user_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'role' = 'agent')
        )
    );