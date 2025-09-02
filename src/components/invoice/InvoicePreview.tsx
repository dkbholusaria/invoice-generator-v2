import React from 'react';
import { Invoice, Customer, InvoiceItem } from '../../types/database';
import PaymentQRCode from './PaymentQRCode';

interface InvoicePreviewProps {
  invoice: Invoice;
  customer: Customer;
  items: InvoiceItem[];

}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  customer,
  items,
}) => {
  // Add debugging
  console.log('InvoicePreview props:', { invoice, customer, items });

  // Add null checks and early return if data is missing
  if (!invoice || !customer || !items) {
    console.log('Missing data in InvoicePreview:', { hasInvoice: !!invoice, hasCustomer: !!customer, hasItems: !!items });
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
        <div className="text-center text-gray-500">
          <p>Invoice data is loading...</p>
          <p className="text-sm mt-2">Please wait while we fetch the invoice details.</p>
          <div className="mt-4 p-4 bg-gray-100 rounded text-xs text-left">
            <p><strong>Debug Info:</strong></p>
            <p>Invoice: {invoice ? 'Present' : 'Missing'}</p>
            <p>Customer: {customer ? 'Present' : 'Missing'}</p>
            <p>Items: {items ? 'Present' : 'Missing'}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-IN');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">INVOICE</h1>
          <p className="text-gray-600">#{invoice.invoice_number || 'N/A'}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">Invoice Date: {formatDate(invoice.invoice_date)}</p>
          <p className="font-medium">Due Date: {formatDate(invoice.due_date)}</p>
        </div>
      </div>

      {/* Customer Details */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Bill To:</h2>
        <div className="text-gray-600">
          <p className="font-medium">{customer.name || 'N/A'}</p>
          <p>{customer.address || 'N/A'}</p>
          {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
          <p>Phone: {customer.phone || 'N/A'}</p>
          <p>Email: {customer.email || 'N/A'}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Rate</th>
              <th className="text-right py-2">Subtotal</th>
              <th className="text-right py-2">Tax</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2">{item.item?.name || item.item_id || 'N/A'}</td>
                  <td className="text-right py-2">{item.quantity || 0}</td>
                  <td className="text-right py-2">{formatCurrency(item.rate)}</td>
                  <td className="text-right py-2">{formatCurrency(item.subtotal)}</td>
                  <td className="text-right py-2">
                    {formatCurrency(item.tax_amount)}
                    <span className="text-gray-500 text-sm ml-1">
                      ({item.tax_percentage || 0}%)
                    </span>
                  </td>
                  <td className="text-right py-2">{formatCurrency(item.total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No items found for this invoice
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-medium">
              <td colSpan={3} className="py-2">Total</td>
              <td className="text-right py-2">{formatCurrency(invoice.subtotal)}</td>
              <td className="text-right py-2">{formatCurrency(invoice.tax_total)}</td>
              <td className="text-right py-2">{formatCurrency(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes and Terms */}
      {(invoice.notes || invoice.terms_and_conditions) && (
        <div className="mb-8 grid grid-cols-2 gap-8">
          {invoice.notes && (
            <div>
              <h3 className="font-medium mb-2">Notes:</h3>
              <p className="text-gray-600 text-sm">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms_and_conditions && (
            <div>
              <h3 className="font-medium mb-2">Terms and Conditions:</h3>
              <p className="text-gray-600 text-sm">{invoice.terms_and_conditions}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment QR Code */}
      <div className="mt-8 border-t pt-8">
        <h3 className="text-center font-medium mb-4">Payment Options</h3>
        <PaymentQRCode invoice={invoice} />
      </div>
    </div>
  );
};

export default InvoicePreview;
