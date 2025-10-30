import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendData } from '../../types';

interface TicketTrendsChartProps {
  data: TrendData[];
}

const TicketTrendsChart: React.FC<TicketTrendsChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    open: item.open || 0,
    closed: item.closed || 0,
    total: item.total || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
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
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="open"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          name="Open Tickets"
        />
        <Line
          type="monotone"
          dataKey="closed"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          name="Closed Tickets"
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#6b7280"
          strokeWidth={2}
          dot={{ fill: '#6b7280', strokeWidth: 2, r: 4 }}
          name="Total Tickets"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TicketTrendsChart;