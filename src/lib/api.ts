import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { accessToken, refreshAccessToken, logout } = useAuthStore.getState();

    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 - try to refresh token
      if (response.status === 401 && accessToken) {
        try {
          await refreshAccessToken();
          const newToken = useAuthStore.getState().accessToken;
          
          // Retry request with new token
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          };
          
          const retryResponse = await fetch(url, config);
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          
          return await retryResponse.json();
        } catch (refreshError) {
          logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// API endpoints
export const endpoints = {
  // Auth
  login: '/auth/login',
  refresh: '/auth/refresh',
  me: '/auth/me',
  logout: '/auth/logout',

  // Dashboard
  summary: '/dashboard/summary',
  ticketTrends: '/dashboard/ticket-trends',
  broadcastTrends: '/dashboard/broadcast-trends',
  agentPerformance: '/dashboard/agent-performance',
  priorityDistribution: '/dashboard/priority-distribution',

  // Tickets
  tickets: '/tickets',
  ticketComments: (ticketId: string) => `/tickets/${ticketId}/comments`,

  // Broadcast Logs
  broadcastLogs: '/broadcast-logs',
  broadcastStats: '/broadcast-logs/stats',

  // Users
  users: '/users',
  agents: '/users/agents',
};

// Export the client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export the default API client (alias)
export const api = apiClient;