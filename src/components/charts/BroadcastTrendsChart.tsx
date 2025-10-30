import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendData } from '../../types';

interface BroadcastTrendsChartProps {
  data: TrendData[];
}

const BroadcastTrendsChart: React.FC<BroadcastTrendsChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    success: item.success || 0,
    failed: item.failed || 0,
    total: item.total || 0,
    successRate: item.total > 0 ? ((item.success || 0) / item.total * 100).toFixed(1) : 0
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
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
          formatter={(value, name) => {
            if (name === 'successRate') {
              return [`${value}%`, 'Success Rate'];
            }
            return [value, name];
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="success"
          stackId="1"
          stroke="#10b981"
          fill="url(#colorSuccess)"
          name="Successful"
        />
        <Area
          type="monotone"
          dataKey="failed"
          stackId="1"
          stroke="#ef4444"
          fill="url(#colorFailed)"
          name="Failed"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default BroadcastTrendsChart;