import axios from 'axios';
import { zohoAuthService } from './zohoAuth';
import { Invoice, Customer, InvoiceItem } from '../types/database';
import { RateLimiter } from '../utils/rateLimiter';

interface ZohoCustomer {
  contact_id?: string;
  contact_name: string;
  email: string;
  phone: string;
  billing_address: {
    address: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  gst_treatment?: string;
  gst_no?: string;
}

interface ZohoInvoice {
  invoice_id?: string;
  customer_id: string;
  date: string;
  due_date: string;
  line_items: Array<{
    item_id?: string;
    name: string;
    description?: string;
    rate: number;
    quantity: number;
    tax_percentage?: number;
  }>;
  payment_terms?: string;
  notes?: string;
  terms?: string;
}

class ZohoBooksService {
  private static instance: ZohoBooksService;
  private baseUrl: string;
  private organizationId: string;
  private rateLimiter: RateLimiter;

  private constructor() {
    this.baseUrl = 'https://books.zoho.com/api/v3';
    this.organizationId = process.env.ZOHO_ORGANIZATION_ID || '';
    this.rateLimiter = new RateLimiter({
      maxRequests: 150, // Zoho's rate limit per minute
      timeWindow: 60000, // 1 minute
    });
  }

  static getInstance(): ZohoBooksService {
    if (!ZohoBooksService.instance) {
      ZohoBooksService.instance = new ZohoBooksService();
    }
    return ZohoBooksService.instance;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    await this.rateLimiter.acquire();

    try {
      const accessToken = await zohoAuthService.getAccessToken();
      const response = await axios({
        method,
        url: `${this.baseUrl}/${endpoint}`,
        data,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          organization_id: this.organizationId,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        // Rate limit exceeded - retry after delay
        await new Promise(resolve => setTimeout(resolve, 60000));
        return this.makeRequest(method, endpoint, data);
      }
      throw error;
    }
  }

  async createCustomer(customer: Customer): Promise<string> {
    const zohoCustomer: ZohoCustomer = {
      contact_name: customer.name,
      email: customer.email,
      phone: customer.phone,
      billing_address: {
        address: customer.address,
      },
      gst_treatment: customer.gstin ? 'registered_business' : 'unregistered_business',
      gst_no: customer.gstin,
    };

    const response = await this.makeRequest<{ contact: { contact_id: string } }>(
      'POST',
      'contacts',
      zohoCustomer
    );

    return response.contact.contact_id;
  }

  async createInvoice(
    invoice: Invoice,
    customer: Customer,
    items: InvoiceItem[]
  ): Promise<string> {
    // First, ensure customer exists in Zoho Books
    let customerId = customer.zoho_contact_id;
    if (!customerId) {
      customerId = await this.createCustomer(customer);
      // TODO: Update customer in local database with Zoho contact ID
    }

    const zohoInvoice: ZohoInvoice = {
      customer_id: customerId,
      date: invoice.invoice_date,
      due_date: invoice.due_date,
      line_items: items.map(item => ({
        name: item.item_id, // You might want to fetch actual item name
        rate: item.rate,
        quantity: item.quantity,
        tax_percentage: item.tax_percentage,
      })),
      notes: invoice.notes,
      terms: invoice.terms_and_conditions,
    };

    const response = await this.makeRequest<{ invoice: { invoice_id: string } }>(
      'POST',
      'invoices',
      zohoInvoice
    );

    return response.invoice.invoice_id;
  }

  async recordPayment(
    invoiceId: string,
    amount: number,
    paymentDate: string,
    paymentReference: string
  ): Promise<void> {
    const payment = {
      payment_mode: 'online',
      amount,
      date: paymentDate,
      reference_number: paymentReference,
      invoices: [{
        invoice_id: invoiceId,
        amount_applied: amount,
      }],
    };

    await this.makeRequest(
      'POST',
      'customerpayments',
      payment
    );
  }

  async getInvoiceStatus(invoiceId: string): Promise<string> {
    const response = await this.makeRequest<{ invoice: { status: string } }>(
      'GET',
      `invoices/${invoiceId}`
    );

    return response.invoice.status;
  }
}

export const zohoBooksService = ZohoBooksService.getInstance();
