import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Authentication helpers
export const authHelpers = {
  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign up with email and password
  async signUp(email: string, password: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Reset password
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { data, error };
  },

  // Update password
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password
    });
    return { data, error };
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Real-time subscriptions
export const realtimeHelpers = {
  // Subscribe to table changes
  subscribeToTableChanges(
    table: keyof Database['public']['Tables'],
    callback: (payload: any) => void,
    statusCallback?: (status: string) => void,
    filter?: string
  ) {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table as string,
          filter
        },
        callback
      )
      .subscribe((status) => {
        if (statusCallback) statusCallback(status);
      });

    return channel;
  },

  // Subscribe to specific events
  subscribeToInserts(
    table: keyof Database['public']['Tables'],
    callback: (payload: any) => void,
    statusCallback?: (status: string) => void,
    filter?: string
  ) {
    return supabase
      .channel(`${table}_inserts`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table as string,
          filter
        },
        callback
      )
      .subscribe((status) => {
        if (statusCallback) statusCallback(status);
      });
  },

  subscribeToUpdates(
    table: keyof Database['public']['Tables'],
    callback: (payload: any) => void,
    statusCallback?: (status: string) => void,
    filter?: string
  ) {
    return supabase
      .channel(`${table}_updates`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table as string,
          filter
        },
        callback
      )
      .subscribe((status) => {
        if (statusCallback) statusCallback(status);
      });
  },

  subscribeToDeletes(
    table: keyof Database['public']['Tables'],
    callback: (payload: any) => void,
    statusCallback?: (status: string) => void,
    filter?: string
  ) {
    return supabase
      .channel(`${table}_deletes`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table as string,
          filter
        },
        callback
      )
      .subscribe((status) => {
        if (statusCallback) statusCallback(status);
      });
  },

  // Unsubscribe from channel
  unsubscribe(channel: any) {
    return supabase.removeChannel(channel);
  }
};

// Storage helpers
export const storageHelpers = {
  // Upload file
  async uploadFile(bucket: string, path: string, file: File, options?: any) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);
    return { data, error };
  },

  // Download file
  async downloadFile(bucket: string, path: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);
    return { data, error };
  },

  // Get public URL
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  // Delete file
  async deleteFile(bucket: string, paths: string[]) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(paths);
    return { data, error };
  },

  // List files
  async listFiles(bucket: string, path?: string, options?: any) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, options);
    return { data, error };
  },

  // Create signed URL
  async createSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    return { data, error };
  }
};
