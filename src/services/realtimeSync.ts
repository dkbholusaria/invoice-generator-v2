import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'customers' | 'items' | 'rates' | 'invoices' | 'payments';
type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

interface SyncSubscription {
  table: TableName;
  onChange: (payload: any, type: ChangeType) => void;
}

class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private isOnline: boolean = navigator.onLine;
  private pendingChanges: Array<{
    table: TableName;
    type: ChangeType;
    data: any;
    timestamp: number;
  }> = [];

  private constructor() {
    this.setupNetworkListeners();
    this.loadPendingChanges();
  }

  static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private loadPendingChanges() {
    const stored = localStorage.getItem('pendingChanges');
    if (stored) {
      this.pendingChanges = JSON.parse(stored);
    }
  }

  private savePendingChanges() {
    localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
  }

  private async processPendingChanges() {
    if (!this.isOnline || this.pendingChanges.length === 0) return;

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];
    this.savePendingChanges();

    for (const change of changes) {
      try {
        switch (change.type) {
          case 'INSERT':
            await supabase.from(change.table).insert(change.data);
            break;
          case 'UPDATE':
            await supabase
              .from(change.table)
              .update(change.data)
              .eq('id', change.data.id);
            break;
          case 'DELETE':
            await supabase
              .from(change.table)
              .delete()
              .eq('id', change.data.id);
            break;
        }
      } catch (error) {
        console.error(`Error processing pending change for ${change.table}:`, error);
        // Re-add failed changes to the queue
        this.pendingChanges.push(change);
        this.savePendingChanges();
      }
    }
  }

  subscribe({ table, onChange }: SyncSubscription): () => void {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload) => {
          const changeType = payload.eventType as ChangeType;
          onChange(payload.new || payload.old, changeType);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`Error subscribing to ${table}:`, err);
          this.isOnline = false;
          return;
        }
        
        if (status === 'SUBSCRIBED') {
          this.isOnline = true;
          this.processPendingChanges();
        } else if (status === 'CHANNEL_ERROR') {
          this.isOnline = false;
          console.error(`Channel error for ${table}`);
        } else if (status === 'TIMED_OUT') {
          this.isOnline = false;
          console.error(`Connection timed out for ${table}`);
        }
      });

    this.subscriptions.set(table, channel);

    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(table);
    };
  }

  async syncData<T>(
    table: TableName,
    type: ChangeType,
    data: T
  ): Promise<void> {
    if (!this.isOnline) {
      // Store change for later processing
      this.pendingChanges.push({
        table,
        type,
        data,
        timestamp: Date.now(),
      });
      this.savePendingChanges();
      return;
    }

    try {
      switch (type) {
        case 'INSERT':
          await supabase.from(table).insert(data);
          break;
        case 'UPDATE':
          await supabase
            .from(table)
            .update(data)
            .eq('id', (data as any).id);
          break;
        case 'DELETE':
          await supabase
            .from(table)
            .delete()
            .eq('id', (data as any).id);
          break;
      }
    } catch (error) {
      console.error(`Error syncing data for ${table}:`, error);
      // Store failed change for retry
      this.pendingChanges.push({
        table,
        type,
        data,
        timestamp: Date.now(),
      });
      this.savePendingChanges();
    }
  }

  getConnectionStatus(): { online: boolean; pendingChanges: number } {
    return {
      online: this.isOnline,
      pendingChanges: this.pendingChanges.length,
    };
  }

  getPendingChangesByTable(): Record<TableName, number> {
    return this.pendingChanges.reduce(
      (acc, change) => {
        acc[change.table]++;
        return acc;
      },
      {
        customers: 0,
        items: 0,
        rates: 0,
        invoices: 0,
        payments: 0,
      }
    );
  }
}

export const realtimeSyncService = RealtimeSyncService.getInstance();
