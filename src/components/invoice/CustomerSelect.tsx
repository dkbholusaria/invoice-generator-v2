import React, { useState, useEffect } from 'react';
import { Customer } from '../../types/database';
import { getCustomers } from '../../lib/database';

interface CustomerSelectProps {
  value: string;
  onChange: (customerId: string, customer: Customer | null) => void;
  error?: string;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({ value, onChange, error }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customer = customers.find(c => c.id === customerId) || null;
    onChange(customerId, customer);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        Customer
      </label>
      <select
        value={value}
        onChange={handleChange}
        className={`
          rounded-md border px-3 py-2
          ${error ? 'border-red-500' : 'border-gray-300'}
          disabled:bg-gray-100
        `}
        disabled={isLoading}
      >
        <option value="">Select a customer</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name} - {customer.gstin || 'No GSTIN'}
          </option>
        ))}
      </select>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
};

export default CustomerSelect;
