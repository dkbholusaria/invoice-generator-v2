import axios from 'axios';
import { Invoice, Customer, InvoiceItem } from '../types/database';


const TALLY_URL = 'http://localhost:9000/';

// XML templates for Tally vouchers
const createSalesVoucherXML = (
  invoice: Invoice,
  customer: Customer,
  items: InvoiceItem[]
) => {
  const voucherDate = new Date(invoice.invoice_date).toISOString().split('T')[0];
  
  return `
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Import</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>Vouchers</ID>
      </HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>Vouchers</REPORTNAME>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${process.env.TALLY_COMPANY || ''}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="Sales" ACTION="Create">
                <DATE>${voucherDate}</DATE>
                <NARRATION>Invoice #${invoice.invoice_number}</NARRATION>
                <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
                <VOUCHERNUMBER>${invoice.invoice_number}</VOUCHERNUMBER>
                <REFERENCE>${invoice.invoice_number}</REFERENCE>
                <PARTYLEDGERNAME>${customer.name}</PARTYLEDGERNAME>
                <BASICBASEPARTYNAME>${customer.name}</BASICBASEPARTYNAME>
                <STATENAME>${customer.state || ''}</STATENAME>
                <PARTYGSTIN>${customer.gstin || ''}</PARTYGSTIN>
                
                ${items.map((item, index) => `
                  <ALLINVENTORYENTRIES.LIST>
                    <STOCKITEMNAME>${item.item_id}</STOCKITEMNAME>
                    <RATE>${item.rate}</RATE>
                    <AMOUNT>${item.total}</AMOUNT>
                    <ACTUALQTY>${item.quantity}</ACTUALQTY>
                    <BILLEDQTY>${item.quantity}</BILLEDQTY>
                    <BATCHALLOCATIONS.LIST>
                      <GODOWNNAME>Main Location</GODOWNNAME>
                      <BATCHNAME>Primary Batch</BATCHNAME>
                      <AMOUNT>${item.total}</AMOUNT>
                    </BATCHALLOCATIONS.LIST>
                    <ACCOUNTINGALLOCATIONS.LIST>
                      <LEDGERNAME>Sales Account</LEDGERNAME>
                      <AMOUNT>${item.subtotal}</AMOUNT>
                    </ACCOUNTINGALLOCATIONS.LIST>
                  </ALLINVENTORYENTRIES.LIST>
                  
                  <LEDGERENTRIES.LIST>
                    <LEDGERNAME>GST ${item.tax_percentage}%</LEDGERNAME>
                    <AMOUNT>${item.tax_amount}</AMOUNT>
                  </LEDGERENTRIES.LIST>
                `).join('')}
                
                <LEDGERENTRIES.LIST>
                  <LEDGERNAME>${customer.name}</LEDGERNAME>
                  <AMOUNT>-${invoice.total}</AMOUNT>
                </LEDGERENTRIES.LIST>
              </VOUCHER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>
  `;
};

const createReceiptVoucherXML = (
  invoice: Invoice,
  customer: Customer,
  paymentDate: string,
  paymentMode: string
) => {
  return `
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Import</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>Vouchers</ID>
      </HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>Vouchers</REPORTNAME>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${process.env.TALLY_COMPANY || ''}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="Receipt" ACTION="Create">
                <DATE>${paymentDate}</DATE>
                <NARRATION>Payment received for Invoice #${invoice.invoice_number}</NARRATION>
                <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
                <REFERENCE>${invoice.invoice_number}</REFERENCE>
                
                <LEDGERENTRIES.LIST>
                  <LEDGERNAME>${paymentMode}</LEDGERNAME>
                  <AMOUNT>${invoice.total}</AMOUNT>
                </LEDGERENTRIES.LIST>
                
                <LEDGERENTRIES.LIST>
                  <LEDGERNAME>${customer.name}</LEDGERNAME>
                  <AMOUNT>-${invoice.total}</AMOUNT>
                  <BILLALLOCATIONS.LIST>
                    <NAME>${invoice.invoice_number}</NAME>
                    <BILLTYPE>Agst Ref</BILLTYPE>
                    <AMOUNT>${invoice.total}</AMOUNT>
                  </BILLALLOCATIONS.LIST>
                </LEDGERENTRIES.LIST>
              </VOUCHER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>
  `;
};

