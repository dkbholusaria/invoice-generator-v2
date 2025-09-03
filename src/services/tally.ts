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
  // Format date for Tally (YYYYMMDD format as per Sales_1.xml)
  const date = new Date(invoice.invoice_date);
  const voucherDate = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  
  // Calculate GST amounts
  const item = items[0]; // Assuming single item for now
  
  // Get the actual item name - handle both nested item structure and direct properties
  const itemName = (item as any).item?.name || item.item_id;
  const gstRate = item.tax_percentage || 0;
  
  // Calculate base amount (before GST) - this is the key fix!
  // If total is 105 and GST is 5%, then base = 105 / (1 + 5/100) = 105 / 1.05 = 100
  const baseAmount = item.total / (1 + gstRate / 100);
  
  // Calculate GST amounts on the base amount
  const cgstAmount = (baseAmount * gstRate / 100) / 2;
  const sgstAmount = (baseAmount * gstRate / 100) / 2;
  const igstAmount = 0; // For same state transactions
  
  console.log('=== ITEM DEBUG INFO ===');
  console.log('Item object:', item);
  console.log('Item name:', itemName);
  console.log('Item ID:', item.item_id);
  console.log('Nested item:', (item as any).item);
  console.log('GST Rate:', gstRate);
  console.log('Original Total (with GST):', item.total);
  console.log('Calculated Base Amount (before GST):', baseAmount);
  console.log('CGST Amount:', cgstAmount);
  console.log('SGST Amount:', sgstAmount);
  console.log('Total GST:', cgstAmount + sgstAmount);
  console.log('Verification - Base + GST:', baseAmount + cgstAmount + sgstAmount);
  console.log('=== END ITEM DEBUG ===');
  
  const voucherXML = `<ENVELOPE>
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
     <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
      <DATE>${voucherDate}</DATE>
      <VCHSTATUSDATE>${voucherDate}</VCHSTATUSDATE>
      <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
      <STATENAME>${customer.state || 'Karnataka'}</STATENAME>
      <COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>
      <PLACEOFSUPPLY>${customer.state || 'Karnataka'}</PLACEOFSUPPLY>
      <PARTYNAME>${customer.name}</PARTYNAME>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <PARTYLEDGERNAME>${customer.name}</PARTYLEDGERNAME>
      <VOUCHERNUMBER>${invoice.invoice_number}</VOUCHERNUMBER>
      <BASICBUYERNAME>${customer.name}</BASICBUYERNAME>
      <CMPGSTREGISTRATIONTYPE>Regular</CMPGSTREGISTRATIONTYPE>
      <PARTYMAILINGNAME>${customer.name}</PARTYMAILINGNAME>
      <CONSIGNEEMAILINGNAME>${customer.name}</CONSIGNEEMAILINGNAME>
      <CONSIGNEESTATENAME>${customer.state || 'Karnataka'}</CONSIGNEESTATENAME>
      <CMPGSTSTATE>${customer.state || 'Karnataka'}</CMPGSTSTATE>
      <CONSIGNEECOUNTRYNAME>India</CONSIGNEECOUNTRYNAME>
      <BASICBASEPARTYNAME>${customer.name}</BASICBASEPARTYNAME>
      <NUMBERINGSTYLE>Auto Retain</NUMBERINGSTYLE>
      <FBTPAYMENTTYPE>Default</FBTPAYMENTTYPE>
      <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
      <VCHSTATUSTAXADJUSTMENT>Default</VCHSTATUSTAXADJUSTMENT>
      <VCHSTATUSVOUCHERTYPE>Sales</VCHSTATUSVOUCHERTYPE>
      <VCHENTRYMODE>Item Invoice</VCHENTRYMODE>
      <DIFFACTUALQTY>No</DIFFACTUALQTY>
      <ISMSTFROMSYNC>No</ISMSTFROMSYNC>
      <ISDELETED>No</ISDELETED>
      <ISSECURITYONWHENENTERED>No</ISSECURITYONWHENENTERED>
      <ASORIGINAL>No</ASORIGINAL>
      <AUDITED>No</AUDITED>
      <ISCOMMONPARTY>No</ISCOMMONPARTY>
      <FORJOBCOSTING>No</FORJOBCOSTING>
      <ISOPTIONAL>No</ISOPTIONAL>
      <EFFECTIVEDATE>${voucherDate}</EFFECTIVEDATE>
      <USEFOREXCISE>No</USEFOREXCISE>
      <ISFORJOBWORKIN>No</ISFORJOBWORKIN>
      <ALLOWCONSUMPTION>No</ALLOWCONSUMPTION>
      <USEFORINTEREST>No</USEFORINTEREST>
      <USEFORGAINLOSS>No</USEFORGAINLOSS>
      <USEFORGODOWNTRANSFER>No</USEFORGODOWNTRANSFER>
      <USEFORCOMPOUND>No</USEFORCOMPOUND>
      <USEFORSERVICETAX>No</USEFORSERVICETAX>
      <ISREVERSECHARGEAPPLICABLE>No</ISREVERSECHARGEAPPLICABLE>
      <ISSYSTEM>No</ISSYSTEM>
      <ISFETCHEDONLY>No</ISFETCHEDONLY>
      <ISGSTOVERRIDDEN>No</ISGSTOVERRIDDEN>
      <ISCANCELLED>No</ISCANCELLED>
      <ISONHOLD>No</ISONHOLD>
      <ISSUMMARY>No</ISSUMMARY>
      <ISECOMMERCESUPPLY>No</ISECOMMERCESUPPLY>
      <ISBOENOTAPPLICABLE>No</ISBOENOTAPPLICABLE>
      <ISGSTSECSEVENAPPLICABLE>No</ISGSTSECSEVENAPPLICABLE>
      <IGNOREEINVVALIDATION>No</IGNOREEINVVALIDATION>
      <CMPGSTISOTHTERRITORYASSESSEE>No</CMPGSTISOTHTERRITORYASSESSEE>
      <PARTYGSTISOTHTERRITORYASSESSEE>No</PARTYGSTISOTHTERRITORYASSESSEE>
      <IRNJSONEXPORTED>No</IRNJSONEXPORTED>
      <IRNCANCELLED>No</IRNCANCELLED>
      <IGNOREGSTCONFLICTINMIG>No</IGNOREGSTCONFLICTINMIG>
      <ISOPBALTRANSACTION>No</ISOPBALTRANSACTION>
      <IGNOREGSTFORMATVALIDATION>No</IGNOREGSTFORMATVALIDATION>
      <ISELIGIBLEFORITC>Yes</ISELIGIBLEFORITC>
      <IGNOREGSTOPTIONALUNCERTAIN>No</IGNOREGSTOPTIONALUNCERTAIN>
      <UPDATESUMMARYVALUES>No</UPDATESUMMARYVALUES>
      <ISEWAYBILLAPPLICABLE>No</ISEWAYBILLAPPLICABLE>
      <ISDELETEDRETAINED>No</ISDELETEDRETAINED>
      <ISNULL>No</ISNULL>
      <ISEXCISEVOUCHER>No</ISEXCISEVOUCHER>
      <EXCISETAXOVERRIDE>No</EXCISETAXOVERRIDE>
      <USEFORTAXUNITTRANSFER>No</USEFORTAXUNITTRANSFER>
      <ISEXER1NOPOVERWRITE>No</ISEXER1NOPOVERWRITE>
      <ISEXF2NOPOVERWRITE>No</ISEXF2NOPOVERWRITE>
      <ISEXER3NOPOVERWRITE>No</ISEXER3NOPOVERWRITE>
      <IGNOREPOSVALIDATION>No</IGNOREPOSVALIDATION>
      <EXCISEOPENING>No</EXCISEOPENING>
      <USEFORFINALPRODUCTION>No</USEFORFINALPRODUCTION>
      <ISTDSOVERRIDDEN>No</ISTDSOVERRIDDEN>
      <ISTCSOVERRIDDEN>No</ISTCSOVERRIDDEN>
      <ISTDSTCSCASHVCH>No</ISTDSTCSCASHVCH>
      <INCLUDEADVPYMTVCH>No</INCLUDEADVPYMTVCH>
      <ISSUBWORKSCONTRACT>No</ISSUBWORKSCONTRACT>
      <ISVATOVERRIDDEN>No</ISVATOVERRIDDEN>
      <IGNOREORIGVCHDATE>No</IGNOREORIGVCHDATE>
      <ISVATPAIDATCUSTOMS>No</ISVATPAIDATCUSTOMS>
      <ISDECLAREDTOCUSTOMS>No</ISDECLAREDTOCUSTOMS>
      <VATADVANCEPAYMENT>No</VATADVANCEPAYMENT>
      <VATADVPAY>No</VATADVPAY>
      <ISCSTDELCAREDGOODSSALES>No</ISCSTDELCAREDGOODSSALES>
      <ISVATRESTAXINV>No</ISVATRESTAXINV>
      <ISSERVICETAXOVERRIDDEN>No</ISSERVICETAXOVERRIDDEN>
      <ISISDVOUCHER>No</ISISDVOUCHER>
      <ISEXCISEOVERRIDDEN>No</ISEXCISEOVERRIDDEN>
      <ISEXCISESUPPLYVCH>No</ISEXCISESUPPLYVCH>
      <GSTNOTEXPORTED>No</GSTNOTEXPORTED>
      <IGNOREGSTINVALIDATION>No</IGNOREGSTINVALIDATION>
      <ISGSTREFUND>No</ISGSTREFUND>
      <OVRDNEWAYBILLAPPLICABILITY>No</OVRDNEWAYBILLAPPLICABILITY>
      <ISVATPRINCIPALACCOUNT>No</ISVATPRINCIPALACCOUNT>
      <VCHSTATUSISVCHNUMUSED>No</VCHSTATUSISVCHNUMUSED>
      <VCHGSTSTATUSISINCLUDED>No</VCHGSTSTATUSISINCLUDED>
      <VCHGSTSTATUSISUNCERTAIN>Yes</VCHGSTSTATUSISUNCERTAIN>
      <VCHGSTSTATUSISEXCLUDED>No</VCHGSTSTATUSISEXCLUDED>
      <VCHGSTSTATUSISAPPLICABLE>Yes</VCHGSTSTATUSISAPPLICABLE>
      <VCHGSTSTATUSISGSTR2BRECONCILED>No</VCHGSTSTATUSISGSTR2BRECONCILED>
      <VCHGSTSTATUSISGSTR2BONLYINPORTAL>No</VCHGSTSTATUSISGSTR2BONLYINPORTAL>
      <VCHGSTSTATUSISGSTR2BONLYINBOOKS>No</VCHGSTSTATUSISGSTR2BONLYINBOOKS>
      <VCHGSTSTATUSISGSTR2BMISMATCH>No</VCHGSTSTATUSISGSTR2BMISMATCH>
      <VCHGSTSTATUSISGSTR2BINDIFFPERIOD>No</VCHGSTSTATUSISGSTR2BINDIFFPERIOD>
      <VCHGSTSTATUSISRETEFFDATEOVERRDN>No</VCHGSTSTATUSISRETEFFDATEOVERRDN>
      <VCHGSTSTATUSISOVERRDN>No</VCHGSTSTATUSISOVERRDN>
      <VCHGSTSTATUSISSTATINDIFFDATE>No</VCHGSTSTATUSISSTATINDIFFDATE>
      <VCHGSTSTATUSISRETINDIFFDATE>No</VCHGSTSTATUSISRETINDIFFDATE>
      <VCHGSTSTATUSMAINSECTIONEXCLUDED>No</VCHGSTSTATUSMAINSECTIONEXCLUDED>
      <VCHGSTSTATUSISBRANCHTRANSFEROUT>No</VCHGSTSTATUSISBRANCHTRANSFEROUT>
      <VCHGSTSTATUSISSYSTEMSUMMARY>No</VCHGSTSTATUSISSYSTEMSUMMARY>
      <VCHSTATUSISUNREGISTEREDRCM>No</VCHSTATUSISUNREGISTEREDRCM>
      <VCHSTATUSISOPTIONAL>No</VCHSTATUSISOPTIONAL>
      <VCHSTATUSISCANCELLED>No</VCHSTATUSISCANCELLED>
      <VCHSTATUSISDELETED>No</VCHSTATUSISDELETED>
      <VCHSTATUSISOPENINGBALANCE>No</VCHSTATUSISOPENINGBALANCE>
      <VCHSTATUSISFETCHEDONLY>No</VCHSTATUSISFETCHEDONLY>
      <VCHGSTSTATUSISOPTIONALUNCERTAIN>No</VCHGSTSTATUSISOPTIONALUNCERTAIN>
      <VCHSTATUSISREACCEPTFORHSNDONE>Yes</VCHSTATUSISREACCEPTFORHSNDONE>
      <PAYMENTLINKHASMULTIREF>No</PAYMENTLINKHASMULTIREF>
      <ISSHIPPINGWITHINSTATE>No</ISSHIPPINGWITHINSTATE>
      <ISOVERSEASTOURISTTRANS>No</ISOVERSEASTOURISTTRANS>
      <ISDESIGNATEDZONEPARTY>No</ISDESIGNATEDZONEPARTY>
      <HASCASHFLOW>No</HASCASHFLOW>
      <ISPOSTDATED>No</ISPOSTDATED>
      <USETRACKINGNUMBER>No</USETRACKINGNUMBER>
      <ISINVOICE>Yes</ISINVOICE>
      <MFGJOURNAL>No</MFGJOURNAL>
      <HASDISCOUNTS>No</HASDISCOUNTS>
      <ASPAYSLIP>No</ASPAYSLIP>
      <ISCOSTCENTRE>No</ISCOSTCENTRE>
      <ISSTXNONREALIZEDVCH>No</ISSTXNONREALIZEDVCH>
      <ISEXCISEMANUFACTURERON>No</ISEXCISEMANUFACTURERON>
      <ISBLANKCHEQUE>No</ISBLANKCHEQUE>
      <ISVOID>No</ISVOID>
      <ORDERLINESTATUS>No</ORDERLINESTATUS>
      <VATISAGNSTCANCSALES>No</VATISAGNSTCANCSALES>
      <VATISPURCEXEMPTED>No</VATISPURCEXEMPTED>
      <ISVATRESTAXINVOICE>No</ISVATRESTAXINVOICE>
      <VATISASSESABLECALCVCH>No</VATISASSESABLECALCVCH>
      <ISVATDUTYPAID>Yes</ISVATDUTYPAID>
      <ISDELIVERYSAMEASCONSIGNEE>No</ISDELIVERYSAMEASCONSIGNEE>
      <ISDISPATCHSAMEASCONSIGNOR>No</ISDISPATCHSAMEASCONSIGNOR>
      <ISDELETEDVCHRETAINED>No</ISDELETEDVCHRETAINED>
      <VCHONLYADDLINFOUPDATED>No</VCHONLYADDLINFOUPDATED>
      <CHANGEVCHMODE>No</CHANGEVCHMODE>
      <RESETIRNQRCODE>No</RESETIRNQRCODE>
      <EWAYBILLDETAILS.LIST>      </EWAYBILLDETAILS.LIST>
      <EXCLUDEDTAXATIONS.LIST>      </EXCLUDEDTAXATIONS.LIST>
      <OLDAUDITENTRIES.LIST>      </OLDAUDITENTRIES.LIST>
      <ACCOUNTAUDITENTRIES.LIST>      </ACCOUNTAUDITENTRIES.LIST>
      <AUDITENTRIES.LIST>      </AUDITENTRIES.LIST>
      <DUTYHEADDETAILS.LIST>      </DUTYHEADDETAILS.LIST>
      <GSTADVADJDETAILS.LIST>      </GSTADVADJDETAILS.LIST>
      <ALLINVENTORYENTRIES.LIST>
       <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
       <GSTOVRDNTAXABILITY>Taxable</GSTOVRDNTAXABILITY>
       <GSTSOURCETYPE>Stock Item</GSTSOURCETYPE>
       <GSTITEMSOURCE>${itemName}</GSTITEMSOURCE>
       <GSTOVRDNTYPEOFSUPPLY>Goods</GSTOVRDNTYPEOFSUPPLY>
       <GSTRATEINFERAPPLICABILITY>As per Masters/Company</GSTRATEINFERAPPLICABILITY>
       <GSTHSNINFERAPPLICABILITY>As per Masters/Company</GSTHSNINFERAPPLICABILITY>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <ISGSTASSESSABLEVALUEOVERRIDDEN>No</ISGSTASSESSABLEVALUEOVERRIDDEN>
       <STRDISGSTAPPLICABLE>No</STRDISGSTAPPLICABLE>
       <CONTENTNEGISPOS>No</CONTENTNEGISPOS>
       <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
       <ISAUTONEGATE>No</ISAUTONEGATE>
       <ISCUSTOMSCLEARANCE>No</ISCUSTOMSCLEARANCE>
       <ISTRACKCOMPONENT>No</ISTRACKCOMPONENT>
       <ISTRACKPRODUCTION>No</ISTRACKPRODUCTION>
       <ISPRIMARYITEM>No</ISPRIMARYITEM>
       <ISSCRAP>No</ISSCRAP>
               <RATE>${item.rate}/Pcs</RATE>
        <AMOUNT>${baseAmount}</AMOUNT>
        <ACTUALQTY> ${item.quantity} Pcs</ACTUALQTY>
        <BILLEDQTY> ${item.quantity} Pcs</BILLEDQTY>
        <BATCHALLOCATIONS.LIST>
         <GODOWNNAME>Main Location</GODOWNNAME>
         <BATCHNAME>Primary Batch</BATCHNAME>
         <DESTINATIONGODOWNNAME>Main Location</DESTINATIONGODOWNNAME>
         <DYNAMICCSTISCLEARED>No</DYNAMICCSTISCLEARED>
         <AMOUNT>${baseAmount}</AMOUNT>
         <ACTUALQTY> ${item.quantity} Pcs</ACTUALQTY>
         <BILLEDQTY> ${item.quantity} Pcs</BILLEDQTY>
        <ADDITIONALDETAILS.LIST>        </ADDITIONALDETAILS.LIST>
        <VOUCHERCOMPONENTLIST.LIST>        </VOUCHERCOMPONENTLIST.LIST>
       </BATCHALLOCATIONS.LIST>
       <ACCOUNTINGALLOCATIONS.LIST>
        <LEDGERNAME>GST Sales</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <LEDGERFROMITEM>No</LEDGERFROMITEM>
        <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
        <ISPARTYLEDGER>No</ISPARTYLEDGER>
        <GSTOVERRIDDEN>No</GSTOVERRIDDEN>
        <ISGSTASSESSABLEVALUEOVERRIDDEN>No</ISGSTASSESSABLEVALUEOVERRIDDEN>
        <STRDISGSTAPPLICABLE>No</STRDISGSTAPPLICABLE>
        <STRDGSTISPARTYLEDGER>No</STRDGSTISPARTYLEDGER>
        <STRDGSTISDUTYLEDGER>No</STRDGSTISDUTYLEDGER>
        <CONTENTNEGISPOS>No</CONTENTNEGISPOS>
        <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
        <ISCAPVATTAXALTERED>No</ISCAPVATTAXALTERED>
        <ISCAPVATNOTCLAIMED>No</ISCAPVATNOTCLAIMED>
                 <AMOUNT>${baseAmount}</AMOUNT>
        <SERVICETAXDETAILS.LIST>        </SERVICETAXDETAILS.LIST>
        <BANKALLOCATIONS.LIST>        </BANKALLOCATIONS.LIST>
        <BILLALLOCATIONS.LIST>        </BILLALLOCATIONS.LIST>
        <INTERESTCOLLECTION.LIST>        </INTERESTCOLLECTION.LIST>
        <OLDAUDITENTRIES.LIST>        </OLDAUDITENTRIES.LIST>
        <ACCOUNTAUDITENTRIES.LIST>        </ACCOUNTAUDITENTRIES.LIST>
        <AUDITENTRIES.LIST>        </AUDITENTRIES.LIST>
        <INPUTCRALLOCS.LIST>        </INPUTCRALLOCS.LIST>
        <DUTYHEADDETAILS.LIST>        </DUTYHEADDETAILS.LIST>
        <EXCISEDUTYHEADDETAILS.LIST>        </EXCISEDUTYHEADDETAILS.LIST>
        <RATEDETAILS.LIST>        </RATEDETAILS.LIST>
        <SUMMARYALLOCS.LIST>        </SUMMARYALLOCS.LIST>
        <CENVATDUTYALLOCATIONS.LIST>        </CENVATDUTYALLOCATIONS.LIST>
        <STPYMTDETAILS.LIST>        </STPYMTDETAILS.LIST>
        <EXCISEPAYMENTALLOCATIONS.LIST>        </EXCISEPAYMENTALLOCATIONS.LIST>
        <TAXBILLALLOCATIONS.LIST>        </TAXBILLALLOCATIONS.LIST>
        <TAXOBJECTALLOCATIONS.LIST>        </TAXOBJECTALLOCATIONS.LIST>
        <TDSEXPENSEALLOCATIONS.LIST>        </TDSEXPENSEALLOCATIONS.LIST>
        <VATSTATUTORYDETAILS.LIST>        </VATSTATUTORYDETAILS.LIST>
        <COSTTRACKALLOCATIONS.LIST>        </COSTTRACKALLOCATIONS.LIST>
        <REFVOUCHERDETAILS.LIST>        </REFVOUCHERDETAILS.LIST>
        <INVOICEWISEDETAILS.LIST>        </INVOICEWISEDETAILS.LIST>
        <VATITCDETAILS.LIST>        </VATITCDETAILS.LIST>
        <ADVANCETAXDETAILS.LIST>        </ADVANCETAXDETAILS.LIST>
        <TAXTYPEALLOCATIONS.LIST>        </TAXTYPEALLOCATIONS.LIST>
       </ACCOUNTINGALLOCATIONS.LIST>
       <DUTYHEADDETAILS.LIST>       </DUTYHEADDETAILS.LIST>
       <RATEDETAILS.LIST>
        <GSTRATEDUTYHEAD>CGST</GSTRATEDUTYHEAD>
        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
        <GSTRATE> ${gstRate / 2}</GSTRATE>
       </RATEDETAILS.LIST>
       <RATEDETAILS.LIST>
        <GSTRATEDUTYHEAD>SGST/UTGST</GSTRATEDUTYHEAD>
        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
        <GSTRATE> ${gstRate / 2}</GSTRATE>
       </RATEDETAILS.LIST>
       <RATEDETAILS.LIST>
        <GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD>
        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
        <GSTRATE> ${gstRate}</GSTRATE>
       </RATEDETAILS.LIST>
       <RATEDETAILS.LIST>
        <GSTRATEDUTYHEAD>Cess</GSTRATEDUTYHEAD>
       </RATEDETAILS.LIST>
       <RATEDETAILS.LIST>
        <GSTRATEDUTYHEAD>State Cess</GSTRATEDUTYHEAD>
        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
       </RATEDETAILS.LIST>
       <SUPPLEMENTARYDUTYHEADDETAILS.LIST>       </SUPPLEMENTARYDUTYHEADDETAILS.LIST>
       <TAXOBJECTALLOCATIONS.LIST>       </TAXOBJECTALLOCATIONS.LIST>
       <REFVOUCHERDETAILS.LIST>       </REFVOUCHERDETAILS.LIST>
       <EXCISEALLOCATIONS.LIST>       </EXCISEALLOCATIONS.LIST>
       <EXPENSEALLOCATIONS.LIST>       </EXPENSEALLOCATIONS.LIST>
      </ALLINVENTORYENTRIES.LIST>
      <CONTRITRANS.LIST>      </CONTRITRANS.LIST>
      <EWAYBILLERRORLIST.LIST>      </EWAYBILLERRORLIST.LIST>
      <IRNERRORLIST.LIST>      </IRNERRORLIST.LIST>
      <HARYANAVAT.LIST>      </HARYANAVAT.LIST>
      <SUPPLEMENTARYDUTYHEADDETAILS.LIST>      </SUPPLEMENTARYDUTYHEADDETAILS.LIST>
      <INVOICEDELNOTES.LIST>      </INVOICEDELNOTES.LIST>
      <INVOICEORDERLIST.LIST>      </INVOICEORDERLIST.LIST>
      <INVOICEINDENTLIST.LIST>      </INVOICEINDENTLIST.LIST>
      <ATTENDANCEENTRIES.LIST>      </ATTENDANCEENTRIES.LIST>
      <ORIGINVOICEDETAILS.LIST>      </ORIGINVOICEDETAILS.LIST>
      <INVOICEEXPORTLIST.LIST>      </INVOICEEXPORTLIST.LIST>
      <LEDGERENTRIES.LIST>
       <LEDGERNAME>${customer.name}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
       <LEDGERFROMITEM>No</LEDGERFROMITEM>
       <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
       <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
       <GSTOVERRIDDEN>No</GSTOVERRIDDEN>
       <ISGSTASSESSABLEVALUEOVERRIDDEN>No</ISGSTASSESSABLEVALUEOVERRIDDEN>
       <STRDISGSTAPPLICABLE>No</STRDISGSTAPPLICABLE>
       <STRDGSTISPARTYLEDGER>No</STRDGSTISPARTYLEDGER>
       <STRDGSTISDUTYLEDGER>No</STRDGSTISDUTYLEDGER>
       <CONTENTNEGISPOS>No</CONTENTNEGISPOS>
       <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
       <ISCAPVATTAXALTERED>No</ISCAPVATTAXALTERED>
       <ISCAPVATNOTCLAIMED>No</ISCAPVATNOTCLAIMED>
       <AMOUNT>-${invoice.total}</AMOUNT>
       <SERVICETAXDETAILS.LIST>       </SERVICETAXDETAILS.LIST>
       <BANKALLOCATIONS.LIST>       </BANKALLOCATIONS.LIST>
       <BILLALLOCATIONS.LIST>
        <NAME>${invoice.invoice_number}</NAME>
        <BILLTYPE>New Ref</BILLTYPE>
        <TDSDEDUCTEEISSPECIALRATE>No</TDSDEDUCTEEISSPECIALRATE>
        <AMOUNT>-${invoice.total}</AMOUNT>
        <INTERESTCOLLECTION.LIST>        </INTERESTCOLLECTION.LIST>
        <STBILLCATEGORIES.LIST>        </STBILLCATEGORIES.LIST>
       </BILLALLOCATIONS.LIST>
       <INTERESTCOLLECTION.LIST>       </INTERESTCOLLECTION.LIST>
       <OLDAUDITENTRIES.LIST>       </OLDAUDITENTRIES.LIST>
       <ACCOUNTAUDITENTRIES.LIST>       </ACCOUNTAUDITENTRIES.LIST>
       <AUDITENTRIES.LIST>       </AUDITENTRIES.LIST>
       <INPUTCRALLOCS.LIST>       </INPUTCRALLOCS.LIST>
       <DUTYHEADDETAILS.LIST>       </DUTYHEADDETAILS.LIST>
       <EXCISEDUTYHEADDETAILS.LIST>       </EXCISEDUTYHEADDETAILS.LIST>
       <RATEDETAILS.LIST>       </RATEDETAILS.LIST>
       <SUMMARYALLOCS.LIST>       </SUMMARYALLOCS.LIST>
       <CENVATDUTYALLOCATIONS.LIST>       </CENVATDUTYALLOCATIONS.LIST>
       <STPYMTDETAILS.LIST>       </STPYMTDETAILS.LIST>
       <EXCISEPAYMENTALLOCATIONS.LIST>       </EXCISEPAYMENTALLOCATIONS.LIST>
       <TAXBILLALLOCATIONS.LIST>       </TAXBILLALLOCATIONS.LIST>
       <TAXOBJECTALLOCATIONS.LIST>       </TAXOBJECTALLOCATIONS.LIST>
       <TDSEXPENSEALLOCATIONS.LIST>       </TDSEXPENSEALLOCATIONS.LIST>
       <VATSTATUTORYDETAILS.LIST>       </VATSTATUTORYDETAILS.LIST>
       <COSTTRACKALLOCATIONS.LIST>       </COSTTRACKALLOCATIONS.LIST>
       <REFVOUCHERDETAILS.LIST>       </REFVOUCHERDETAILS.LIST>
       <INVOICEWISEDETAILS.LIST>       </INVOICEWISEDETAILS.LIST>
       <VATITCDETAILS.LIST>       </VATITCDETAILS.LIST>
       <ADVANCETAXDETAILS.LIST>       </ADVANCETAXDETAILS.LIST>
       <TAXTYPEALLOCATIONS.LIST>       </TAXTYPEALLOCATIONS.LIST>
      </LEDGERENTRIES.LIST>
      <LEDGERENTRIES.LIST>
       <LEDGERNAME>CGST</LEDGERNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <LEDGERFROMITEM>No</LEDGERFROMITEM>
       <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
       <ISPARTYLEDGER>No</ISPARTYLEDGER>
       <GSTOVERRIDDEN>No</GSTOVERRIDDEN>
       <ISGSTASSESSABLEVALUEOVERRIDDEN>No</ISGSTASSESSABLEVALUEOVERRIDDEN>
       <STRDISGSTAPPLICABLE>No</STRDISGSTAPPLICABLE>
       <STRDGSTISPARTYLEDGER>No</STRDGSTISPARTYLEDGER>
       <STRDGSTISDUTYLEDGER>No</STRDGSTISDUTYLEDGER>
       <CONTENTNEGISPOS>No</CONTENTNEGISPOS>
       <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
       <ISCAPVATTAXALTERED>No</ISCAPVATTAXALTERED>
       <ISCAPVATNOTCLAIMED>No</ISCAPVATNOTCLAIMED>
       <AMOUNT>${cgstAmount}</AMOUNT>
       <VATEXPAMOUNT>${cgstAmount}</VATEXPAMOUNT>
       <SERVICETAXDETAILS.LIST>       </SERVICETAXDETAILS.LIST>
       <BANKALLOCATIONS.LIST>       </BANKALLOCATIONS.LIST>
       <BILLALLOCATIONS.LIST>       </BILLALLOCATIONS.LIST>
       <INTERESTCOLLECTION.LIST>       </INTERESTCOLLECTION.LIST>
       <OLDAUDITENTRIES.LIST>       </OLDAUDITENTRIES.LIST>
       <ACCOUNTAUDITENTRIES.LIST>       </ACCOUNTAUDITENTRIES.LIST>
       <AUDITENTRIES.LIST>       </AUDITENTRIES.LIST>
       <INPUTCRALLOCS.LIST>       </INPUTCRALLOCS.LIST>
       <DUTYHEADDETAILS.LIST>       </DUTYHEADDETAILS.LIST>
       <EXCISEDUTYHEADDETAILS.LIST>       </EXCISEDUTYHEADDETAILS.LIST>
       <RATEDETAILS.LIST>       </RATEDETAILS.LIST>
       <SUMMARYALLOCS.LIST>       </SUMMARYALLOCS.LIST>
       <CENVATDUTYALLOCATIONS.LIST>       </CENVATDUTYALLOCATIONS.LIST>
       <STPYMTDETAILS.LIST>       </STPYMTDETAILS.LIST>
       <EXCISEPAYMENTALLOCATIONS.LIST>       </EXCISEPAYMENTALLOCATIONS.LIST>
       <TAXBILLALLOCATIONS.LIST>       </TAXBILLALLOCATIONS.LIST>
       <TAXOBJECTALLOCATIONS.LIST>       </TAXOBJECTALLOCATIONS.LIST>
       <TDSEXPENSEALLOCATIONS.LIST>       </TDSEXPENSEALLOCATIONS.LIST>
       <VATSTATUTORYDETAILS.LIST>       </VATSTATUTORYDETAILS.LIST>
       <COSTTRACKALLOCATIONS.LIST>       </COSTTRACKALLOCATIONS.LIST>
       <REFVOUCHERDETAILS.LIST>       </REFVOUCHERDETAILS.LIST>
       <INVOICEWISEDETAILS.LIST>       </INVOICEWISEDETAILS.LIST>
       <VATITCDETAILS.LIST>       </VATITCDETAILS.LIST>
       <ADVANCETAXDETAILS.LIST>       </ADVANCETAXDETAILS.LIST>
       <TAXTYPEALLOCATIONS.LIST>       </TAXTYPEALLOCATIONS.LIST>
      </LEDGERENTRIES.LIST>
      <LEDGERENTRIES.LIST>
       <LEDGERNAME>SGST</LEDGERNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <LEDGERFROMITEM>No</LEDGERFROMITEM>
       <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
       <ISPARTYLEDGER>No</ISPARTYLEDGER>
       <GSTOVERRIDDEN>No</GSTOVERRIDDEN>
       <ISGSTASSESSABLEVALUEOVERRIDDEN>No</ISGSTASSESSABLEVALUEOVERRIDDEN>
       <STRDISGSTAPPLICABLE>No</STRDISGSTAPPLICABLE>
       <STRDGSTISPARTYLEDGER>No</STRDGSTISPARTYLEDGER>
       <STRDGSTISDUTYLEDGER>No</STRDGSTISDUTYLEDGER>
       <CONTENTNEGISPOS>No</CONTENTNEGISPOS>
       <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
       <ISCAPVATTAXALTERED>No</ISCAPVATTAXALTERED>
       <ISCAPVATNOTCLAIMED>No</ISCAPVATNOTCLAIMED>
       <AMOUNT>${sgstAmount}</AMOUNT>
       <VATEXPAMOUNT>${sgstAmount}</VATEXPAMOUNT>
       <SERVICETAXDETAILS.LIST>       </SERVICETAXDETAILS.LIST>
       <BANKALLOCATIONS.LIST>       </BANKALLOCATIONS.LIST>
       <BILLALLOCATIONS.LIST>       </BILLALLOCATIONS.LIST>
       <INTERESTCOLLECTION.LIST>       </INTERESTCOLLECTION.LIST>
       <OLDAUDITENTRIES.LIST>       </OLDAUDITENTRIES.LIST>
       <ACCOUNTAUDITENTRIES.LIST>       </ACCOUNTAUDITENTRIES.LIST>
       <AUDITENTRIES.LIST>       </AUDITENTRIES.LIST>
       <INPUTCRALLOCS.LIST>       </INPUTCRALLOCS.LIST>
       <DUTYHEADDETAILS.LIST>       </DUTYHEADDETAILS.LIST>
       <EXCISEDUTYHEADDETAILS.LIST>       </EXCISEDUTYHEADDETAILS.LIST>
       <RATEDETAILS.LIST>       </RATEDETAILS.LIST>
       <SUMMARYALLOCS.LIST>       </SUMMARYALLOCS.LIST>
       <CENVATDUTYALLOCATIONS.LIST>       </CENVATDUTYALLOCATIONS.LIST>
       <STPYMTDETAILS.LIST>       </STPYMTDETAILS.LIST>
       <EXCISEPAYMENTALLOCATIONS.LIST>       </EXCISEPAYMENTALLOCATIONS.LIST>
       <TAXBILLALLOCATIONS.LIST>       </TAXBILLALLOCATIONS.LIST>
       <TAXOBJECTALLOCATIONS.LIST>       </TAXOBJECTALLOCATIONS.LIST>
       <TDSEXPENSEALLOCATIONS.LIST>       </TDSEXPENSEALLOCATIONS.LIST>
       <VATSTATUTORYDETAILS.LIST>       </VATSTATUTORYDETAILS.LIST>
       <COSTTRACKALLOCATIONS.LIST>       </COSTTRACKALLOCATIONS.LIST>
       <REFVOUCHERDETAILS.LIST>       </REFVOUCHERDETAILS.LIST>
       <INVOICEWISEDETAILS.LIST>       </INVOICEWISEDETAILS.LIST>
       <VATITCDETAILS.LIST>       </VATITCDETAILS.LIST>
       <ADVANCETAXDETAILS.LIST>       </ADVANCETAXDETAILS.LIST>
       <TAXTYPEALLOCATIONS.LIST>       </TAXTYPEALLOCATIONS.LIST>
      </LEDGERENTRIES.LIST>
      <GST.LIST>
       <PURPOSETYPE>GST</PURPOSETYPE>
       <STAT.LIST>
        <PURPOSETYPE>GST</PURPOSETYPE>
        <STATKEY>${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}Outward Invoice1</STATKEY>
        <ISFETCHEDONLY>No</ISFETCHEDONLY>
        <ISDELETED>No</ISDELETED>
        <TALLYCONTENTUSER.LIST>        </TALLYCONTENTUSER.LIST>
       </STAT.LIST>
      </GST.LIST>
      <STKJRNLADDLCOSTDETAILS.LIST>      </STKJRNLADDLCOSTDETAILS.LIST>
      <PAYROLLMODEOFPAYMENT.LIST>      </PAYROLLMODEOFPAYMENT.LIST>
      <ATTDRECORDS.LIST>      </ATTDRECORDS.LIST>
      <GSTEWAYCONSIGNORADDRESS.LIST>      </GSTEWAYCONSIGNORADDRESS.LIST>
      <GSTEWAYCONSIGNEEADDRESS.LIST>      </GSTEWAYCONSIGNEEADDRESS.LIST>
      <TEMPGSTRATEDETAILS.LIST>      </TEMPGSTRATEDETAILS.LIST>
      <TEMPGSTADVADJUSTED.LIST>      </TEMPGSTADVADJUSTED.LIST>
      <GSTBUYERADDRESS.LIST>      </GSTBUYERADDRESS.LIST>
      <GSTCONSIGNEEADDRESS.LIST>      </GSTCONSIGNEEADDRESS.LIST>
     </VOUCHER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;
  
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
    
    console.log('=== ITEMS DEBUG ===');
    console.log('Items array:', items);
    items.forEach((item, index) => {
      console.log(`Item ${index}:`, {
        id: item.id,
        item_id: item.item_id,
        nested_item: (item as any).item,
        item_name: (item as any).item?.name,
        quantity: item.quantity,
        rate: item.rate,
        total: item.total
      });
    });
    console.log('=== END ITEMS DEBUG ===');
    
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
