import { TaxReport401 } from '@/interfaces/report';
import { getCompanyKYCByCompanyId } from '@/lib/utils/repo/company_kyc.repo';
import { convertTimestampToROCDate } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';

export async function generate401Report(
  companyId: number,
  targetDateInSecond: number
): Promise<TaxReport401> {
  // TODO (20240808 - Jacky): Implement this function
  const companyKYC = await getCompanyKYCByCompanyId(companyId);
  if (!companyKYC) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const ROCDate = convertTimestampToROCDate(targetDateInSecond);
  const mockTaxReport: TaxReport401 = {
    basicInfo: {
      uniformNumber: companyKYC.registrationNumber,
      businessName: companyKYC.legalName,
      personInCharge: companyKYC.representativeName,
      taxSerialNumber: 'ABC123',
      businessAddress: companyKYC.address,
      currentYear: ROCDate.year.toString(),
      currentMonth: ROCDate.month.toString(),
      usedInvoiceCount: 100,
    },
    sales: {
      breakdown: {
        triplicateAndElectronic: {
          amount: 10000,
          tax: 1000,
        },
        cashRegisterTriplicate: {
          amount: 5000,
          tax: 500,
        },
        duplicateAndCashRegister: {
          amount: 3000,
          tax: 300,
        },
        taxExempt: {
          amount: 2000,
          tax: 0,
        },
        returnsAndAllowances: {
          amount: 1000,
          tax: 100,
        },
        total: {
          amount: 20000,
          tax: 1900,
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

  return mockTaxReport;
}
