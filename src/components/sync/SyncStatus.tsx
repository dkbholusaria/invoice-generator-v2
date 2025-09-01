import React from 'react';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

const SyncStatus: React.FC = () => {
  const { status } = useRealtimeSync({
    table: 'invoices', // We'll use invoices as the main table to monitor
  });

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'bg-green-500' : 'bg-red-500';
  };

  const getTableStatusColor = (count: number) => {
    return count > 0 ? 'text-yellow-600' : 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Sync Status</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${getStatusColor(
              status.online
            )}`}
          />
          <span className="text-sm text-gray-600">
            {status.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {status.pendingChanges > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-700">
            {status.pendingChanges} change{status.pendingChanges > 1 ? 's' : ''}{' '}
            pending synchronization
          </p>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium mb-2">Sync Queue by Type</h3>
        {Object.entries(status.pendingByTable).map(([table, count]) => (
          <div
            key={table}
            className="flex items-center justify-between text-sm"
          >
            <span className="capitalize">{table}</span>
            <span className={getTableStatusColor(count)}>
              {count === 0 ? (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Synced
                </span>
              ) : (
                `${count} pending`
              )}
            </span>
          </div>
        ))}
      </div>

      {!status.online && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-500">
            You're currently offline. Changes will be synchronized when you're back
            online.
          </p>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
