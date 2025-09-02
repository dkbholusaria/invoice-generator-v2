import { supabase } from './supabase';
import { realtimeSyncService } from '../services/realtimeSync';
import type { Customer, Item, Rate, Invoice, InvoiceItem, Payment } from '../types/database';

// Read operations
export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
};

export const getItems = async () => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
};

export const getRates = async () => {
  const { data, error } = await supabase
    .from('rates')
    .select(`
      *,
      item:items(*)
    `)
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return data;
};

export const getCurrentRate = async (itemId: string) => {
  const { data, error } = await supabase
    .from('rates')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
};

// Update existing database functions to use real-time sync

export const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase.from('customers').insert(customer).select().single();
  if (error) throw error;
  await realtimeSyncService.syncData('customers', 'INSERT', data);
  return data;
};

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await realtimeSyncService.syncData('customers', 'UPDATE', data);
  return data;
};

export const createItem = async (item: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase.from('items').insert(item).select().single();
  if (error) throw error;
  await realtimeSyncService.syncData('items', 'INSERT', data);
  return data;
};

export const updateItem = async (id: string, item: Partial<Item>) => {
  const { data, error } = await supabase
    .from('items')
    .update(item)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await realtimeSyncService.syncData('items', 'UPDATE', data);
  return data;
};

export const createRate = async (rate: Omit<Rate, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase.from('rates').insert(rate).select().single();
  if (error) throw error;
  await realtimeSyncService.syncData('rates', 'INSERT', data);
  return data;
};

export const updateRate = async (id: string, rate: Partial<Rate>) => {
  const { data, error } = await supabase
    .from('rates')
    .update(rate)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await realtimeSyncService.syncData('rates', 'UPDATE', data);
  return data;
};

export const generateInvoiceNumber = async () => {
  // Get the current year and month
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  // Get the latest invoice number for the current month
  const { data: latestInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .ilike('invoice_number', `INV-${year}${month}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single();

  let sequence = '0001';
  if (latestInvoice) {
    // Extract the sequence number from the latest invoice
    const lastSequence = parseInt(latestInvoice.invoice_number.split('-')[2]);
    sequence = String(lastSequence + 1).padStart(4, '0');
  }

  return `INV-${year}${month}-${sequence}`;
};

export const getInvoices = async () => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name),
      invoice_items:invoice_items(
        *,
        item:items(name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getInvoice = async (id: string) => {
  console.log('getInvoice called with ID:', id);
  
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        invoice_items:invoice_items(
          id,
          invoice_id,
          item_id,
          quantity,
          rate,
          tax_percentage,
          subtotal,
          tax_amount,
          total,
          item:items(name, description, hsn_code, unit)
        )
      `)
      .eq('id', id)
      .single();

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Invoice data structure:', {
      hasInvoice: !!data,
      hasCustomer: !!data?.customer,
      hasItems: !!data?.invoice_items,
      customerKeys: data?.customer ? Object.keys(data.customer) : 'No customer',
      itemsCount: data?.invoice_items?.length || 0
    });

    return data;
  } catch (err) {
    console.error('Error in getInvoice:', err);
    throw err;
  }
};

export const createInvoice = async (
  invoice: Omit<Invoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>[]
) => {
  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert({ ...invoice, invoice_number: invoiceNumber })
    .select()
    .single();
  
  if (invoiceError) throw invoiceError;

  const invoiceItems = items.map(item => ({
    ...item,
    invoice_id: invoiceData.id
  }));

  const { data: itemsData, error: itemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItems)
    .select();

  if (itemsError) throw itemsError;

  await realtimeSyncService.syncData('invoices', 'INSERT', {
    ...invoiceData,
    items: itemsData
  });

  return invoiceData;
};

export const updateInvoiceStatus = async (
  id: string,
  status: Invoice['status']
) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  await realtimeSyncService.syncData('invoices', 'UPDATE', data);
  return data;
};

export const createPayment = async (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();

  if (error) throw error;
  await realtimeSyncService.syncData('payments', 'INSERT', data);
  return data;
};

// Add real-time subscription helpers
export const subscribeToInvoiceUpdates = (callback: (invoice: Invoice) => void) => {
  return realtimeSyncService.subscribe({
    table: 'invoices',
    onChange: callback
  });
};

export const subscribeToPaymentUpdates = (callback: (payment: Payment) => void) => {
  return realtimeSyncService.subscribe({
    table: 'payments',
    onChange: callback
  });
};