import axios from 'axios';
import { Invoice, Customer, InvoiceItem } from '../types/database';

const TALLY_HOST =  'localhost';
const TALLY_PORT = '9000';
const TALLY_URL = `http://${TALLY_HOST}:${TALLY_PORT}`;

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
            'Content-Type': 'text/xml;charset=utf-8',
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

  async checkConnection(): Promise<boolean> {
    try {
      // Simple request to check if Tally is running
      const testXML = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>MyReportMyCompany</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><REPORT NAME="MyReportMyCompany"><FORMS>MyForm</FORMS></REPORT></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>`;

      const response = await this.sendRequest(testXML);
      
      // Check if we got any kind of XML response
      const isValidResponse = response && 
        (response.includes('ENVELOPE') || 
         response.includes('RESPONSE') ||
         response.includes('COMPANY'));

      if (!isValidResponse) {
        console.error('Invalid Tally response:', response);
      }

      return isValidResponse;
    } catch (error) {
      console.error('Tally connection error:', error);
      return false;
    }
  }
}

export const tallyService = TallyService.getInstance();
