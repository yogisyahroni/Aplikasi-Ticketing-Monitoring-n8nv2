// Mock database for testing without PostgreSQL
import bcrypt from 'bcrypt';

// Mock users data
export const mockUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    full_name: 'Administrator',
    email: 'admin@example.com',
    password_hash: '$2b$10$lgs2E2khBbcz91ImcfHVpedN4EiD8bagksebDTim.uOUmdYSXeCQ6', // admin123
    role: 'admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    full_name: 'Admin Logistik',
    email: 'admin@logistik.com',
    password_hash: '$2b$10$lgs2E2khBbcz91ImcfHVpedN4EiD8bagksebDTim.uOUmdYSXeCQ6', // admin123
    role: 'admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    full_name: 'Agent Satu',
    email: 'agent1@example.com',
    password_hash: '$2b$10$lgs2E2khBbcz91ImcfHVpedN4EiD8bagksebDTim.uOUmdYSXeCQ6', // admin123
    role: 'agent',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Mock tickets data
export const mockTickets = [
  {
    id: 1,
    ticket_uid: 'CS-2024-0001',
    tracking_number: 'TRK001234567',
    customer_phone: '+6281234567890',
    subject: 'Paket belum sampai',
    description: 'Paket dengan nomor resi TRK001234567 sudah 3 hari belum sampai ke alamat tujuan',
    status: 'open',
    priority: 'high',
    assigned_to_user_id: '550e8400-e29b-41d4-a716-446655440001',
    created_at: new Date(),
    updated_at: new Date(),
    closed_at: null
  },
  {
    id: 2,
    ticket_uid: 'CS-2024-0002',
    tracking_number: 'TRK001234568',
    customer_phone: '+6281234567891',
    subject: 'Paket rusak',
    description: 'Paket diterima dalam kondisi rusak',
    status: 'in_progress',
    priority: 'medium',
    assigned_to_user_id: '550e8400-e29b-41d4-a716-446655440001',
    created_at: new Date(),
    updated_at: new Date(),
    closed_at: null
  }
];

// Mock broadcast logs data
export const mockBroadcastLogs = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    tracking_number: 'TRK001234567',
    consignee_phone: '+6281234567890',
    status: 'success',
    message_content: 'Paket Anda dengan nomor resi TRK001234567 sedang dalam perjalanan',
    broadcast_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    tracking_number: 'TRK001234568',
    consignee_phone: '+6281234567891',
    status: 'success',
    message_content: 'Paket Anda dengan nomor resi TRK001234568 telah sampai di kota tujuan',
    broadcast_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000)
  }
];

// Mock dashboard summary data
export const mockDashboardSummary = [
  { metric_name: 'total_tickets', metric_value: 15, metric_date: new Date() },
  { metric_name: 'open_tickets', metric_value: 8, metric_date: new Date() },
  { metric_name: 'closed_tickets', metric_value: 7, metric_date: new Date() },
  { metric_name: 'total_broadcasts', metric_value: 25, metric_date: new Date() },
  { metric_name: 'successful_broadcasts', metric_value: 23, metric_date: new Date() },
  { metric_name: 'failed_broadcasts', metric_value: 2, metric_date: new Date() },
  { metric_name: 'active_agents', metric_value: 3, metric_date: new Date() }
];

// Mock database class
export class MockDatabase {
  static async query(text: string, params?: any[]): Promise<any> {
    console.log('Mock DB Query:', text, params);
    
    // Mock login query by email
    if (text.includes('SELECT') && text.includes('FROM users WHERE email = $1')) {
      const email = params?.[0];
      const user = mockUsers.find(u => u.email === email);
      console.log('Mock DB: Found user by email:', user ? 'YES' : 'NO', 'for email:', email);
      return { rows: user ? [user] : [] };
    }
    
    // Mock user query by ID
    if (text.includes('SELECT') && text.includes('FROM users WHERE id = $1')) {
      const id = params?.[0];
      const user = mockUsers.find(u => u.id === id);
      console.log('Mock DB: Found user by ID:', user ? 'YES' : 'NO', 'for id:', id);
      return { rows: user ? [user] : [] };
    }
    
    // Mock dashboard summary query
    if (text.includes('SELECT * FROM dashboard_summary')) {
      return { rows: mockDashboardSummary };
    }
    
    // Mock tickets query
    if (text.includes('SELECT * FROM tickets')) {
      return { rows: mockTickets };
    }
    
    // Mock broadcast logs query
    if (text.includes('SELECT * FROM broadcast_logs')) {
      return { rows: mockBroadcastLogs };
    }
    
    // Mock users query
    if (text.includes('SELECT * FROM users')) {
      return { rows: mockUsers };
    }
    
    // Default empty response
    return { rows: [] };
  }
  
  static async connect() {
    return {
      query: this.query,
      release: () => {}
    };
  }
}

export default MockDatabase;
