import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface PaymentData {
  date: string;
  amount: number;
  invoiced: number;
}

interface PaymentTrendChartProps {
  data: PaymentData[];
  timeRange: 'week' | 'month' | 'year';
}

const PaymentTrendChart: React.FC<PaymentTrendChartProps> = ({
  data,
  timeRange,
}) => {
  const formatXAxis = (date: string) => {
    switch (timeRange) {
      case 'week':
        return format(new Date(date), 'EEE');
      case 'month':
        return format(new Date(date), 'd MMM');
      case 'year':
        return format(new Date(date), 'MMM');
      default:
        return date;
    }
  };

  const formatTooltipDate = (date: string) => {
    return format(new Date(date), 'PP');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-6">Payment Trends</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              padding={{ left: 30, right: 30 }}
            />
            <YAxis
              tickFormatter={(value) => `₹${value / 1000}K`}
            />
            <Tooltip
              labelFormatter={formatTooltipDate}
              formatter={(value: number) => [formatAmount(value)]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="invoiced"
              stroke="#4F46E5"
              name="Invoiced"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#10B981"
              name="Received"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PaymentTrendChart;
