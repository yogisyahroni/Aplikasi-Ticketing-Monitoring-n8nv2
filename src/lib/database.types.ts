export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'agent' | 'user';
          is_active: boolean;
          created_at: string;
          updated_at: string;
          password_hash?: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'agent' | 'user';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          password_hash?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'agent' | 'user';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          password_hash?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          ticket_uid: string;
          tracking_number?: string;
          customer_phone?: string;
          title: string;
          description: string;
          status: 'open' | 'pending' | 'on_hold' | 'closed';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          assigned_to_user_id?: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          closed_at?: string;
        };
        Insert: {
          id?: string;
          ticket_uid?: string;
          tracking_number?: string;
          customer_phone?: string;
          title: string;
          description: string;
          status?: 'open' | 'pending' | 'on_hold' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          assigned_to_user_id?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          closed_at?: string;
        };
        Update: {
          id?: string;
          ticket_uid?: string;
          tracking_number?: string;
          customer_phone?: string;
          title?: string;
          description?: string;
          status?: 'open' | 'pending' | 'on_hold' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          assigned_to_user_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          closed_at?: string;
        };
      };
      ticket_comments: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string;
          comment: string;
          is_internal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id: string;
          comment: string;
          is_internal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string;
          comment?: string;
          is_internal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      broadcast_logs: {
        Row: {
          id: string;
          tracking_number: string;
          consignee_name?: string;
          consignee_phone: string;
          message_content: string;
          status: 'pending' | 'success' | 'failed';
          error_message?: string;
          broadcast_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tracking_number: string;
          consignee_name?: string;
          consignee_phone: string;
          message_content: string;
          status?: 'pending' | 'success' | 'failed';
          error_message?: string;
          broadcast_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tracking_number?: string;
          consignee_name?: string;
          consignee_phone?: string;
          message_content?: string;
          status?: 'pending' | 'success' | 'failed';
          error_message?: string;
          broadcast_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'admin' | 'agent' | 'user';
      ticket_status: 'open' | 'pending' | 'on_hold' | 'closed';
      ticket_priority: 'low' | 'medium' | 'high' | 'urgent';
      broadcast_status: 'pending' | 'success' | 'failed';
    };
  };
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Ticket = Database['public']['Tables']['tickets']['Row'];
export type TicketInsert = Database['public']['Tables']['tickets']['Insert'];
export type TicketUpdate = Database['public']['Tables']['tickets']['Update'];

export type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];
export type TicketCommentInsert = Database['public']['Tables']['ticket_comments']['Insert'];
export type TicketCommentUpdate = Database['public']['Tables']['ticket_comments']['Update'];

export type BroadcastLog = Database['public']['Tables']['broadcast_logs']['Row'];
export type BroadcastLogInsert = Database['public']['Tables']['broadcast_logs']['Insert'];
export type BroadcastLogUpdate = Database['public']['Tables']['broadcast_logs']['Update'];

// Enums
export type UserRole = Database['public']['Enums']['user_role'];
export type TicketStatus = Database['public']['Enums']['ticket_status'];
export type TicketPriority = Database['public']['Enums']['ticket_priority'];
export type BroadcastStatus = Database['public']['Enums']['broadcast_status'];