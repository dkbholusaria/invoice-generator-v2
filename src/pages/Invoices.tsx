import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer, Invoice } from '../types/database';
import { createInvoice, generateInvoiceNumber, getInvoices, updateInvoiceStatus } from '../lib/database';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import CustomerSelect from '../components/invoice/CustomerSelect';
import InvoiceItemForm, { InvoiceItemData } from '../components/invoice/InvoiceItemForm';
import InvoiceItemsTable from '../components/invoice/InvoiceItemsTable';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<(InvoiceItemData & { itemName: string })[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    if (showForm) {
      loadNextInvoiceNumber();
    }
  }, [showForm]);

  const loadInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadNextInvoiceNumber = async () => {
    try {
      const nextNumber = await generateInvoiceNumber();
      setInvoiceNumber(nextNumber);
    } catch (error) {
      console.error('Error generating invoice number:', error);
    }
  };

  const handleCustomerSelect = (customerId: string, customer: Customer | null) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomer(customer);
  };

  const handleAddItem = (item: InvoiceItemData & { itemName: string }) => {
    setInvoiceItems([
      ...invoiceItems,
      item
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };



  const calculateTotals = () => {
    return invoiceItems.reduce(
      (totals, item) => ({
        subtotal: totals.subtotal + item.subtotal,
        taxTotal: totals.taxTotal + item.tax_amount,
        total: totals.total + item.total,
      }),
      { subtotal: 0, taxTotal: 0, total: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!selectedCustomerId) newErrors.customer = 'Please select a customer';
    if (!invoiceDate) newErrors.invoiceDate = 'Please select invoice date';
    if (!dueDate) newErrors.dueDate = 'Please select due date';
    if (invoiceItems.length === 0) newErrors.items = 'Please add at least one item';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const totals = calculateTotals();

      const invoiceData = {
        customer_id: selectedCustomerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total: totals.total,
        notes,
        terms_and_conditions: termsAndConditions,
        status: 'draft' as const,
      };

      // Remove itemName from invoice items before sending to database
      const cleanedItems = invoiceItems.map(({ itemName, ...item }) => item);
      const invoice = await createInvoice(invoiceData, cleanedItems);

      // Reset form
      setSelectedCustomerId('');
      setSelectedCustomer(null);
      setInvoiceItems([]);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setNotes('');
      setTermsAndConditions('');

      // Refresh the invoice list and hide the form
      await loadInvoices();
      setShowForm(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
      setErrors({
        submit: 'Failed to create invoice. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoices</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            Create New Invoice
          </Button>
        )}
      </div>
      {!showForm ? (
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.customer?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{invoice.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Customer Details</h2>
            <CustomerSelect
              value={selectedCustomerId}
              onChange={handleCustomerSelect}
              error={errors.customer}
            />

            {selectedCustomer && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Address:</span> {selectedCustomer.address}
                </div>
                <div>
                  <span className="font-medium">GSTIN:</span> {selectedCustomer.gstin || 'N/A'}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Invoice Details</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                  {invoiceNumber || 'Generating...'}
                </div>
              </div>
              <Input
                label="Invoice Date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                error={errors.invoiceDate}
              />
              <Input
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                error={errors.dueDate}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Items</h2>
            <InvoiceItemForm onAdd={handleAddItem} />
            {errors.items && <span className="text-sm text-red-500">{errors.items}</span>}
            <div className="mt-4">
              <InvoiceItemsTable
                items={invoiceItems}
                onRemove={handleRemoveItem}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Additional Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Terms and Conditions
                </label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errors.submit}
            </div>
          )}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Invoices;
