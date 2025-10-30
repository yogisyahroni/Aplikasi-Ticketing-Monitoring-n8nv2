import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { DashboardSummary, TrendData, AgentPerformance, PriorityDistribution } from '../types';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { 
  TicketTrendsChart,
  BroadcastTrendsChart,
  PriorityDistributionChart,
  AgentPerformanceChart
} from '../components/charts';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  Ticket, 
  Radio, 
  Users, 
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [ticketTrends, setTicketTrends] = useState<TrendData[]>([]);
  const [broadcastTrends, setBroadcastTrends] = useState<TrendData[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<PriorityDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const { isConnected, lastUpdate } = useWebSocketContext();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle real-time updates
  useEffect(() => {
    if (lastUpdate && (lastUpdate.type === 'dashboard_updated' || lastUpdate.type === 'ticket_created' || lastUpdate.type === 'ticket_updated')) {
      // Refresh dashboard data when relevant updates occur
      fetchDashboardData();
    }
  }, [lastUpdate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, ticketTrendsRes, broadcastTrendsRes, agentPerfRes, priorityDistRes] = await Promise.all([
        apiClient.get('/dashboard/summary'),
        apiClient.get('/dashboard/ticket-trends?period=7'),
        apiClient.get('/dashboard/broadcast-trends?period=7'),
        apiClient.get('/dashboard/agent-performance'),
        apiClient.get('/dashboard/priority-distribution')
      ]);

      setSummary(summaryRes as DashboardSummary);
      setTicketTrends(ticketTrendsRes as TrendData[]);
      setBroadcastTrends(broadcastTrendsRes as TrendData[]);
      setAgentPerformance(agentPerfRes as AgentPerformance[]);
      setPriorityDistribution(priorityDistRes as PriorityDistribution[]);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'on_hold': return 'text-orange-600 bg-orange-50';
      case 'closed': return 'text-green-600 bg-green-50';
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Monitor your broadcast and ticketing performance</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* WebSocket Connection Status */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">Disconnected</span>
              </>
            )}
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tickets Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.tickets.total_tickets || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Ticket className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Open</span>
              <span className="font-medium text-blue-600">{summary?.tickets.open_tickets || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pending</span>
              <span className="font-medium text-yellow-600">{summary?.tickets.pending_tickets || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Closed</span>
              <span className="font-medium text-green-600">{summary?.tickets.closed_tickets || 0}</span>
            </div>
          </div>
        </div>

        {/* Broadcasts Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Broadcasts</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.broadcasts.total_broadcasts || 0}</p>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Radio className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium text-green-600">
                {summary?.broadcasts.success_rate?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${summary?.broadcasts.success_rate || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Users Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.users.total_users || 0}</p>
            </div>
            <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Agents</span>
              <span className="font-medium text-purple-600">{summary?.users.active_agents || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Admins</span>
              <span className="font-medium text-purple-600">{summary?.users.active_admins || 0}</span>
            </div>
          </div>
        </div>

        {/* Priority Tickets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-gray-900">
                {(summary?.tickets.urgent_tickets || 0) + (summary?.tickets.high_priority_tickets || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Urgent</span>
              <span className="font-medium text-red-600">{summary?.tickets.urgent_tickets || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">High</span>
              <span className="font-medium text-orange-600">{summary?.tickets.high_priority_tickets || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Trends (7 Days)</h3>
          {ticketTrends.length > 0 ? (
            <TicketTrendsChart data={ticketTrends} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Broadcast Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Broadcast Trends (7 Days)</h3>
          {broadcastTrends.length > 0 ? (
            <BroadcastTrendsChart data={broadcastTrends} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
          {agentPerformance.length > 0 ? (
            <AgentPerformanceChart data={agentPerformance} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          {priorityDistribution.length > 0 ? (
            <PriorityDistributionChart data={priorityDistribution} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;