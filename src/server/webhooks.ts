import express from 'express';
import crypto from 'crypto';
import { updateInvoiceStatus, updatePaymentStatus } from '../lib/database';
import { getPaymentStatus } from '../services/razorpay';
import { sendPaymentConfirmation } from '../services/email';

const router = express.Router();

// Verify Razorpay webhook signature
const verifyWebhookSignature = (
  body: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};

router.post('/razorpay', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    if (!signature || !verifyWebhookSignature(
      JSON.stringify(req.body),
      signature as string,
      webhookSecret
    )) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { payload } = req.body;
    const { payment } = payload;

    // Handle different payment events
    switch (req.body.event) {
      case 'payment.authorized':
        // Payment is authorized but not captured yet
        await handlePaymentAuthorized(payment);
        break;

      case 'payment.captured':
        // Payment is successfully captured
        await handlePaymentCaptured(payment);
        break;

      case 'payment.failed':
        // Payment failed
        await handlePaymentFailed(payment);
        break;
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handlePaymentAuthorized(payment: any) {
  const { notes, amount } = payment;
  const invoiceId = notes.invoice_id;

  try {
    // Update invoice status to processing
    await updateInvoiceStatus(invoiceId, 'processing');

    // Update payment status
    await updatePaymentStatus(invoiceId, {
      status: 'authorized',
      amount: amount / 100, // Convert from paise to rupees
      payment_id: payment.id,
      payment_method: payment.method,
    });
  } catch (error) {
    console.error('Error handling authorized payment:', error);
    throw error;
  }
}

async function handlePaymentCaptured(payment: any) {
  const { notes, amount } = payment;
  const invoiceId = notes.invoice_id;

  try {
    // Get full payment details
    const paymentDetails = await getPaymentStatus(payment.id);

    // Update invoice status to paid
    await updateInvoiceStatus(invoiceId, 'paid');

    // Update payment status
    await updatePaymentStatus(invoiceId, {
      status: 'success',
      amount: amount / 100,
      payment_id: payment.id,
      payment_method: payment.method,
      transaction_id: paymentDetails.acquirer_data?.transaction_id,
    });

    // Send payment confirmation email
    await sendPaymentConfirmation(invoiceId);
  } catch (error) {
    console.error('Error handling captured payment:', error);
    throw error;
  }
}

async function handlePaymentFailed(payment: any) {
  const { notes, amount, error_code, error_description } = payment;
  const invoiceId = notes.invoice_id;

  try {
    // Update invoice status to payment_failed
    await updateInvoiceStatus(invoiceId, 'payment_failed');

    // Update payment status
    await updatePaymentStatus(invoiceId, {
      status: 'failed',
      amount: amount / 100,
      payment_id: payment.id,
      error_code,
      error_description,
    });
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

export default router;
