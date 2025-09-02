import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getInvoice, updateInvoiceStatus } from '../lib/database';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Button from '../components/common/Button';
import InvoiceItemsTable from '../components/invoice/InvoiceItemsTable';
import InvoicePreview from '../components/invoice/InvoicePreview';
import TallyIntegration from '../components/tally/TallyIntegration';
import { supabase } from '../lib/supabase';

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
    const [dbStatus, setDbStatus] = useState<any>(null);

    // Add test function to check database
    const testDatabase = async () => {
        try {
            console.log('Testing database connection...');
            
            // Test 1: Check if we can connect to invoices table
            const { data: invoices, error: invoicesError } = await supabase
                .from('invoices')
                .select('id, invoice_number, customer_id')
                .limit(5);
            
            if (invoicesError) {
                console.error('Invoices table error:', invoicesError);
            } else {
                console.log('Available invoices:', invoices);
            }

            // Test 2: Check if we can connect to customers table
            const { data: customers, error: customersError } = await supabase
                .from('customers')
                .select('id, name')
                .limit(3);
            
            if (customersError) {
                console.error('Customers table error:', customersError);
            } else {
                console.log('Available customers:', customers);
            }

            // Test 3: Check if we can connect to invoice_items table
            const { data: items, error: itemsError } = await supabase
                .from('invoice_items')
                .select('id, invoice_id')
                .limit(3);
            
            if (itemsError) {
                console.error('Invoice items table error:', itemsError);
            } else {
                console.log('Available invoice items:', items);
            }

            // Store status for display
            setDbStatus({
                invoices: { data: invoices, error: invoicesError },
                customers: { data: customers, error: customersError },
                items: { data: items, error: itemsError }
            });

        } catch (err) {
            console.error('Database test failed:', err);
            setDbStatus({ error: err });
        }
    };

    useEffect(() => {
        loadInvoice();
        testDatabase(); // Test database connection
    }, [id]);

    const loadInvoice = async () => {
        try {
            console.log('Loading invoice with ID:', id);
            const data = await getInvoice(id!);
            console.log('Invoice data loaded successfully:', data);
            console.log('Customer data:', data.customer);
            console.log('Invoice items:', data.invoice_items);
            console.log('Data types:', {
                invoiceType: typeof data,
                customerType: typeof data.customer,
                itemsType: typeof data.invoice_items,
                itemsIsArray: Array.isArray(data.invoice_items)
            });
            
            if (!data.customer) {
                console.error('Customer data is missing from invoice response');
            }
            if (!data.invoice_items) {
                console.error('Invoice items are missing from invoice response');
            }
            
            setInvoice(data);
            setError(null);
        } catch (err) {
            console.error('Error loading invoice:', err);
            setError(`Failed to load invoice: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">Loading invoice...</div>
                {dbStatus && (
                    <div className="mt-4 p-4 bg-gray-100 rounded">
                        <h3 className="font-medium mb-2">Database Status:</h3>
                        <pre className="text-xs overflow-auto">
                            {JSON.stringify(dbStatus, null, 2)}
                        </pre>
                    </div>
                )}
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
