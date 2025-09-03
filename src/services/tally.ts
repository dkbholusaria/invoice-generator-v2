import axios from 'axios';
import { Invoice, Customer, InvoiceItem } from '../types/database';


const TALLY_URL = 'http://localhost:3001/tally-proxy';

// XML templates for Tally vouchers
const createSalesVoucherXML = (
  invoice: Invoice,
  customer: Customer,
  items: InvoiceItem[],
  companyName: string
) => {
  // Format date for Tally (DD-MM-YYYY format)
  const date = new Date(invoice.invoice_date);
  const voucherDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
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
                    <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
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
                        <ALLINVENTORYENTRIES.LIST>
                            <STOCKITEMNAME>${items[0].item_id}</STOCKITEMNAME>
                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                            <RATE>${items[0].rate} /pcs</RATE>
                            <AMOUNT>${items[0].total}</AMOUNT>
                            <ACTUALQTY>${items[0].quantity} pcs</ACTUALQTY>
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
                            <AMOUNT>-${invoice.total}</AMOUNT>
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
  paymentMode: string,
  companyName?: string
) => {
  // Format date for Tally (DD-MM-YYYY format)
  const date = new Date(paymentDate);
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
  
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
              <SVCURRENTCOMPANY>${companyName || ''}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="Receipt" ACTION="Create">
                <DATE>${formattedDate}</DATE>
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
        
        // First try without CORS restrictions
        try {
          const response = await fetch(TALLY_URL, {
            method: 'POST',
            body: cleanXml,
            headers: {
              'Content-Type': 'text/xml',
            },
          });

          console.log('Tally response status:', response.status);
          console.log('Tally response type:', response.type);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

          // Check for successful import
          if (text.includes('<IMPORTDATA>') && text.includes('<CREATED>1</CREATED>')) {
            console.log('✓ Voucher successfully created in Tally');
            return { success: true, message: 'Voucher created successfully' };
          }

          // Check for other success indicators
          if (text.includes('<ENVELOPE>') && !text.includes('<LINEERROR>')) {
            console.log('✓ Tally request completed successfully');
            return { success: true, message: 'Request completed successfully' };
          }

          return text;
        } catch (corsError) {
          console.log('Direct request failed due to CORS, trying no-cors mode...');
          
          // Fallback to no-cors mode
          const noCorsResponse = await fetch(TALLY_URL, {
            method: 'POST',
            body: cleanXml,
            headers: {
              'Content-Type': 'text/xml',
            },
            mode: 'no-cors',
          });

          if (noCorsResponse.type === 'opaque') {
            console.log('✓ Tally request sent successfully (no-cors mode)');
            console.log('Note: Cannot read response due to CORS restrictions');
            return { 
              success: true, 
              message: 'Request sent to Tally (response not readable due to CORS)',
              mode: 'no-cors'
            };
          } else {
            throw new Error('No-cors request also failed');
          }
        }
              } catch (error) {
          console.error('Tally request error (attempt', i + 1, '):', error);
          lastError = error as Error;
          if (i < this.retryCount - 1) {
            console.log(`Retrying in ${this.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          }
        }
      }

      throw lastError || new Error('Failed to communicate with Tally after all retry attempts');
  }

  async postSalesVoucher(
    invoice: Invoice,
    customer: Customer,
    items: InvoiceItem[],
    companyName: string
  ): Promise<void> {
    console.log('=== TALLY SERVICE DEBUG ===');
    console.log('Received company name:', companyName);
    console.log('Company name type:', typeof companyName);
    console.log('Company name length:', companyName.length);
    console.log('Company name trimmed:', companyName.trim());
    
    console.log('Posting sales voucher to Tally:', {
      invoice: invoice.invoice_number,
      customer: customer.name,
      companyName: companyName,
      itemsCount: items.length,
      invoiceDate: invoice.invoice_date,
      invoiceDateType: typeof invoice.invoice_date
    });
    
    if (!companyName) {
      throw new Error('Company name is required for posting to Tally');
    }
    
    const xml = createSalesVoucherXML(invoice, customer, items, companyName);
    console.log('=== GENERATED XML ===');
    console.log('XML length:', xml.length);
    console.log('XML contains company name:', xml.includes(companyName));
    console.log('XML preview (first 500 chars):', xml.substring(0, 500));
    console.log('XML preview (last 500 chars):', xml.substring(xml.length - 500));
    
    const result = await this.sendRequest(xml);
    console.log('Tally posting result:', result);
  }

  async postReceiptVoucher(
    invoice: Invoice,
    customer: Customer,
    paymentDate: string,
    paymentMode: string,
    companyName?: string
  ): Promise<void> {
    const xml = createReceiptVoucherXML(invoice, customer, paymentDate, paymentMode, companyName);
    await this.sendRequest(xml);
  }

  async checkConnection(): Promise<{ connected: boolean; companyName?: string }> {
    try {
      console.log('Checking Tally connection...');
      
             // Use the correct Tally XML format for List of Companies
       const companyListXML = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

             // Try to get company list from Tally
       try {
         console.log('Requesting List of Companies from Tally...');
         
         const response = await fetch(TALLY_URL, {
           method: 'POST',
           headers: {
             'Content-Type': 'text/xml',
           },
           body: companyListXML,
         });

         if (response.ok) {
           const text = await response.text();
           console.log('=== TALLY RESPONSE DEBUG ===');
           console.log('Response status:', response.status);
           console.log('Response headers:', Object.fromEntries(response.headers.entries()));
           console.log('Response text length:', text.length);
           console.log('Response text preview (first 1000 chars):', text.substring(0, 1000));
           console.log('Response text preview (last 1000 chars):', text.substring(Math.max(0, text.length - 1000)));
           console.log('Response contains ENVELOPE:', text.includes('<ENVELOPE>'));
           console.log('Response contains COLLECTION:', text.includes('<COLLECTION>'));
           console.log('Response contains COMPANY:', text.includes('<COMPANY'));
           console.log('=== END RESPONSE DEBUG ===');
           
           // Check if we got a valid XML response
           if (text && text.includes('<ENVELOPE>')) {
             // Extract company name from the response
             let companyName = this.extractCompanyName(text);
             
             if (companyName) {
               console.log('Successfully extracted company name:', companyName);
               return { connected: true, companyName };
             } else {
               console.log('No company name found in response, but connection successful');
               console.log('This means Tally responded but we need to adjust our parsing logic');
             }
           } else {
             console.log('Invalid XML response from Tally');
             console.log('Response might be HTML error page or other format');
           }
         } else {
           console.log('Tally response not OK:', response.status, response.statusText);
           console.log('Response headers:', Object.fromEntries(response.headers.entries()));
         }
       } catch (requestError) {
         console.log('Direct request failed:', requestError);
       }

             // If we get here, we couldn't get company name with direct request
       // Try with no-cors mode for basic connectivity check
       console.log('Trying no-cors mode for basic connectivity...');
       try {
         const noCorsResponse = await fetch(TALLY_URL, {
           method: 'POST',
           headers: {
             'Content-Type': 'text/xml',
           },
           body: companyListXML,
           mode: 'no-cors',
         });

         if (noCorsResponse.type === 'opaque') {
           console.log('Tally connection successful (no-cors mode)');
           return { connected: true };
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
    
    // Parse XML similar to Python's approach
    try {
      // First, try to find COMPANY tags with ISACTIVE="Yes" (currently active company)
      const activeCompanyMatch = xmlText.match(/<COMPANY\s+NAME="([^"]+)"\s+ISACTIVE="Yes"/i);
      if (activeCompanyMatch && activeCompanyMatch[1]) {
        const companyName = activeCompanyMatch[1].trim();
        console.log('Found active company:', companyName);
        return companyName;
      }
      
      // If no active company found, try to find any COMPANY tag
      const companyMatch = xmlText.match(/<COMPANY\s+NAME="([^"]+)"/);
      if (companyMatch && companyMatch[1]) {
        const companyName = companyMatch[1].trim();
        console.log('Found company (not necessarily active):', companyName);
        return companyName;
      }
      
      // Try to find company info in COLLECTION section (like Python does)
      if (xmlText.includes('<COLLECTION>')) {
        console.log('Found COLLECTION section, searching for company info...');
        const collectionMatch = xmlText.match(/<COLLECTION>(.*?)<\/COLLECTION>/s);
        if (collectionMatch && collectionMatch[1]) {
          // Look for COMPANY tags in the collection
          const companyMatches = collectionMatch[1].match(/<COMPANY\s+NAME="([^"]+)"/g);
          if (companyMatches && companyMatches.length > 0) {
            // Get the first company found
            const firstCompany = companyMatches[0];
            const nameMatch = firstCompany.match(/NAME="([^"]+)"/);
            if (nameMatch && nameMatch[1]) {
              const companyName = nameMatch[1].trim();
              console.log('Found company name in collection:', companyName);
              return companyName;
            }
          }
        }
      }
      
      // Some builds use tags like <COMPANYNAME> under <COMPANY> or directly under collection items
      if (xmlText.includes('<COMPANYNAME>')) {
        console.log('Found COMPANYNAME tags, searching for company info...');
        const companyNameMatches = xmlText.match(/<COMPANYNAME>(.*?)<\/COMPANYNAME>/g);
        if (companyNameMatches && companyNameMatches.length > 0) {
          for (const match of companyNameMatches) {
            const companyName = match.replace(/<\/?COMPANYNAME>/g, '').trim();
            if (companyName && companyName.length > 0) {
              console.log('Found company name in COMPANYNAME tag:', companyName);
              return companyName;
            }
          }
        }
      }
      
      // Fallback: try different patterns for company name extraction
      const patterns = [
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

      console.log('No company name found in XML response');
      console.log('XML content preview:', xmlText.substring(0, 500));
      return null;
      
    } catch (error) {
      console.error('Error parsing XML:', error);
      return null;
    }
  }
}

export const tallyService = TallyService.getInstance();
