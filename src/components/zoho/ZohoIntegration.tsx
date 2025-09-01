import React, { useState, useEffect } from 'react';
import { zohoAuthService } from '../../services/zohoAuth';
import Button from '../common/Button';

interface ZohoIntegrationProps {
  onStatusChange?: (isConnected: boolean) => void;
}

const ZohoIntegration: React.FC<ZohoIntegrationProps> = ({ onStatusChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const status = zohoAuthService.isAuthenticated();
    setIsAuthenticated(status);
    onStatusChange?.(status);
  };

  const handleAuthenticate = async () => {
    try {
      setIsAuthenticating(true);
      setError(null);

      // Open Zoho OAuth page in default browser
      const authUrl = zohoAuthService.getAuthorizationUrl();
      window.open(authUrl, '_blank');

      // TODO: Handle OAuth callback in main electron process
      // For now, we'll simulate a successful authentication
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      checkAuthStatus();
    } catch (err) {
      setError('Failed to authenticate with Zoho Books');
      console.error('Zoho authentication error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Zoho Books Integration</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              isAuthenticated ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isAuthenticated ? 'Connected' : 'Disconnected'}
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
          <span>Organization:</span>
          <span>{process.env.ZOHO_ORGANIZATION_ID || 'Not configured'}</span>
        </div>

        {!isAuthenticated && (
          <Button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="w-full"
          >
            {isAuthenticating ? 'Authenticating...' : 'Connect to Zoho Books'}
          </Button>
        )}

        {isAuthenticated && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Integration Status</h3>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Invoice Synchronization
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Payment Synchronization
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Customer Synchronization
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZohoIntegration;
