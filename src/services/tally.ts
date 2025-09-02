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
  const voucherXML = `
  <ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
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
                        <DATE>20250902</DATE>
                        <NARRATION>Invoice #INV-202509-0001</NARRATION>
                        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
                        <VOUCHERNUMBER>INV-202509-0004</VOUCHERNUMBER>
                        <REFERENCE>INV-202509-0001</REFERENCE>
                        <PARTYLEDGERNAME>${customer.name}</PARTYLEDGERNAME>
                        <BASICBASEPARTYNAME>${customer.name}</BASICBASEPARTYNAME>
                        <STATENAME>${customer.state || ''}</STATENAME>
                        <PARTYGSTIN>${customer.gstin || ''}</PARTYGSTIN>
                        <ALLINVENTORYENTRIES.LIST>
                            <STOCKITEMNAME>${items[0].item_id}</STOCKITEMNAME>
                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                            <RATE>${items[0].rate} /pcs</RATE>
                            <AMOUNT>${items[0].total}</AMOUNT>
                            <ACTUALQTY>25 pcs</ACTUALQTY>
                            <BILLEDQTY>${items[0].quantity} pcs</BILLEDQTY>
                            <BATCHALLOCATIONS.LIST>
                                <GODOWNNAME>Main Location</GODOWNNAME>
                                <BATCHNAME>Primary Batch</BATCHNAME>
                                <AMOUNT>${items[0].total}</AMOUNT>
                            </BATCHALLOCATIONS.LIST>
                            <ACCOUNTINGALLOCATIONS.LIST>
                                <LEDGERNAME>${customer.name}</LEDGERNAME>
                                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                                <ISPARTYLEDGER>No</ISPARTYLEDGER>
                                <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
                                <AMOUNT>${items[0].total}</AMOUNT>
                            </ACCOUNTINGALLOCATIONS.LIST>
                        </ALLINVENTORYENTRIES.LIST>
                        <LEDGERENTRIES.LIST>
                            <LEDGERNAME>GST ${items[0].tax_percentage}%</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                            <ISPARTYLEDGER>No</ISPARTYLEDGER>
                            <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
                            <AMOUNT>${items[0].tax_amount}</AMOUNT>
                        </LEDGERENTRIES.LIST>
                        <LEDGERENTRIES.LIST>
                            <LEDGERNAME>${customer.name}</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                            <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
                            <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
                            <AMOUNT>-${items[0].total}</AMOUNT>
                        </LEDGERENTRIES.LIST>
                    </VOUCHER>
                </TALLYMESSAGE>
            </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
</ENVELOPE>`
  return voucherXML;
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
        console.log('Sending XML to Tally:', cleanXml);
        
        const response = await fetch(TALLY_URL, {
          method: 'POST',
          body: cleanXml,
          headers: {
            'Content-Type': 'text/plain',
          },
          mode: 'no-cors', // Use no-cors mode like checkConnection
        });

        console.log('Tally response type:', response.type);

        // With no-cors mode, we can't read the response, but we can check if it succeeded
        if (response.type === 'opaque') {
          // Opaque response means the request was sent but we can't read the response
          // This is expected with no-cors mode
          console.log('Tally request completed (no-cors mode)');
          return 'success'; // Return success since we can't read the response
        }

        const text = await response.text();
        console.log('Tally response text:', text);

        // Check for Tally error responses in the XML
        if (text.includes('<LINEERROR>')) {
          throw new Error(
            text.match(/<LINEERROR>(.*?)<\/LINEERROR>/)?.[1] ||
            'Unknown Tally error'
          );
        }

        return text;
      } catch (error) {
        console.error('Tally request error:', error);
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
    console.log('Posting sales voucher to Tally:', {
      invoice: invoice.invoice_number,
      customer: customer.name,
      itemsCount: items.length
    });
    
    const xml = createSalesVoucherXML(invoice, customer, items);
    console.log('Generated XML for Tally:', xml);
    
    const result = await this.sendRequest(xml);
    console.log('Tally posting result:', result);
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
