export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  state?: string;
  gstin?: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  hsn_code?: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface Rate {
  id: string;
  item_id: string;
  rate: number;
  tax_percentage: number;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: { name: string };
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  payment_link?: string;
  qr_code?: string;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id: string;
  rate_id: string;
  quantity: number;
  rate: number;
  tax_percentage: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
  updated_at: string;
  item?: {
    name: string;
    description: string;
    hsn_code?: string;
    unit: string;
  };
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'upi' | 'card' | 'netbanking' | 'other';
  razorpay_payment_id?: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
  updated_at: string;
}
