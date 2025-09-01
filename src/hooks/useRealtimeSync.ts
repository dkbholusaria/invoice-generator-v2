import { useState, useEffect } from 'react';
import { realtimeSyncService } from '../services/realtimeSync';

type TableName = 'customers' | 'items' | 'rates' | 'invoices' | 'payments';

interface UseSyncOptions<T> {
  table: TableName;
  onDataChange?: (data: T, type: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

interface SyncStatus {
  online: boolean;
  pendingChanges: number;
  pendingByTable: Record<TableName, number>;
}

export function useRealtimeSync<T>({ table, onDataChange }: UseSyncOptions<T>) {
  const [status, setStatus] = useState<SyncStatus>({
    online: navigator.onLine,
    pendingChanges: 0,
    pendingByTable: {
      customers: 0,
      items: 0,
      rates: 0,
      invoices: 0,
      payments: 0,
    },
  });

  useEffect(() => {
    // Subscribe to real-time changes
    const unsubscribe = realtimeSyncService.subscribe({
      table,
      onChange: (data, type) => {
        onDataChange?.(data, type);
        updateStatus();
      },
    });

    // Update initial status
    updateStatus();

    // Set up status update interval
    const statusInterval = setInterval(updateStatus, 5000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [table]);

  const updateStatus = () => {
    const connectionStatus = realtimeSyncService.getConnectionStatus();
    const pendingByTable = realtimeSyncService.getPendingChangesByTable();

    setStatus({
      online: connectionStatus.online,
      pendingChanges: connectionStatus.pendingChanges,
      pendingByTable,
    });
  };

  const syncData = async (data: T, type: 'INSERT' | 'UPDATE' | 'DELETE') => {
    await realtimeSyncService.syncData(table, type, data);
    updateStatus();
  };

  return {
    status,
    syncData,
  };
}
