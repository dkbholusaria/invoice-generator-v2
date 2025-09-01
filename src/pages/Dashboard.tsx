import React, { useState, useEffect } from 'react';
import { startOfWeek, eachDayOfInterval, addDays, format } from 'date-fns';
import StatsCard from '../components/dashboard/StatsCard';
import PaymentTrendChart from '../components/dashboard/PaymentTrendChart';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { Invoice, Payment } from '../types/database';
import * as XLSX from 'xlsx';

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalReceived: 0,
    pendingAmount: 0,
    overdue: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [reconciliationItems, setReconciliationItems] = useState<any[]>([]);

  // Subscribe to real-time updates
  const { status: syncStatus } = useRealtimeSync({
    table: 'invoices',
    onDataChange: (data: Invoice) => {
      // Update dashboard data when invoices change
      loadDashboardData();
    },
  });

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    // TODO: Implement actual data loading from Supabase
    // For now, using mock data
    const mockTrendData = generateMockTrendData();
    setTrendData(mockTrendData);

    setStats({
      totalInvoiced: 250000,
      totalReceived: 180000,
      pendingAmount: 70000,
      overdue: 25000,
    });

    setReconciliationItems([
      {
        id: '1',
        date: new Date().toISOString(),
        description: 'Invoice #INV-001',
        amount: 15000,
        status: 'matched',
        source: 'razorpay',
      },
      {
        id: '2',
        date: new Date().toISOString(),
        description: 'Invoice #INV-002',
        amount: 25000,
        status: 'unmatched',
        source: 'tally',
      },
      // Add more mock items...
    ]);
  };

  const generateMockTrendData = () => {
    const startDate = startOfWeek(new Date());
    const days = eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, 6),
    });

    return days.map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      invoiced: Math.floor(Math.random() * 50000) + 20000,
      amount: Math.floor(Math.random() * 40000) + 15000,
    }));
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(reconciliationItems);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation');
    XLSX.writeFile(wb, `reconciliation-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="rounded-md border border-gray-300 px-3 py-1.5"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Invoiced"
          value={new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(stats.totalInvoiced)}
          change={{ value: 12, type: 'increase' }}
        />
        <StatsCard
          title="Total Received"
          value={new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(stats.totalReceived)}
          change={{ value: 8, type: 'increase' }}
        />
        <StatsCard
          title="Pending Amount"
          value={new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(stats.pendingAmount)}
          change={{ value: 5, type: 'decrease' }}
        />
        <StatsCard
          title="Overdue Amount"
          value={new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(stats.overdue)}
          change={{ value: 2, type: 'increase' }}
        />
      </div>

      <div className="grid">
        <PaymentTrendChart
          data={trendData}
          timeRange={timeRange}
        />
      </div>

      {!syncStatus.online && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md shadow">
          You're offline. Data will sync when connection is restored.
        </div>
      )}
    </div>
  );
};

export default Dashboard;
