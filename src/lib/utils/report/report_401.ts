import {
  Imports,
  PurchaseBreakdown,
  Purchases,
  Sales,
  SalesBreakdown,
  TaxCalculation,
  TaxReport401,
} from '@/interfaces/report';
import { getAccountBookKYCByCompanyId } from '@/lib/utils/repo/account_book_kyc.repo';
import { convertTimestampToROCDate } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { SPECIAL_ACCOUNTS } from '@/constants/account';
import { importsCategories, purchasesCategories, salesCategories } from '@/constants/invoice';
import { InvoiceVoucherJournal, Journal, Invoice, Voucher, LineItem } from '@prisma/client';
import { Account } from 'next-auth';
import { listInvoiceVoucherJournalFor401 } from '@/lib/utils/repo/beta_transition.repo';

/** Info: (20240814 - Jacky) 更新銷項資料
 * Updates the sales result based on the provided journal, category, and sales object.
 * If the journal's invoice payment has tax, the payment price is added to the specified category in the sales object.
 * If the journal's invoice payment does not have tax, the payment price is added to the specified category in the sales object.
 *
 * @param sales - The sales object to be updated.
 * @param journal - The journal object that contains the invoice and payment information.
 * @param category - The category in the sales object where the payment price should be added.
 */
function updateSalesResult(
  sales: Sales,
  invoiceVoucherJournal: InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: Invoice | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  },
  category: keyof SalesBreakdown
) {
  const updatedSales = sales;
  if (invoiceVoucherJournal.invoice?.taxRatio === 0) {
    if (invoiceVoucherJournal.invoice?.taxRatio === 0) {
      updatedSales.breakdown[category].zeroTax +=
        invoiceVoucherJournal.invoice?.priceBeforeTax ?? 0;
    } else {
      updatedSales.breakdown[category].sales += invoiceVoucherJournal.invoice?.priceBeforeTax ?? 0;
      updatedSales.breakdown[category].tax += invoiceVoucherJournal.invoice?.taxPrice ?? 0;
      updatedSales.breakdown.total.sales += invoiceVoucherJournal.invoice?.priceBeforeTax ?? 0;
      updatedSales.breakdown.total.tax += invoiceVoucherJournal.invoice?.taxPrice ?? 0;
    }
  }
  if (invoiceVoucherJournal.voucher?.lineItems) {
    invoiceVoucherJournal.voucher?.lineItems.forEach((lineItem) => {
      if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
        updatedSales.includeFixedAsset +=
          typeof lineItem.amount === 'string'
            ? parseFloat(lineItem.amount)
            : lineItem.amount.toNumber();
      }
    });
  }
  updatedSales.totalTaxableAmount =
    updatedSales.breakdown.total.sales + updatedSales.breakdown.total.zeroTax;
}

/** Info: (20240814 - Jacky) 更新進項資料
 * Updates the purchases result based on the provided journal, category, and purchases object.
 * If the journal's invoice payment has tax, the payment price is added to the specified category in the purchases object.
 * If the journal's invoice payment does not have tax, the payment price is added to the specified category in the purchases object.
 *
 * @param purchases - The purchases object to be updated.
 * @param journal - The journal object that contains the invoice and payment information.
 * @param category - The category in the purchases object where the payment price should be added.
 */
function updatePurchasesResult(
  purchases: Purchases,
  invoiceVoucherJournal: InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: Invoice | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  },
  category: keyof PurchaseBreakdown
) {
  const updatedPurchase = purchases;
  let generalPurchases = {
    amount: 0,
    tax: 0,
  };
  const fixedAssets = {
    amount: 0,
    tax: 0,
  };
  const unDeductible = {
    generalPurchases: 0,
    fixedAssets: 0,
  };
  if (invoiceVoucherJournal.voucher?.lineItems) {
    if (invoiceVoucherJournal.invoice?.deductible) {
      invoiceVoucherJournal.voucher?.lineItems.forEach((lineItem) => {
        if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
          const lineItemAmount =
            typeof lineItem.amount === 'string'
              ? parseFloat(lineItem.amount)
              : lineItem.amount.toNumber();
          fixedAssets.amount += lineItemAmount;
          fixedAssets.tax += lineItemAmount * (invoiceVoucherJournal.invoice?.taxRatio ?? 0.05);
        }
      });
      generalPurchases = {
        amount: (invoiceVoucherJournal.invoice.priceBeforeTax ?? 0) - fixedAssets.amount,
        tax: (invoiceVoucherJournal.invoice?.taxPrice ?? 0) - fixedAssets.tax,
      };
    } else {
      invoiceVoucherJournal.voucher?.lineItems.forEach((lineItem) => {
        if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
          unDeductible.fixedAssets +=
            typeof lineItem.amount === 'string'
              ? parseFloat(lineItem.amount)
              : lineItem.amount.toNumber();
        }
      });
      unDeductible.generalPurchases =
        invoiceVoucherJournal.invoice?.priceBeforeTax ?? 0 - unDeductible.fixedAssets;
    }
  }
  updatedPurchase.breakdown[category].generalPurchases.amount += generalPurchases.amount;
  updatedPurchase.breakdown[category].generalPurchases.tax += generalPurchases.tax;
  updatedPurchase.breakdown[category].fixedAssets.amount += fixedAssets.amount;
  updatedPurchase.breakdown[category].fixedAssets.tax += fixedAssets.tax;
  updatedPurchase.breakdown.total.generalPurchases.amount += generalPurchases.amount;
  updatedPurchase.breakdown.total.generalPurchases.tax += generalPurchases.tax;
  updatedPurchase.breakdown.total.fixedAssets.amount += fixedAssets.amount;
  updatedPurchase.breakdown.total.fixedAssets.tax += fixedAssets.tax;
  updatedPurchase.totalWithNonDeductible.generalPurchases += unDeductible.generalPurchases;
  updatedPurchase.totalWithNonDeductible.fixedAssets += unDeductible.fixedAssets;
}

