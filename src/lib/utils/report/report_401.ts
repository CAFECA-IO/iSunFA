import {
  Imports,
  PurchaseBreakdown,
  Purchases,
  Sales,
  SalesBreakdown,
  TaxCalculation,
  TaxReport401,
} from '@/interfaces/report';
import { getCompanyKYCByCompanyId } from '@/lib/utils/repo/company_kyc.repo';
import { convertTimestampToROCDate } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { listJournalFor401 } from '@/lib/utils/repo/journal.repo';
import { SPECIAL_ACCOUNTS } from '@/constants/account';
import { IJournalIncludeVoucherLineItemsInvoicePayment } from '@/interfaces/journal';
import { importsCategories, purchasesCategories, salesCategories } from '@/constants/invoice';

function updateSalesResult(
  sales: Sales,
  journal: IJournalIncludeVoucherLineItemsInvoicePayment,
  category: keyof SalesBreakdown
) {
  const updatedSales = sales;
  if (journal.invoice?.payment.hasTax) {
    if (journal.invoice?.payment.taxPercentage === 0) {
      updatedSales.breakdown[category].zeroTax += journal.invoice?.payment.price ?? 0;
    } else {
      updatedSales.breakdown[category].sales += journal.invoice?.payment.price ?? 0;
      updatedSales.breakdown[category].tax += journal.invoice?.payment.taxPrice ?? 0;
      updatedSales.breakdown.total.sales += journal.invoice?.payment.price ?? 0;
      updatedSales.breakdown.total.tax += journal.invoice?.payment.taxPrice ?? 0;
    }
  }
  if (journal.voucher?.lineItems) {
    journal.voucher?.lineItems.forEach((lineItem) => {
      if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
        updatedSales.includeFixedAsset += lineItem.amount;
      }
    });
  }
  updatedSales.totalTaxableAmount =
    updatedSales.breakdown.total.sales + updatedSales.breakdown.total.zeroTax;
}