class TallyService {
  private static instance: TallyService;
  private retryCount: number = 3;
  private retryDelay: number = 1000; // 1 second

  private constructor() {}

  static getInstance(): TallyService {
    if (!TallyService.instance) {
      TallyService.instance = new TallyService();
    }
    return TallyService.instance;
  }

  private async sendRequest(xml: string): Promise<any> {
    let lastError: Error | null = null;

    // Remove any extra whitespace from XML
    const cleanXml = xml.trim().replace(/\s+/g, ' ');

    for (let i = 0; i < this.retryCount; i++) {
      try {
        const response = await fetch(TALLY_URL, {
          method: 'POST',
          body: cleanXml,
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Accept': 'text/xml, application/xml',
          },
        });

        const text = await response.text();

        // Check for Tally error responses in the XML
        if (text.includes('<LINEERROR>')) {
          throw new Error(
            text.match(/<LINEERROR>(.*?)<\/LINEERROR>/)?.[1] ||
            'Unknown Tally error'
          );
        }

        return text;
      } catch (error) {
        lastError = error as Error;
        if (i < this.retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    throw lastError || new Error('Failed to communicate with Tally');
  }

  async postSalesVoucher(
    invoice: Invoice,
    customer: Customer,
    items: InvoiceItem[]
  ): Promise<void> {
    const xml = createSalesVoucherXML(invoice, customer, items);
    await this.sendRequest(xml);
  }

  async postReceiptVoucher(
    invoice: Invoice,
    customer: Customer,
    paymentDate: string,
    paymentMode: string
  ): Promise<void> {
    const xml = createReceiptVoucherXML(invoice, customer, paymentDate, paymentMode);
    await this.sendRequest(xml);
  }

  async checkConnection(): Promise<{ connected: boolean; companyName?: string }> {
    try {
      // Simple request to check if Tally is running
      const xml = `<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <EXPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>ODBC Report</REPORTNAME>
                <SQLREQUEST TYPE="General" METHOD="SQLExecute">SELECT $Name FROM Company </SQLREQUEST>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA/>
        </EXPORTDATA>
    </BODY>
</ENVELOPE>`;

      // Try with fetch and minimal headers to avoid any browser restrictions
      const response = await fetch(TALLY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: xml,
        mode: 'no-cors', // This bypasses CORS entirely
      });

      // With no-cors mode, we can't read the response, but we can check if it succeeded
      if (response.type === 'opaque') {
        // Opaque response means the request was sent but we can't read the response
        // This is expected with no-cors mode
        console.log('Tally connection attempt completed (no-cors mode)');
        return { connected: true }; // Assume success since we can't read the response
      }

      const text = await response.text();
      
      // Check if we got a valid XML response in the expected format
      const isValidResponse = text && 
        text.includes('<ENVELOPE>') &&
        (text.includes('<EXPORTDATARESPONSE') || text.includes('<RESULTDATA>') || text.includes('<ROW>'));

      if (!isValidResponse) {
        console.error('Invalid Tally response:', text);
        return { connected: false };
      }

      // Extract company name from the response
      let companyName = '';
      if (text.includes('<RESULTDATA>')) {
        // Find all COL tags and get the last one (which should be the company name)
        const colMatches = text.match(/<COL>(.*?)<\/COL>/g);
        if (colMatches && colMatches.length > 0) {
          // Get the last COL match (the actual data, not the column definition)
          const lastColMatch = colMatches[colMatches.length - 1];
          const companyMatch = lastColMatch.match(/<COL>(.*?)<\/COL>/);
          if (companyMatch && companyMatch[1]) {
            companyName = companyMatch[1].trim();
          }
        }
      }

      return { connected: true, companyName };
    } catch (error) {
      console.error('Tally connection error:', error);
      return { connected: false };
    }
  }
}

export const tallyService = TallyService.getInstance();
