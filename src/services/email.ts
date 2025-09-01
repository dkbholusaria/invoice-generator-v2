import nodemailer from 'nodemailer';
import { getInvoice } from '../lib/database';
import { formatCurrency } from '../utils/format';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPaymentConfirmation = async (invoiceId: string) => {
  try {
    // Get invoice details with customer and items
    const invoice = await getInvoice(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const { customer, items } = invoice;

    // Create email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Confirmation</h2>
        <p>Dear ${customer.name},</p>
        
        <p>We have received your payment for Invoice #${invoice.invoice_number}.</p>
        
        <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
          <h3 style="margin-top: 0;">Payment Details</h3>
          <p><strong>Amount Paid:</strong> ${formatCurrency(invoice.total)}</p>
          <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3>Invoice Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Item</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Amount</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">Subtotal</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">
                ${formatCurrency(invoice.subtotal)}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">Tax</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">
                ${formatCurrency(invoice.tax_total)}
              </td>
            </tr>
            <tr style="font-weight: bold;">
              <td style="padding: 10px; border: 1px solid #dee2e6;">Total</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">
                ${formatCurrency(invoice.total)}
              </td>
            </tr>
          </table>
        </div>

        <p>Thank you for your business!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: customer.email,
      subject: `Payment Confirmation - Invoice #${invoice.invoice_number}`,
      html: emailContent,
    });

    console.log(`Payment confirmation email sent for invoice ${invoiceId}`);
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    throw error;
  }
};
