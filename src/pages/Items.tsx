import React, { useState, useEffect } from 'react';
import { Item } from '../types/database';
import { getItems, createItem } from '../lib/database';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

const Items: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hsn_code: '',
    unit: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createItem(formData);
      setIsModalOpen(false);
      setFormData({ name: '', description: '', hsn_code: '', unit: '' });
      loadItems();
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: 'description' },
    { header: 'HSN Code', accessor: 'hsn_code' },
    { header: 'Unit', accessor: 'unit' },
    {
      header: 'Created At',
      accessor: (item: Item) => new Date(item.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Items</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Item</Button>
      </div>

      <Table
        columns={columns}
        data={items}
        onRowClick={(item) => console.log('Selected item:', item)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Item"
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
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={errors.description}
          />
          <Input
            label="HSN Code"
            value={formData.hsn_code}
            onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
            placeholder="Optional"
          />
          <Input
            label="Unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            error={errors.unit}
            placeholder="e.g., PCS, KG, MTR"
          />
        </form>
      </Modal>
    </div>
  );
};

export default Items;
