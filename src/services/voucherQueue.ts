import { Invoice, Customer, InvoiceItem } from '../types/database';
import { tallyService } from './tally';

interface VoucherTask {
  id: string;
  type: 'sales' | 'receipt';
  data: {
    invoice: Invoice;
    customer: Customer;
    items?: InvoiceItem[];
    paymentDate?: string;
    paymentMode?: string;
  };
  retries: number;
  lastError?: string;
}

class VoucherQueue {
  private static instance: VoucherQueue;
  private queue: VoucherTask[] = [];
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5 seconds

  private constructor() {
    // Start processing the queue
    this.processQueue();
  }

  static getInstance(): VoucherQueue {
    if (!VoucherQueue.instance) {
      VoucherQueue.instance = new VoucherQueue();
    }
    return VoucherQueue.instance;
  }

  addSalesVoucher(invoice: Invoice, customer: Customer, items: InvoiceItem[]) {
    this.queue.push({
      id: `sales_${invoice.id}`,
      type: 'sales',
      data: { invoice, customer, items },
      retries: 0,
    });
  }

  addReceiptVoucher(
    invoice: Invoice,
    customer: Customer,
    paymentDate: string,
    paymentMode: string
  ) {
    this.queue.push({
      id: `receipt_${invoice.id}`,
      type: 'receipt',
      data: { invoice, customer, paymentDate, paymentMode },
      retries: 0,
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      // Check again after a delay
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    this.isProcessing = true;
    const task = this.queue[0];

    try {
      if (task.type === 'sales') {
        await tallyService.postSalesVoucher(
          task.data.invoice,
          task.data.customer,
          task.data.items!
        );
      } else {
        await tallyService.postReceiptVoucher(
          task.data.invoice,
          task.data.customer,
          task.data.paymentDate!,
          task.data.paymentMode!
        );
      }

      // Success - remove from queue
      this.queue.shift();
    } catch (error) {
      console.error(`Error processing voucher task ${task.id}:`, error);
      task.lastError = (error as Error).message;

      if (task.retries < this.maxRetries) {
        // Move to end of queue for retry
        this.queue.shift();
        task.retries++;
        setTimeout(() => {
          this.queue.push(task);
        }, this.retryDelay);
      } else {
        // Max retries reached - remove from queue
        this.queue.shift();
        // TODO: Implement error reporting/logging
        console.error(`Max retries reached for voucher task ${task.id}`);
      }
    } finally {
      this.isProcessing = false;
      // Continue processing queue
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  getQueueStatus() {
    return {
      pending: this.queue.length,
      processing: this.isProcessing,
      tasks: this.queue.map(task => ({
        id: task.id,
        type: task.type,
        retries: task.retries,
        lastError: task.lastError,
      })),
    };
  }
}

export const voucherQueue = VoucherQueue.getInstance();
