import React, { useState, useEffect } from 'react';
import { Item, Rate } from '../../types/database';
import { getItems, getCurrentRate } from '../../lib/database';
import Input from '../common/Input';
import Button from '../common/Button';

interface InvoiceItemFormProps {
  onAdd: (item: InvoiceItemData) => void;
}

export interface InvoiceItemData {
  item_id: string;
  rate_id: string;
  quantity: number;
  rate: number;
  tax_percentage: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  itemName: string;
}

const InvoiceItemForm: React.FC<InvoiceItemFormProps> = ({ onAdd }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [currentRate, setCurrentRate] = useState<Rate | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      loadCurrentRate(selectedItemId);
    } else {
      setCurrentRate(null);
    }
  }, [selectedItemId]);

  const loadItems = async () => {
    try {
      const data = await getItems();
      setItems(data);
      // Pre-select first item if available
      if (data.length > 0) {
        setSelectedItemId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadCurrentRate = async (itemId: string) => {
    try {
      const rate = await getCurrentRate(itemId);
      setCurrentRate(rate);
    } catch (error) {
      console.error('Error loading current rate:', error);
    }
  };

  const calculateTotals = (qty: number, rate: Rate) => {
    const subtotal = qty * rate.rate;
    const taxAmount = (subtotal * rate.tax_percentage) / 100;
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!selectedItemId) newErrors.item = 'Please select an item';
    if (!quantity || parseFloat(quantity) <= 0) newErrors.quantity = 'Please enter a valid quantity';
    if (!currentRate) newErrors.rate = 'No rate available for this item';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const qty = parseFloat(quantity);
    if (currentRate) {
      const { subtotal, taxAmount, total } = calculateTotals(qty, currentRate);
      const selectedItem = items.find(item => item.id === selectedItemId);

      if (!selectedItem) {
        setErrors({ item: 'Selected item not found' });
        return;
      }

      onAdd({
        item_id: selectedItemId,
        rate_id: currentRate.id,
        quantity: qty,
        rate: currentRate.rate,
        tax_percentage: currentRate.tax_percentage,
        subtotal,
        tax_amount: taxAmount,
        total,
        itemName: selectedItem.name // Pass the item name from the selected item
      });

      // Reset form
      setSelectedItemId('');
      setQuantity('');
      setCurrentRate(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Item</label>
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className={`
            rounded-md border px-3 py-2
            ${errors.item ? 'border-red-500' : 'border-gray-300'}
          `}
        >
          <option value="">Select an item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.hsn_code || 'No HSN'}
            </option>
          ))}
        </select>
        {errors.item && <span className="text-sm text-red-500">{errors.item}</span>}
      </div>

      <Input
        label="Quantity"
        type="number"
        step="0.01"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={errors.quantity}
      />

      {currentRate && (
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm">
            <span className="font-medium">Rate:</span> ₹{currentRate.rate}
          </div>
          <div className="text-sm">
            <span className="font-medium">Tax:</span> {currentRate.tax_percentage}%
          </div>
          {quantity && (
            <>
              <div className="text-sm">
                <span className="font-medium">Subtotal:</span> ₹
                {(parseFloat(quantity) * currentRate.rate).toFixed(2)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Total:</span> ₹
                {(
                  parseFloat(quantity) * currentRate.rate *
                  (1 + currentRate.tax_percentage / 100)
                ).toFixed(2)}
              </div>
            </>
          )}
        </div>
      )}

      <Button type="button" onClick={handleSubmit} className="mt-2">
        Add Item
      </Button>
    </div>
  );
};

export default InvoiceItemForm;
