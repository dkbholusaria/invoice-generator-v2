import React, { useState, useEffect } from 'react';
import { voucherQueue } from '../../services/voucherQueue';

const VoucherQueueMonitor: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    processing: false,
    tasks: [] as Array<{
      id: string;
      type: 'sales' | 'receipt';
      retries: number;
      lastError?: string;
    }>,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const status = voucherQueue.getQueueStatus();
      setQueueStatus(status);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-medium mb-4">Voucher Queue Status</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Pending Tasks:</span>
          <span className="text-sm">{queueStatus.pending}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Processing:</span>
          <span className="text-sm">
            {queueStatus.processing ? (
              <span className="text-green-600">Active</span>
            ) : (
              <span className="text-gray-500">Idle</span>
            )}
          </span>
        </div>

        {queueStatus.tasks.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Queue Details</h3>
            <div className="max-h-60 overflow-y-auto">
              {queueStatus.tasks.map((task) => (
                <div
                  key={task.id}
                  className="border-b last:border-b-0 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{task.id}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        task.type === 'sales'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {task.type}
                    </span>
                  </div>
                  {task.retries > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      Retries: {task.retries}
                    </div>
                  )}
                  {task.lastError && (
                    <div className="mt-1 text-xs text-red-600">
                      Error: {task.lastError}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoucherQueueMonitor;
