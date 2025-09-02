import React, { useEffect, useState } from 'react';
import { generateQRCode } from '../../services/qrcode';
import { Invoice } from '../../types/database';

interface PaymentQRCodeProps {
  invoice: Invoice;
}

const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({ invoice }) => {
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add null check for invoice
  if (!invoice) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500 text-sm">Invoice data not available</p>
      </div>
    );
  }

  // Bank details with safe access to invoice.total
  const bankDetails = {
    bankName: "HDFC Bank",
    accountName: "Your Company Name",
    accountNumber: "XXXXXXXXXXXX",
    ifscCode: "HDFC0000XXX",
    branchName: "Your Branch Name",
    amount: invoice.total || 0
  };

  useEffect(() => {
    if (invoice.id) {
      generateBankQRCode();
    }
  }, [invoice.id]);

  const generateBankQRCode = async () => {
    try {
      // Create UPI string with bank details
      const upiString = `upi://pay?pa=${bankDetails.accountNumber}@hdfcbank&pn=${bankDetails.accountName}&am=${bankDetails.amount}&cu=INR`;
      const qrDataUrl = await generateQRCode(upiString);
      setQRCode(qrDataUrl);
    } catch (err) {
      setError('Failed to generate QR code. Please try again.');
      console.error('Error generating QR code:', err);
    }
  };

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4">
      {qrCode && (
        <div className="mb-4">
          <img src={qrCode} alt="Bank Payment QR Code" className="w-48 h-48" />
        </div>
      )}
      <div className="text-center space-y-2">
        <h3 className="font-medium text-gray-900">Bank Transfer Details</h3>
        <div className="text-sm text-gray-600">
          <p>Bank: {bankDetails.bankName}</p>
          <p>Account Name: {bankDetails.accountName}</p>
          <p>Account Number: {bankDetails.accountNumber}</p>
          <p>IFSC Code: {bankDetails.ifscCode}</p>
          <p>Branch: {bankDetails.branchName}</p>
          <p className="font-medium mt-2">Amount: ₹{(bankDetails.amount || 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentQRCode;
