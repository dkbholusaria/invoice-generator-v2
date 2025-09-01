import React, { useState, useEffect } from 'react';
import { Rate, Item } from '../types/database';
import { getItems, createRate, getRates } from '../lib/database';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

const Rates: React.FC = () => {
  const [rates, setRates] = useState<(Rate & { item: Item })[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    rate: '',
    tax_percentage: '',
    effective_from: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadItems();
    loadRates();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadRates = async () => {
    try {
      const data = await getRates();
      setRates(data);
    } catch (error) {
      console.error('Error loading rates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.item_id) newErrors.item_id = 'Item is required';
    if (!formData.rate) newErrors.rate = 'Rate is required';
    if (!formData.tax_percentage) newErrors.tax_percentage = 'Tax percentage is required';
    if (!formData.effective_from) newErrors.effective_from = 'Effective from date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createRate({
        ...formData,
        rate: parseFloat(formData.rate),
        tax_percentage: parseFloat(formData.tax_percentage),
      });
      setIsModalOpen(false);
      setFormData({
        item_id: '',
        rate: '',
        tax_percentage: '',
        effective_from: new Date().toISOString().split('T')[0],
      });
      // Reload rates after creating a new one
      loadRates();
    } catch (error) {
      console.error('Error creating rate:', error);
    }
  };

  const columns = [
    {
      header: 'Item',
      accessor: (rate: Rate & { item: Item }) => rate.item?.name || 'Unknown Item',
    },
    {
      header: 'Rate',
      accessor: (rate: Rate) => `₹${rate.rate.toFixed(2)}`,
    },
    {
      header: 'Tax %',
      accessor: (rate: Rate) => `${rate.tax_percentage}%`,
    },
    {
      header: 'Effective From',
      accessor: (rate: Rate) => new Date(rate.effective_from).toLocaleDateString(),
    },
    {
      header: 'Status',
      accessor: (rate: Rate) =>
        rate.effective_to ? 'Inactive' : 'Active',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rates</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Rate</Button>
      </div>

      <Table
        columns={columns}
        data={rates}
        onRowClick={(rate) => console.log('Selected rate:', rate)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Rate"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Item</label>
            <select
              value={formData.item_id}
              onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {errors.item_id && (
              <span className="text-sm text-red-500">{errors.item_id}</span>
            )}
          </div>

          <Input
            label="Rate"
            type="number"
            step="0.01"
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            error={errors.rate}
          />

          <Input
            label="Tax Percentage"
            type="number"
            step="0.01"
            value={formData.tax_percentage}
            onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
            error={errors.tax_percentage}
          />

          <Input
            label="Effective From"
            type="date"
            value={formData.effective_from}
            onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
            error={errors.effective_from}
          />
        </form>
      </Modal>
    </div>
  );
};

export default Rates;
