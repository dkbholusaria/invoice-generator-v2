import React, { useEffect, useState } from 'react';
import { Payment } from '../../types/database';
import { getPaymentHistory, subscribeToPaymentUpdates } from '../../lib/database';
import { formatCurrency, formatDate } from '../../utils/format';

interface PaymentStatusProps {
  invoiceId: string;
  onPaymentUpdate?: (status: Payment['status']) => void;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({
  invoiceId,
  onPaymentUpdate,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPaymentHistory();
    const unsubscribe = subscribeToPaymentUpdates(invoiceId, handlePaymentUpdate);
    return () => unsubscribe();
  }, [invoiceId]);

  const loadPaymentHistory = async () => {
    try {
      setIsLoading(true);
      const history = await getPaymentHistory(invoiceId);
      setPayments(history);
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentUpdate = (payment: Payment) => {
    setPayments((current) => [payment, ...current]);
    onPaymentUpdate?.(payment.status);
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        No payment records found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Payment History</h3>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {formatCurrency(payment.amount)}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  payment.status
                )}`}
              >
                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              </span>
            </div>
            
            <div className="text-sm text-gray-500 space-y-1">
              <div>
                Date: {formatDate(payment.payment_date)}
              </div>
              <div>
                Method: {payment.payment_method}
              </div>
              {payment.transaction_id && (
                <div>
                  Transaction ID: {payment.transaction_id}
                </div>
              )}
              {payment.error_description && (
                <div className="text-red-600">
                  Error: {payment.error_description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentStatus;
