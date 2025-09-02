import React, { useState, useEffect } from 'react';
import { tallyService } from '../../services/tally';
import Button from '../common/Button';

interface TallyIntegrationProps {
  onStatusChange?: (isConnected: boolean) => void;
  invoice?: any;
  customer?: any;
  items?: any[];
}

const TallyIntegration: React.FC<TallyIntegrationProps> = ({
  onStatusChange,
  invoice,
  customer,
  items
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [postSuccess, setPostSuccess] = useState(false);

  useEffect(() => {
    checkTallyConnection();
  }, []);

  const checkTallyConnection = async () => {
    try {
      setIsChecking(true);
      setError(null);
      const result = await tallyService.checkConnection();
      setIsConnected(result.connected);
      setCompanyName(result.companyName || '');
      onStatusChange?.(result.connected);
    } catch (err) {
      setError('Failed to connect to Tally');
      setIsConnected(false);
      setCompanyName('');
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  const postToTally = async () => {
    if (!invoice || !customer || !items) {
      setError('Invoice data is missing');
      return;
    }

    try {
      setIsPosting(true);
      setError(null);
      setPostSuccess(false);

      // Post sales voucher to Tally
      await tallyService.postSalesVoucher(invoice, customer, items);

      setPostSuccess(true);
      setError(null);
    } catch (err) {
      setError('Failed to post to Tally: ' + (err as Error).message);
      setPostSuccess(false);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Tally Integration</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
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

      {postSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          ✓ Successfully posted to Tally
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
          <span className="font-medium">
            {companyName || process.env.TALLY_COMPANY || 'Not configured'}
          </span>
        </div>

        <Button
          onClick={checkTallyConnection}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Checking Connection...' : 'Check Connection'}
        </Button>

        {isConnected && invoice && (
          <Button
            onClick={postToTally}
            disabled={isPosting || !invoice}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isPosting ? 'Posting to Tally...' : 'Post Invoice to Tally'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TallyIntegration;
