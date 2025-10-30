import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { AgentPerformance } from '../../types';

interface AgentPerformanceChartProps {
  data: AgentPerformance[];
}

const AgentPerformanceChart: React.FC<AgentPerformanceChartProps> = ({ data }) => {
  const chartData = data.slice(0, 8).map(agent => ({
    name: agent.full_name.split(' ')[0], // First name only for better display
    fullName: agent.full_name,
    totalTickets: agent.total_tickets,
    closedTickets: agent.closed_tickets,
    resolutionRate: agent.resolution_rate,
    avgResolutionTime: agent.avg_resolution_time_hours
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          fontSize={12}
        />
        <YAxis 
          stroke="#6b7280"
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value, name, props) => {
            const { payload } = props;
            if (name === 'totalTickets') {
              return [
                `${value} tickets (${payload.resolutionRate.toFixed(1)}% resolved)`,
                'Total Tickets'
              ];
            }
            if (name === 'closedTickets') {
              return [
                `${value} tickets`,
                'Closed Tickets'
              ];
            }
            return [value, name];
          }}
          labelFormatter={(label) => {
            const agent = chartData.find(d => d.name === label);
            return agent ? agent.fullName : label;
          }}
        />
        <Legend />
        <Bar
          dataKey="totalTickets"
          fill="#3b82f6"
          name="Total Tickets"
          radius={[2, 2, 0, 0]}
        />
        <Bar
          dataKey="closedTickets"
          fill="#10b981"
          name="Closed Tickets"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AgentPerformanceChart;