import { ReportSheetType } from '@/constants/report';
import ReportGenerator from '@/lib/utils/report/report_generator';

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
import { listInvoiceVoucherJournalFor401 } from '@/lib/utils/repo/beta_transition.repo';
import { SPECIAL_ACCOUNTS } from '@/constants/account';
import { importsCategories, purchasesCategories, salesCategories } from '@/constants/invoice';
import {
  Account,
  AccountBookKYC,
  Invoice,
  InvoiceVoucherJournal,
  Journal,
  LineItem,
  Voucher,
} from '@prisma/client';
import { getAccountBookWithSettingById } from '@/lib/utils/repo/account_book.repo';

// Info: (20250516 - Shirley) 定義 CompanyAddress 介面
interface CompanyAddress {
  city?: string;
  district?: string;
  enteredAddress?: string;
}

export default class Report401Generator extends ReportGenerator {
  constructor(companyId: number, startDateInSecond: number, endDateInSecond: number) {
    const reportSheetType = ReportSheetType.REPORT_401;
    super(companyId, startDateInSecond, endDateInSecond, reportSheetType);
  }

  private static isInputTax(code: string): boolean {
    const inputTaxCodeRegex = new RegExp(`^${SPECIAL_ACCOUNTS.INPUT_TAX.code}`);
    return inputTaxCodeRegex.test(code);
  }

  private static isOutputTax(code: string): boolean {
    const outputTaxCodeRegex = new RegExp(`^${SPECIAL_ACCOUNTS.OUTPUT_TAX.code}`);
    return outputTaxCodeRegex.test(code);
  }

  private static isVoucherHasInputTax(
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null
  ) {
    const result =
      voucher?.lineItems &&
      voucher.lineItems.some(
        (lineItem) => Report401Generator.isInputTax(lineItem.account.code) && lineItem.debit
      );
    return result;
  }

  private static isVoucherHasOutputTax(
    voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null
  ) {
    const result =
      voucher?.lineItems &&
      voucher.lineItems.some(
        (lineItem) => Report401Generator.isOutputTax(lineItem.account.code) && !lineItem.debit
      );
    return result;
  }