// 更新采购结果
function updatePurchasesResult(
  purchases: Purchases,
  journal: IJournalIncludeVoucherLineItemsInvoicePayment,
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
  if (journal.voucher?.lineItems) {
    if (journal.invoice?.deductible) {
      journal.voucher?.lineItems.forEach((lineItem) => {
        if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
          fixedAssets.amount += lineItem.amount;
          fixedAssets.tax += lineItem.amount * (journal.invoice?.payment.taxPercentage ?? 0.05);
        }
      });
      generalPurchases = {
        amount: (journal.invoice?.payment.price ?? 0) - fixedAssets.amount,
        tax: (journal.invoice?.payment.taxPrice ?? 0) - fixedAssets.tax,
      };
    } else {
      journal.voucher?.lineItems.forEach((lineItem) => {
        if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
          unDeductible.fixedAssets += lineItem.amount;
        }
      });
      unDeductible.generalPurchases =
        journal.invoice?.payment.price ?? 0 - unDeductible.fixedAssets;
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

// 更新进口结果
function updateImportsResult(
  imports: Imports,
  journal: IJournalIncludeVoucherLineItemsInvoicePayment,
  category: keyof Imports
) {
  const updatedImports = imports;
  if (!journal.invoice?.payment.hasTax) {
    updatedImports[category] += journal.invoice?.payment.price ?? 0;
  }
}

// 计算总金额和税金
function calculateTotals(taxCalculation: TaxCalculation, sales: Sales, purchases: Purchases) {
  const updatedTaxCalculation = taxCalculation;
  updatedTaxCalculation.outputTax = sales.breakdown.total.tax;
  updatedTaxCalculation.deductibleInputTax =
    purchases.breakdown.total.generalPurchases.tax + purchases.breakdown.total.fixedAssets.tax;
  updatedTaxCalculation.previousPeriodOffset = 0; // TODO (20240808 - Jacky): Implement this field in next change
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

  // Example values; replace with your specific logic
}

export async function generate401Report(
  companyId: number,
  from: number,
  to: number
): Promise<TaxReport401> {
  // TODO (20240808 - Jacky): Implement this function
  const companyKYC = await getCompanyKYCByCompanyId(companyId);
  if (!companyKYC) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const ROCStartDate = convertTimestampToROCDate(from);
  const ROCEndDate = convertTimestampToROCDate(to);
  // 1. 獲取所有發票
  const journalList = await listJournalFor401(companyId, from, to);
  const basicInfo = {
    uniformNumber: companyKYC.registrationNumber,
    businessName: companyKYC.legalName,
    personInCharge: companyKYC.representativeName,
    taxSerialNumber: 'ABC123', // TODO (20240808 - Jacky): Implement this field in next sprint
    businessAddress: companyKYC.address,
    currentYear: ROCStartDate.year.toString(),
    startMonth: ROCStartDate.month.toString(),
    endMonth: ROCEndDate.month.toString(),
    usedInvoiceCount: journalList.length,
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

  journalList.forEach((journal) => {
    if (journal.invoice && journal.invoice.type) {
      const { type } = journal.invoice;
      if (type in salesCategories) {
        const category = type as keyof SalesBreakdown;
        updateSalesResult(sales, journal, category);
      } else if (type in purchasesCategories) {
        const category = type as keyof PurchaseBreakdown;
        updatePurchasesResult(purchases, journal, category);
      } else if (type in importsCategories) {
        const category = type as keyof Imports;
        updateImportsResult(imports, journal, category);
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

export const mockTaxReport: TaxReport401 = {
  basicInfo: {
    uniformNumber: '12345678',
    businessName: 'Test Company',
    personInCharge: 'Test Person',
    taxSerialNumber: 'ABC123',
    businessAddress: 'Test Address',
    currentYear: '110',
    startMonth: '1',
    endMonth: '12',
    usedInvoiceCount: 100,
  },
  sales: {
    breakdown: {
      triplicateAndElectronic: {
        sales: 10000,
        tax: 1000,
        zeroTax: 0,
      },
      cashRegisterTriplicate: {
        sales: 5000,
        tax: 500,
        zeroTax: 0,
      },
      duplicateAndCashRegister: {
        sales: 3000,
        tax: 300,
        zeroTax: 0,
      },
      invoiceExempt: {
        sales: 2000,
        tax: 0,
        zeroTax: 0,
      },
      returnsAndAllowances: {
        sales: 1000,
        tax: 100,
        zeroTax: 0,
      },
      total: {
        sales: 20000,
        tax: 1900,
        zeroTax: 0,
      },
    },
    totalTaxableAmount: 18000,
    includeFixedAsset: 2000,
  },
  purchases: {
    breakdown: {
      uniformInvoice: {
        generalPurchases: {
          amount: 8000,
          tax: 800,
        },
        fixedAssets: {
          amount: 2000,
          tax: 200,
        },
      },
      cashRegisterAndElectronic: {
        generalPurchases: {
          amount: 5000,
          tax: 500,
        },
        fixedAssets: {
          amount: 1000,
          tax: 100,
        },
      },
      otherTaxableVouchers: {
        generalPurchases: {
          amount: 3000,
          tax: 300,
        },
        fixedAssets: {
          amount: 500,
          tax: 50,
        },
      },
      customsDutyPayment: {
        generalPurchases: {
          amount: 1000,
          tax: 100,
        },
        fixedAssets: {
          amount: 0,
          tax: 0,
        },
      },
      returnsAndAllowances: {
        generalPurchases: {
          amount: 500,
          tax: 50,
        },
        fixedAssets: {
          amount: 0,
          tax: 0,
        },
      },
      total: {
        generalPurchases: {
          amount: 17500,
          tax: 1750,
        },
        fixedAssets: {
          amount: 2750,
          tax: 350,
        },
      },
    },
    totalWithNonDeductible: {
      generalPurchases: 17500,
      fixedAssets: 2750,
    },
  },
  taxCalculation: {
    outputTax: 2000,
    deductibleInputTax: 1500,
    previousPeriodOffset: 500,
    subtotal: 3000,
    currentPeriodTaxPayable: 1000,
    currentPeriodFilingOffset: 0,
    refundCeiling: 500,
    currentPeriodRefundableTax: 0,
    currentPeriodAccumulatedOffset: 500,
  },
  imports: {
    taxExemptGoods: 1000,
    foreignServices: 500,
  },
  bondedAreaSalesToTaxArea: 1000,
};
