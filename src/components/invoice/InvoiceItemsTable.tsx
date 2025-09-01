import React from 'react';
import { InvoiceItemData } from './InvoiceItemForm';
import Button from '../common/Button';

interface InvoiceItemsTableProps {
  items: (InvoiceItemData & { itemName: string })[];
  onRemove?: (index: number) => void;
  readOnly?: boolean;
}

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({ items, onRemove, readOnly = false }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No items added yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Item
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Qty
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Rate
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Subtotal
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Tax %
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Tax Amt
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Total
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.itemName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {item.quantity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(item.rate)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(item.subtotal)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {item.tax_percentage}%
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(item.tax_amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(item.total)}
              </td>
              {!readOnly && onRemove && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemove(index)}
                  >
                    Remove
                  </Button>
                </td>
              )}
            </tr>
          ))}
          <tr className="bg-gray-50">
            <td colSpan={3} className="px-6 py-4 text-sm font-medium text-gray-900">
              Totals
            </td>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
              {formatCurrency(items.reduce((sum, item) => sum + item.subtotal, 0))}
            </td>
            <td className="px-6 py-4" />
            <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
              {formatCurrency(items.reduce((sum, item) => sum + item.tax_amount, 0))}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
              {formatCurrency(items.reduce((sum, item) => sum + item.total, 0))}
            </td>
            <td className="px-6 py-4" />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceItemsTable;
