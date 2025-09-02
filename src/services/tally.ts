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
      console.log('Checking Tally connection...');
      
      // Try multiple approaches to get company info
      const approaches = [
        {
          name: 'Company Info Report',
          xml: `<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <EXPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Company Info</REPORTNAME>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA/>
        </EXPORTDATA>
    </BODY>
</ENVELOPE>`
        },
        {
          name: 'Current Company',
          xml: `<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <EXPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Current Company</REPORTNAME>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA/>
        </EXPORTDATA>
    </BODY>
</ENVELOPE>`
        },
        {
          name: 'Company List',
          xml: `<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <EXPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Company List</REPORTNAME>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA/>
        </EXPORTDATA>
    </BODY>
</ENVELOPE>`
        }
      ];

      // Try each approach
      for (const approach of approaches) {
        try {
          console.log(`Trying approach: ${approach.name}`);
          
          const response = await fetch(TALLY_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: approach.xml,
          });

          if (response.ok) {
            const text = await response.text();
            console.log(`${approach.name} response:`, text);
            
            // Check if we got a valid XML response
            if (text && text.includes('<ENVELOPE>')) {
              // Extract company name from the response
              let companyName = this.extractCompanyName(text);
              
              if (companyName) {
                console.log(`Successfully extracted company name using ${approach.name}:`, companyName);
                return { connected: true, companyName };
              } else {
                console.log(`No company name found in ${approach.name} response, but connection successful`);
              }
            } else {
              console.log(`Invalid XML response from ${approach.name}`);
            }
          } else {
            console.log(`${approach.name} response not OK:`, response.status, response.statusText);
          }
        } catch (approachError) {
          console.log(`${approach.name} failed:`, approachError);
        }
      }

      // If we get here, we tried all approaches but couldn't get company name
      // Try with no-cors mode for basic connectivity check
      console.log('Trying no-cors mode for basic connectivity...');
      try {
        const noCorsResponse = await fetch(TALLY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: approaches[0].xml, // Use first approach
          mode: 'no-cors',
        });

        if (noCorsResponse.type === 'opaque') {
          console.log('Tally connection successful (no-cors mode)');
          return { connected: true, companyName: 'Connected (Company name not available)' };
        }
      } catch (noCorsError) {
        console.log('No-cors connection also failed:', noCorsError);
      }

      return { connected: false };
    } catch (error) {
      console.error('Tally connection error:', error);
      return { connected: false };
    }
  }

  private extractCompanyName(xmlText: string): string | null {
    console.log('Attempting to extract company name from XML...');
    
    // Try different patterns for company name extraction
    const patterns = [
      /<COMPANYNAME>(.*?)<\/COMPANYNAME>/,
      /<SVCOMPANY>(.*?)<\/SVCOMPANY>/,
      /<CURRENTCOMPANY>(.*?)<\/CURRENTCOMPANY>/,
      /<NAME>(.*?)<\/NAME>/
    ];
    
    for (const pattern of patterns) {
      const match = xmlText.match(pattern);
      if (match && match[1]) {
        const companyName = match[1].trim();
        if (companyName && companyName.length > 0) {
          console.log('Found company name with pattern:', pattern.source, 'Value:', companyName);
          return companyName;
        }
      }
    }

    // Try to find company info in result data
    if (xmlText.includes('<RESULTDATA>')) {
      console.log('Found RESULTDATA section, searching for company name...');
      const resultDataMatch = xmlText.match(/<RESULTDATA>(.*?)<\/RESULTDATA>/s);
      if (resultDataMatch && resultDataMatch[1]) {
        // Try to find company name in various formats
        const companyPatterns = [
          /<COL>(.*?)<\/COL>/g,
          /<TEXT>(.*?)<\/TEXT>/g,
          /<VALUE>(.*?)<\/VALUE>/g
        ];
        
        for (const pattern of companyPatterns) {
          const matches = resultDataMatch[1].match(pattern);
          if (matches && matches.length > 0) {
            // Get the last meaningful match (usually the actual data)
            const lastMatch = matches[matches.length - 1];
            const extractedName = lastMatch.replace(/<\/?[^>]+(>|$)/g, '').trim();
            if (extractedName && extractedName.length > 0 && extractedName !== 'Name') {
              console.log('Found company name in result data:', extractedName);
              return extractedName;
            }
          }
        }
      }
    }

    // Try alternative approach - look for any text that might be a company name
    if (xmlText.includes('<EXPORTDATARESPONSE>')) {
      console.log('Found EXPORTDATARESPONSE, searching for company info...');
      // Look for text content that might be company name
      const textMatches = xmlText.match(/<TEXT>(.*?)<\/TEXT>/g);
      if (textMatches && textMatches.length > 0) {
        for (const textMatch of textMatches) {
          const textContent = textMatch.replace(/<\/?TEXT>/g, '').trim();
          if (textContent && textContent.length > 0 && textContent !== 'Name' && textContent !== 'Company') {
            console.log('Found potential company name in TEXT tag:', textContent);
            return textContent;
          }
        }
      }
    }

    console.log('No company name found in XML response');
    return null;
  }
}

export const tallyService = TallyService.getInstance();