  /** Info (20240814 - Jacky): 更新銷項資料
   * Updates the sales result based on the provided journal, category, and sales object.
   * If the journal's invoice payment has tax, the payment price is added to the specified category in the sales object.
   * If the journal's invoice payment does not have tax, the payment price is added to the specified category in the sales object.
   *
   * @param sales - The sales object to be updated.
   * @param journal - The journal object that contains the invoice and payment information.
   * @param category - The category in the sales object where the payment price should be added.
   */
  private static updateSalesResult(
    sales: Sales,
    journal: InvoiceVoucherJournal & {
      journal: Journal | null;
      invoice: Invoice | null;
      voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
    },
    category: keyof SalesBreakdown
  ) {
    const updatedSales = sales;
    if (journal.invoice?.taxType === 'zeroTax') {
      updatedSales.breakdown[category].zeroTax += journal.invoice?.totalPrice ?? 0;
    } else {
      /**
       * Info: (20241015 - Murky)
       * 傳票上借方加總的數字
       */
      let totalAmount = 0;
      let taxPrice = 0;
      if (Report401Generator.isVoucherHasOutputTax(journal.voucher)) {
        journal.voucher?.lineItems.forEach((lineItem) => {
          const lineItemAmount =
            typeof lineItem.amount === 'string'
              ? parseFloat(lineItem.amount)
              : lineItem.amount.toNumber();
          if (lineItem.debit) {
            totalAmount += lineItemAmount;
          }
          if (Report401Generator.isOutputTax(lineItem.account.code) && !lineItem.debit) {
            const tax = lineItemAmount;
            taxPrice += tax;
          }
        });
      }

      // Info: (20240920 - Murky) To Jacky, emergency patch, use Input tax code to calculate tax

      // updatedSales.breakdown[category].sales += journal.invoice?.payment.price ?? 0;
      // updatedSales.breakdown.total.sales += journal.invoice?.payment.price ?? 0;
      // updatedSales.breakdown[category].tax += journal.invoice?.payment.taxPrice ?? 0;
      // updatedSales.breakdown.total.tax += journal.invoice?.payment.taxPrice ?? 0;

      updatedSales.breakdown[category].sales += totalAmount - Math.abs(taxPrice);
      updatedSales.breakdown.total.sales += totalAmount - Math.abs(taxPrice);
      updatedSales.breakdown[category].tax += Math.abs(taxPrice);
      updatedSales.breakdown.total.tax += Math.abs(taxPrice);
    }
    if (journal.voucher?.lineItems) {
      journal.voucher?.lineItems.forEach((lineItem) => {
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

  /** Info (20240814 - Jacky): 更新進項資料
   * Updates the purchases result based on the provided journal, category, and purchases object.
   * If the journal's invoice payment has tax, the payment price is added to the specified category in the purchases object.
   * If the journal's invoice payment does not have tax, the payment price is added to the specified category in the purchases object.
   *
   * @param purchases - The purchases object to be updated.
   * @param journal - The journal object that contains the invoice and payment information.
   * @param category - The category in the purchases object where the payment price should be added.
   */
  private static updatePurchasesResult(
    purchases: Purchases,
    journal: InvoiceVoucherJournal & {
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
    if (Report401Generator.isVoucherHasInputTax(journal.voucher)) {
      if (journal.invoice?.deductible) {
        let inputTax = 0;
        let totalAmount = 0;
        journal.voucher?.lineItems.forEach((lineItem) => {
          const lineItemAmount =
            typeof lineItem.amount === 'string'
              ? parseFloat(lineItem.amount)
              : lineItem.amount.toNumber();
          if (lineItem.debit) {
            totalAmount += lineItemAmount;
          }
          if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
            // Info: (20240920 - Murky) To Jacky, emergency patch, use Input tax code to calculate tax
            fixedAssets.amount += lineItemAmount;
            fixedAssets.tax += lineItemAmount * (journal.invoice?.taxRatio ?? 0.05);
          }

          // Info: (20240920 - Murky) To Jacky, emergency patch, use Input tax code to calculate tax
          if (Report401Generator.isInputTax(lineItem.account.code) && lineItem.debit) {
            const tax = lineItemAmount;
            inputTax += tax;
          }
        });

        // Info: (20240920 - Murky) To Jacky, emergency patch, use Input tax code to calculate tax
        // generalPurchases = {
        //   amount: (journal.invoice?.payment.price ?? 0) - fixedAssets.amount,
        //   tax: (journal.invoice?.payment.taxPrice ?? 0) - fixedAssets.tax,
        // };
        generalPurchases = {
          amount: totalAmount - Math.abs(inputTax) - fixedAssets.amount,
          tax: Math.abs(inputTax) - fixedAssets.tax,
        };
      } else {
        journal.voucher?.lineItems.forEach((lineItem) => {
          if (lineItem.account?.rootCode === SPECIAL_ACCOUNTS.FIXED_ASSET.rootCode) {
            unDeductible.fixedAssets +=
              typeof lineItem.amount === 'string'
                ? parseFloat(lineItem.amount)
                : lineItem.amount.toNumber();
          }
        });
        unDeductible.generalPurchases =
          journal.invoice?.priceBeforeTax ?? 0 - unDeductible.fixedAssets;
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

  /** Info (20240814 - Jacky): 更新進口資料
   * Updates the imports result based on the provided journal, category, and imports object.
   * If the journal's invoice payment does not have tax, the payment price is added to the specified category in the imports object.
   *
   * @param imports - The imports object to be updated.
   * @param journal - The journal object that contains the invoice and payment information.
   * @param category - The category in the imports object where the payment price should be added.
   */
  private static updateImportsResult(
    imports: Imports,
    journal: InvoiceVoucherJournal & {
      journal: Journal | null;
      invoice: Invoice | null;
      voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
    },
    category: keyof Imports
  ) {
    const updatedImports = imports;
    if (!journal.invoice?.taxRatio) {
      updatedImports[category] += journal.invoice?.priceBeforeTax ?? 0;
    }
  }

  /** Info (20240814 - Jacky): 稅額計算
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
  private static calculateTotals(
    taxCalculation: TaxCalculation,
    sales: Sales,
    purchases: Purchases
  ) {
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
  }

  /** Info (20240814 - Jacky): 產生401報表
   * Generates a 401 tax report based on the provided company ID, start date, and end date.
   * The report includes the basic information, sales breakdown, purchases breakdown, tax calculation, imports, and bonded area sales to tax area.
   *
   * @param companyId - The ID of the company to generate the report for.
   * @param from - The start date of the report in timestamp format.
   * @param to - The end date of the report in timestamp format.
   * @returns The generated 401 tax report.
   */
  public static async generate401Report(
    companyId: number,
    from: number,
    to: number
  ): Promise<TaxReport401> {
    const accountBookKYC: AccountBookKYC | null = await getAccountBookKYCByCompanyId(companyId);
    const company = await getAccountBookWithSettingById(companyId);

    // Info: (20241217 - Murky) Get Company Setting from company in prisma
    const companySetting =
      company && company.accountBookSettings.length ? company.accountBookSettings[0] : null;

    if (!accountBookKYC) {
      // Info: (20240912 - Murky) temporary allow to generate report without KYC
      // throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }
    const ROCStartDate = convertTimestampToROCDate(from);
    const ROCEndDate = convertTimestampToROCDate(to);
    // 1. 獲取所有發票
    const journalList: (InvoiceVoucherJournal & {
      journal: Journal | null;
      invoice: Invoice | null;
      voucher: (Voucher & { lineItems: (LineItem & { account: Account })[] }) | null;
    })[] = await listInvoiceVoucherJournalFor401(companyId, from, to);
    const basicInfo = {
      uniformNumber: accountBookKYC?.registrationNumber ?? company?.taxId ?? '',
      businessName: accountBookKYC?.legalName ?? company?.name ?? '',
      personInCharge: companySetting?.representativeName ?? '',
      taxSerialNumber: companySetting?.taxSerialNumber || '', // TODO (20240808 - Jacky): Implement this field in next sprint
      businessAddress:
        typeof companySetting?.address === 'string'
          ? ((JSON.parse(companySetting.address as string) as CompanyAddress)?.enteredAddress ?? '')
          : typeof companySetting?.address === 'object' && companySetting?.address !== null
            ? ((companySetting.address as CompanyAddress)?.enteredAddress ?? '')
            : '',
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
          const category = salesCategories[
            type as keyof typeof salesCategories
          ] as keyof SalesBreakdown;
          Report401Generator.updateSalesResult(sales, journal, category);
        } else if (type in purchasesCategories) {
          const category = purchasesCategories[
            type as keyof typeof purchasesCategories
          ] as keyof PurchaseBreakdown;
          Report401Generator.updatePurchasesResult(purchases, journal, category);
        } else if (type in importsCategories) {
          const category = importsCategories[
            type as keyof typeof importsCategories
          ] as keyof Imports;
          Report401Generator.updateImportsResult(imports, journal, category);
        }
      }
    });

    Report401Generator.calculateTotals(taxCalculation, sales, purchases);

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

  public async generateReport(): Promise<{
    content: TaxReport401;
  }> {
    const report401 = await Report401Generator.generate401Report(
      this.accountBookId,
      this.startDateInSecond,
      this.endDateInSecond
    );

    return {
      content: report401,
    };
  }
}
