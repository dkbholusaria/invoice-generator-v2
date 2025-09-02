import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getInvoice, updateInvoiceStatus } from '../lib/database';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Button from '../components/common/Button';
import InvoiceItemsTable from '../components/invoice/InvoiceItemsTable';
import InvoicePreview from '../components/invoice/InvoicePreview';
import TallyIntegration from '../components/tally/TallyIntegration';

const InvoiceDetail: React.FC = () => {
    const invoiceRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;

        try {
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                logging: false,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Invoice-${invoice.invoice_number}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };
    const { id } = useParams<{ id: string }>();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tallyConnected, setTallyConnected] = useState(false);

    useEffect(() => {
        loadInvoice();
    }, [id]);

    const loadInvoice = async () => {
        try {
            const data = await getInvoice(id!);
            setInvoice(data);
            setError(null);
        } catch (err) {
            setError('Failed to load invoice');
            console.error('Error loading invoice:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">Loading invoice...</div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="p-6">
                <div className="text-red-500">{error || 'Invoice not found'}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
                <div className="flex gap-4">
                    <Button onClick={handleDownloadPDF}>
                        Download PDF
                    </Button>
                    <select
                        value={invoice.status}
                        onChange={async (e) => {
                            try {
                                await updateInvoiceStatus(invoice.id, e.target.value as any);
                                await loadInvoice();
                            } catch (error) {
                                console.error('Error updating invoice status:', error);
                            }
                        }}
                        className={`rounded-full px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500
                            ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                    invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                        'bg-red-100 text-red-800'}`}
                    >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                    <div ref={invoiceRef}>
                        <InvoicePreview
                            invoice={invoice}
                            customer={invoice.customer}
                            items={invoice.invoice_items}
                        />
                    </div>
                </div>
                <div className="space-y-6">
                    <TallyIntegration
                        onStatusChange={setTallyConnected}
                        invoice={invoice}
                        customer={invoice.customer}
                        items={invoice.invoice_items}
                    />
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetail;
