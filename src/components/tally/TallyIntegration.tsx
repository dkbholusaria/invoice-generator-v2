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
      console.log('Starting Tally connection check...');
      
      const result = await tallyService.checkConnection();
      console.log('Tally connection result:', result);
      console.log('Result details:', {
        connected: result.connected,
        companyName: result.companyName,
        hasCompanyName: !!result.companyName,
        companyNameLength: result.companyName?.length || 0
      });
      
      setIsConnected(result.connected);
      setCompanyName(result.companyName || '');
      onStatusChange?.(result.connected);
      
      if (result.connected) {
        console.log('Tally connected successfully. Company name:', result.companyName);
        if (result.companyName) {
          console.log('Company name set successfully:', result.companyName);
        } else {
          console.log('No company name received from Tally service');
        }
      } else {
        console.log('Tally connection failed');
      }
    } catch (err) {
      console.error('Tally connection error:', err);
      setError('Failed to connect to Tally: ' + (err as Error).message);
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

    if (!companyName) {
      setError('Company name is required. Please set your company name first.');
      return;
    }

    try {
      setIsPosting(true);
      setError(null);
      setPostSuccess(false);

      console.log('=== POSTING TO TALLY DEBUG ===');
      console.log('Company name state:', companyName);
      console.log('Company name type:', typeof companyName);
      console.log('Company name length:', companyName.length);
      console.log('Company name trimmed:', companyName.trim());
      console.log('Posting to Tally with data:', {
        invoice: invoice.invoice_number,
        customer: customer.name,
        companyName: companyName,
        itemsCount: items.length,
        items: items.map(item => ({
          name: (item as any).item?.name || item.item_id,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total
        }))
      });

      // Post sales voucher to Tally
      await tallyService.postSalesVoucher(invoice, customer, items, companyName);

      setPostSuccess(true);
      setError(null);
      console.log('=== TALLY POSTING SUCCESS ===');
    } catch (err) {
      console.error('Error posting to Tally:', err);
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
            localhost:9000
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Company:</span>
          <span className="font-medium">
            {companyName ? companyName : (isConnected ? 'Connected (No company name)' : 'Not configured')}
          </span>
        </div>



        {isConnected && companyName && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✓ Connected to <strong>{companyName}</strong>
            </p>
            <p className="text-xs text-green-600 mt-1">
              Ready to post invoices to Tally
            </p>
          </div>
        )}

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