/** Info: (20240814 - Jacky) 更新進口資料
 * Updates the imports result based on the provided journal, category, and imports object.
 * If the journal's invoice payment does not have tax, the payment price is added to the specified category in the imports object.
 *
 * @param imports - The imports object to be updated.
 * @param journal - The journal object that contains the invoice and payment information.
 * @param category - The category in the imports object where the payment price should be added.
 */
function updateImportsResult(
  imports: Imports,
  invoiceVoucherJournal: InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: Invoice | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  },
  category: keyof Imports
) {
  const updatedImports = imports;
  if (!invoiceVoucherJournal.invoice?.taxRatio) {
    updatedImports[category] += invoiceVoucherJournal.invoice?.priceBeforeTax ?? 0;
  }
}

/** Info: (20240814 - Jacky) 稅額計算
 * Calculates the total tax amounts based on the provided tax calculation, sales, and purchases objects.
 * The total output tax is the total tax amount from the sales object.
 * The total deductible input tax is the total tax amount from the general purchases and fixed assets in the purchases object.
 * The total previous period offset is 0.
 * The total subtotal is the total deductible input tax plus the total previous period offset.
 * The total current period tax payable is the difference between the total output tax and the total subtotal.
 * If the total current period tax payable is negative, the total current period filing offset is 0, and the total current period refundable tax is the minimum of the refund ceiling and the total current period filing offset.
 * The total current period accumulated offset is the difference between the total current period filing offset and the total current period refundable tax.
 *
 * @param taxCalculation - The tax calculation object to be updated.
 * @param sales - The sales object that contains the total tax amounts.
 * @param purchases - The purchases object that contains the total tax amounts.
 */
function calculateTotals(taxCalculation: TaxCalculation, sales: Sales, purchases: Purchases) {
  const updatedTaxCalculation = taxCalculation;
  updatedTaxCalculation.outputTax = sales.breakdown.total.tax;
  updatedTaxCalculation.deductibleInputTax =
    purchases.breakdown.total.generalPurchases.tax + purchases.breakdown.total.fixedAssets.tax;
  updatedTaxCalculation.previousPeriodOffset = 0; // ToDo (20240808 - Jacky): [Beta] Implement this field in next change
  updatedTaxCalculation.subtotal =
    updatedTaxCalculation.deductibleInputTax + updatedTaxCalculation.previousPeriodOffset;
  const tempTax = updatedTaxCalculation.outputTax - updatedTaxCalculation.subtotal;
  if (tempTax >= 0) {
    updatedTaxCalculation.currentPeriodTaxPayable = tempTax;
  } else {
    updatedTaxCalculation.currentPeriodFilingOffset = -tempTax;
    updatedTaxCalculation.refundCeiling =
      sales.breakdown.total.zeroTax * 0.05 + purchases.breakdown.total.fixedAssets.tax;
    updatedTaxCalculation.currentPeriodRefundableTax = Math.min(
      updatedTaxCalculation.refundCeiling,
      updatedTaxCalculation.currentPeriodFilingOffset
    );
    updatedTaxCalculation.currentPeriodAccumulatedOffset =
      updatedTaxCalculation.currentPeriodFilingOffset -
      updatedTaxCalculation.currentPeriodRefundableTax;
  }
}

