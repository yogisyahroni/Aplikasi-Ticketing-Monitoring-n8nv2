// User types
export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Ticket types
export type TicketStatus = 'open' | 'pending' | 'on_hold' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: number;
  ticket_uid: string;
  tracking_number?: string;
  customer_phone?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  comment_count?: number;
}

export interface TicketComment {
  id: string;
  ticket_id: number;
  user_id?: string;
  user_name?: string;
  comment_text: string;
  is_internal_note: boolean;
  created_at: string;
}

// Broadcast Log types
export type BroadcastStatus = 'success' | 'failed' | 'pending';

export interface BroadcastLog {
  id: string;
  tracking_number?: string;
  consignee_phone?: string;
  status: BroadcastStatus;
  message_content?: string;
  error_message?: string;
  broadcast_at: string;
}

// Dashboard types
export interface DashboardSummary {
  tickets: {
    total_tickets: number;
    open_tickets: number;
    pending_tickets: number;
    on_hold_tickets: number;
    closed_tickets: number;
    urgent_tickets: number;
    high_priority_tickets: number;
  };
  broadcasts: {
    total_broadcasts: number;
    successful_broadcasts: number;
    failed_broadcasts: number;
    pending_broadcasts: number;
    success_rate: number;
  };
  users: {
    total_users: number;
    active_agents: number;
    active_admins: number;
  };
  recent_activity: Array<{
    type: 'ticket' | 'broadcast';
    description: string;
    timestamp: string;
  }>;
}

export interface TrendData {
  date: string;
  total: number;
  open?: number;
  pending?: number;
  on_hold?: number;
  closed?: number;
  success?: number;
  failed?: number;
}

export interface AgentPerformance {
  id: string;
  full_name: string;
  email: string;
  total_tickets: number;
  closed_tickets: number;
  open_tickets: number;
  pending_tickets: number;
  resolution_rate: number;
  avg_resolution_time_hours: number;
}

export interface PriorityDistribution {
  priority: TicketPriority;
  count: number;
  percentage: number;
}

// API Response types
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface CreateTicketForm {
  tracking_number?: string;
  customer_phone?: string;
  subject: string;
  description: string;
  priority: TicketPriority;
}

export interface UpdateTicketForm {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to_user_id?: string;
}

export interface CreateUserForm {
  full_name: string;
  email: string;
  password: string;
  role: 'admin' | 'agent';
}

export interface UpdateUserForm {
  full_name?: string;
  email?: string;
  role?: 'admin' | 'agent';
  is_active?: boolean;
}

export interface AddCommentForm {
  comment_text: string;
  is_internal_note: boolean;
}