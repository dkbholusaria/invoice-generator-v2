import React, { useState, useEffect } from 'react';
import { tallyService } from '../../services/tally';
import Button from '../common/Button';

interface TallyIntegrationProps {
  onStatusChange?: (isConnected: boolean) => void;
}

const TallyIntegration: React.FC<TallyIntegrationProps> = ({ onStatusChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkTallyConnection();
  }, []);

  const checkTallyConnection = async () => {
    try {
      setIsChecking(true);
      setError(null);
      const connected = await tallyService.checkConnection();
      setIsConnected(connected);
      onStatusChange?.(connected);
    } catch (err) {
      setError('Failed to connect to Tally');
      setIsConnected(false);
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Tally Integration</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span>Tally Server:</span>
          <span className="font-mono">
            {process.env.TALLY_HOST || 'localhost'}:{process.env.TALLY_PORT || '9000'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Company:</span>
          <span>{process.env.TALLY_COMPANY || 'Not configured'}</span>
        </div>

        <Button
          onClick={checkTallyConnection}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Checking Connection...' : 'Check Connection'}
        </Button>
      </div>

      {isConnected && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Integration Status</h3>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Sales Voucher Integration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Receipt Voucher Integration
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TallyIntegration;