/** Info: (20240814 - Jacky) 產生401報表
 * Generates a 401 tax report based on the provided company ID, start date, and end date.
 * The report includes the basic information, sales breakdown, purchases breakdown, tax calculation, imports, and bonded area sales to tax area.
 *
 * @param companyId - The ID of the company to generate the report for.
 * @param from - The start date of the report in timestamp format.
 * @param to - The end date of the report in timestamp format.
 * @returns The generated 401 tax report.
 */
export async function generate401Report(
  companyId: number,
  from: number,
  to: number
): Promise<TaxReport401> {
  const companyKYC = await getAccountBookKYCByCompanyId(companyId);
  if (!companyKYC) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const ROCStartDate = convertTimestampToROCDate(from);
  const ROCEndDate = convertTimestampToROCDate(to);
  // Info: (20240813 - Jacky) 1. 獲取所有發票
  const invoiceVoucherJournalList: (InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: Invoice | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  })[] = (await listInvoiceVoucherJournalFor401(companyId, from, to)) as (InvoiceVoucherJournal & {
    journal: Journal | null;
    invoice: Invoice | null;
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
  })[];
  const basicInfo = {
    uniformNumber: companyKYC.registrationNumber,
    businessName: companyKYC.legalName,
    personInCharge: companyKYC.representativeName,
    taxSerialNumber: 'ABC123', // ToDo: (20240808 - Jacky) [Beta] Implement this field in next sprint
    businessAddress: companyKYC.address,
    currentYear: ROCStartDate.year.toString(),
    startMonth: ROCStartDate.month.toString(),
    endMonth: ROCEndDate.month.toString(),
    usedInvoiceCount: invoiceVoucherJournalList.length,
  };
  const sales = {
    breakdown: {
      triplicateAndElectronic: { sales: 0, tax: 0, zeroTax: 0 },
      cashRegisterTriplicate: { sales: 0, tax: 0, zeroTax: 0 },
      duplicateAndCashRegister: { sales: 0, tax: 0, zeroTax: 0 },
      invoiceExempt: { sales: 0, tax: 0, zeroTax: 0 },
      returnsAndAllowances: { sales: 0, tax: 0, zeroTax: 0 },
      total: { sales: 0, tax: 0, zeroTax: 0 },
    },
    totalTaxableAmount: 0,
    includeFixedAsset: 0,
  };
  const purchases = {
    breakdown: {
      uniformInvoice: {
        generalPurchases: { amount: 0, tax: 0 },
        fixedAssets: { amount: 0, tax: 0 },
      },
      cashRegisterAndElectronic: {
        generalPurchases: { amount: 0, tax: 0 },
        fixedAssets: { amount: 0, tax: 0 },
      },
      otherTaxableVouchers: {
        generalPurchases: { amount: 0, tax: 0 },
        fixedAssets: { amount: 0, tax: 0 },
      },
      customsDutyPayment: {
        generalPurchases: { amount: 0, tax: 0 },
        fixedAssets: { amount: 0, tax: 0 },
      },
      returnsAndAllowances: {
        generalPurchases: { amount: 0, tax: 0 },
        fixedAssets: { amount: 0, tax: 0 },
      },
      total: {
        generalPurchases: { amount: 0, tax: 0 },
        fixedAssets: { amount: 0, tax: 0 },
      },
    },
    totalWithNonDeductible: {
      generalPurchases: 0,
      fixedAssets: 0,
    },
  };
  const taxCalculation = {
    outputTax: 0,
    deductibleInputTax: 0,
    previousPeriodOffset: 0,
    subtotal: 0,
    currentPeriodTaxPayable: 0,
    currentPeriodFilingOffset: 0,
    refundCeiling: 0,
    currentPeriodRefundableTax: 0,
    currentPeriodAccumulatedOffset: 0,
  };
  const imports = {
    taxExemptGoods: 0,
    foreignServices: 0,
  };
  const bondedAreaSalesToTaxArea = 0;

  invoiceVoucherJournalList.forEach((invoiceVoucherJournal) => {
    if (invoiceVoucherJournal.invoice && invoiceVoucherJournal.invoice.type) {
      const { type } = invoiceVoucherJournal.invoice;
      if (type in salesCategories) {
        const category = type as keyof SalesBreakdown;
        updateSalesResult(sales, invoiceVoucherJournal, category);
      } else if (type in purchasesCategories) {
        const category = type as keyof PurchaseBreakdown;
        updatePurchasesResult(purchases, invoiceVoucherJournal, category);
      } else if (type in importsCategories) {
        const category = type as keyof Imports;
        updateImportsResult(imports, invoiceVoucherJournal, category);
      }
    }
  });

  calculateTotals(taxCalculation, sales, purchases);

  const report401: TaxReport401 = {
    basicInfo,
    sales,
    purchases,
    taxCalculation,
    imports,
    bondedAreaSalesToTaxArea,
  };

  return report401;
}
