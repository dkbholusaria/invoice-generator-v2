import React, { useState, useEffect } from 'react';
import { startOfWeek, eachDayOfInterval, addDays, format, subDays, subMonths, subYears } from 'date-fns';
import StatsCard from '../components/dashboard/StatsCard';
import PaymentTrendChart from '../components/dashboard/PaymentTrendChart';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { Invoice, Payment } from '../types/database';
import { getInvoices } from '../lib/database';
import * as XLSX from 'xlsx';

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    try {
      setLoading(true);
      setError(null);

      // Get all invoices from the database
      const invoices = await getInvoices();

      // Calculate date range based on selected time range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = subMonths(now, 1);
          break;
        case 'year':
          startDate = subYears(now, 1);
          break;
        default:
          startDate = startOfWeek(now);
      }

      // Filter invoices within the selected time range
      const filteredInvoices = invoices.filter(invoice =>
        new Date(invoice.invoice_date) >= startDate
      );

      // Calculate statistics
      const totalInvoiced = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const totalReceived = filteredInvoices
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.total, 0);

      // Pending amount: all non-paid invoices (sent, draft, etc.)
      const pendingAmount = filteredInvoices
        .filter(invoice => invoice.status !== 'paid' && invoice.status !== 'cancelled')
        .reduce((sum, invoice) => sum + invoice.total, 0);

      // Overdue amount: invoices past due date that are not paid
      const overdue = filteredInvoices
        .filter(invoice => {
          const dueDate = new Date(invoice.due_date);
          return dueDate < now && invoice.status !== 'paid' && invoice.status !== 'cancelled';
        })
        .reduce((sum, invoice) => sum + invoice.total, 0);

      console.log('Dashboard calculations:', {
        totalInvoiced,
        totalReceived,
        pendingAmount,
        overdue,
        invoiceCount: filteredInvoices.length,
        invoices: filteredInvoices.map(inv => ({
          number: inv.invoice_number,
          status: inv.status,
          total: inv.total,
          due_date: inv.due_date
        }))
      });

      setStats({
        totalInvoiced,
        totalReceived,
        pendingAmount,
        overdue,
      });

      // Generate trend data from real invoices
      const trendData = generateTrendDataFromInvoices(filteredInvoices, timeRange);
      setTrendData(trendData);

      // Generate reconciliation items from invoices
      const reconciliationItems = generateReconciliationItems(filteredInvoices);
      setReconciliationItems(reconciliationItems);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
      // Fallback to mock data if there's an error
      const mockTrendData = generateMockTrendData();
      setTrendData(mockTrendData);
    } finally {
      setLoading(false);
    }
  };

  const generateTrendDataFromInvoices = (invoices: Invoice[], timeRange: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    let interval: 'day' | 'week' | 'month';

    switch (timeRange) {
      case 'week':
        startDate = startOfWeek(now);
        interval = 'day';
        break;
      case 'month':
        startDate = subMonths(now, 1);
        interval = 'day';
        break;
      case 'year':
        startDate = subYears(now, 1);
        interval = 'month';
        break;
      default:
        startDate = startOfWeek(now);
        interval = 'day';
    }

    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    return days.map(day => {
      const dayInvoices = invoices.filter(invoice =>
        format(new Date(invoice.invoice_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );

      const invoiced = dayInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const amount = dayInvoices
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.total, 0);

      return {
        date: format(day, 'yyyy-MM-dd'),
        invoiced,
        amount,
      };
    });
  };

  const generateReconciliationItems = (invoices: Invoice[]) => {
    return invoices.map(invoice => ({
      id: invoice.id,
      date: invoice.invoice_date,
      description: `Invoice #${invoice.invoice_number}`,
      amount: invoice.total,
      status: invoice.status === 'paid' ? 'matched' : 'unmatched',
      source: invoice.status === 'paid' ? 'razorpay' : 'pending',
    }));
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="rounded-md border border-gray-300 px-3 py-1.5"
            disabled={loading}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

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
