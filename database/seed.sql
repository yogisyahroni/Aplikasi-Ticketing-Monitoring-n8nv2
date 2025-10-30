-- Initial data for Dashboard Monitoring Broadcast & Ticketing Logistik

-- Insert admin user (password: admin123)
INSERT INTO users (id, full_name, email, password_hash, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Administrator', 'admin@logistik.com', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq', 'admin', TRUE),
('550e8400-e29b-41d4-a716-446655440001', 'Agent Satu', 'agent1@logistik.com', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq', 'agent', TRUE),
('550e8400-e29b-41d4-a716-446655440002', 'Agent Dua', 'agent2@logistik.com', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq', 'agent', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample tickets
INSERT INTO tickets (tracking_number, customer_phone, subject, description, status, priority, assigned_to_user_id) VALUES
('TRK001234567', '+6281234567890', 'Paket belum sampai', 'Paket dengan nomor resi TRK001234567 sudah 3 hari belum sampai ke alamat tujuan', 'open', 'high', '550e8400-e29b-41d4-a716-446655440001'),
('TRK001234568', '+6281234567891', 'Paket rusak', 'Paket diterima dalam kondisi rusak, mohon penggantian', 'pending', 'medium', '550e8400-e29b-41d4-a716-446655440002'),
('TRK001234569', '+6281234567892', 'Alamat salah', 'Alamat pengiriman salah, mohon diperbaiki', 'on_hold', 'low', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (tracking_number) DO NOTHING;

-- Insert sample broadcast logs
INSERT INTO broadcast_logs (tracking_number, consignee_phone, status, message_content, broadcast_at) VALUES
('TRK001234567', '+6281234567890', 'success', 'Paket Anda dengan nomor resi TRK001234567 sedang dalam perjalanan', NOW() - INTERVAL '2 hours'),
('TRK001234568', '+6281234567891', 'success', 'Paket Anda dengan nomor resi TRK001234568 telah sampai di kota tujuan', NOW() - INTERVAL '1 hour'),
('TRK001234569', '+6281234567892', 'failed', 'Paket Anda dengan nomor resi TRK001234569 gagal dikirim', NOW() - INTERVAL '30 minutes'),
('TRK001234570', '+6281234567893', 'success', 'Paket Anda dengan nomor resi TRK001234570 telah diterima', NOW() - INTERVAL '15 minutes');

-- Insert sample ticket comments
INSERT INTO ticket_comments (ticket_id, user_id, comment_text, is_internal_note) VALUES
(1, '550e8400-e29b-41d4-a716-446655440001', 'Sedang mengecek status paket dengan kurir', TRUE),
(1, '550e8400-e29b-41d4-a716-446655440001', 'Paket sedang dalam perjalanan, estimasi sampai besok', FALSE),
(2, '550e8400-e29b-41d4-a716-446655440002', 'Menunggu konfirmasi dari warehouse untuk penggantian', TRUE),
(3, '550e8400-e29b-41d4-a716-446655440001', 'Alamat sudah diperbaiki, menunggu pengiriman ulang', FALSE);

-- Insert dashboard summary metrics
INSERT INTO dashboard_summary (metric_name, metric_value, metric_date) VALUES
('total_tickets', 3, CURRENT_DATE),
('open_tickets', 1, CURRENT_DATE),
('pending_tickets', 1, CURRENT_DATE),
('closed_tickets', 0, CURRENT_DATE),
('total_broadcasts', 4, CURRENT_DATE),
('successful_broadcasts', 3, CURRENT_DATE),
('failed_broadcasts', 1, CURRENT_DATE),
('active_agents', 2, CURRENT_DATE)
ON CONFLICT (metric_name, metric_date) DO UPDATE SET
    metric_value = EXCLUDED.metric_value,
    updated_at = CURRENT_TIMESTAMP;