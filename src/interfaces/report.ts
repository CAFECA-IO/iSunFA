import { ReportSheetType, ReportType } from '@/constants/report';
import { IAccountReadyForFrontend, IAccountResultStatus } from '@/interfaces/accounting_account';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { AnalysisReportTypesKey, FinancialReportTypesKey } from '@/interfaces/report_type';
import { IPaginatedData } from '@/interfaces/pagination';
import { Prisma } from '@prisma/client';
import { IAccountingSetting } from '@/interfaces/accounting_setting';

export interface IAnalysisReportRequest {
  project_id: string;
  type: string;
  language: string;
  start_date: Date;
  end_date: Date;
}

export interface IReport {
  id: number;
  accountBookId: number;
  tokenContract: string;
  tokenId: string;
  name: string;
  from: number;
  to: number;
  type: ReportType;
  reportType: ReportSheetType;
  status: string;
  remainingSeconds: number;
  paused: boolean;
  projectId: number | null;
  project: {
    id: string;
    name: string;
    code: string;
  } | null;
  reportLink: string;
  downloadLink: string;
  blockChainExplorerLink: string;
  evidenceId: string;
  content: IAccountReadyForFrontend[];
  otherInfo: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface IPaginatedReport extends IPaginatedData<IReport[]> {}

export const MOCK_TOTAL_PAGES = 10;

export const MOCK_REPORTS: IReport[] = [
  {
    id: 1,
    accountBookId: 123,
    tokenContract: '0x123abc',
    tokenId: '456def',
    name: 'Mock Report',
    from: 1630444800,
    to: 1633046400,
    type: ReportType.FINANCIAL,
    reportType: ReportSheetType.BALANCE_SHEET,
    status: 'completed',
    remainingSeconds: 0,
    paused: false,
    projectId: null,
    project: null,
    reportLink: 'https://example.com/report',
    downloadLink: 'https://example.com/download',
    blockChainExplorerLink: 'https://example.com/explorer',
    evidenceId: 'abc123',
    content: [],
    otherInfo: null,
    createdAt: 1633046400,
    updatedAt: 1633046400,
  },
  {
    id: 2,
    accountBookId: 123,
    tokenContract: '0x123abc',
    tokenId: '456def',
    name: 'Mock Report',
    from: 1630444800,
    to: 1633046400,
    type: ReportType.FINANCIAL,
    reportType: ReportSheetType.BALANCE_SHEET,
    status: 'completed',
    remainingSeconds: 0,
    paused: false,
    projectId: null,
    project: null,
    reportLink: 'https://example.com/report',
    downloadLink: 'https://example.com/download',
    blockChainExplorerLink: 'https://example.com/explorer',
    evidenceId: 'abc123',
    content: [],
    otherInfo: null,
    createdAt: 1633046400,
    updatedAt: 1633046400,
  },
];

export type IReportIncludeCompanyProject = Prisma.ReportGetPayload<{
  include: {
    project: true;
    accountBook: true;
  };
}>;
export interface IReportOld {
  reportTypesName: {
    id: FinancialReportTypesKey | AnalysisReportTypesKey;
    name: string;
  };
  tokenContract: string;
  tokenId: string;
  reportLink: string;
}

export type IAnalysisReport = string | null;

export type IFinancialReport = string | null;

export type FinancialReportType =
  (typeof FinancialReportTypesKey)[keyof typeof FinancialReportTypesKey];
export type AnalysisReportType =
  (typeof AnalysisReportTypesKey)[keyof typeof AnalysisReportTypesKey];

export type FinancialReportLanguage = (typeof ReportLanguagesKey)[keyof typeof ReportLanguagesKey];

export interface IFinancialReportRequest {
  projectId?: string;
  type?: ReportSheetType;
  reportLanguage?: ReportLanguagesKey;
  from?: number;
  to?: number;
  reportType?: ReportType;
}

export interface FinancialReportItem {
  code: string;

  name: string;
  curPeriodAmount: number;
  curPeriodAmountString: string;
  curPeriodPercentage: number;
  prePeriodAmount: number;
  prePeriodAmountString: string;
  prePeriodPercentage: number;
  indent: number;
}
export interface YearlyData {
  [year: string]: number;
}
// Info: (20240729 - Murky): To Shirley, New Interface need to be connect to front end
export interface FinancialReport {
  company: {
    id: number;
    code: string;
    name: string;
    accountingSetting?: IAccountingSetting;
  };
  preDate: {
    from: number;
    to: number;
  };
  curDate: {
    from: number;
    to: number;
  };
  reportType: ReportSheetType;
  general: IAccountReadyForFrontend[];
  details: IAccountReadyForFrontend[];
  otherInfo: unknown;
}

export interface IReportContent {
  content: IFinancialReportInDB | TaxReport401;
}

export interface IFinancialReportInDB {
  content: IAccountReadyForFrontend[];
  otherInfo: BalanceSheetOtherInfo | CashFlowStatementOtherInfo | IncomeStatementOtherInfo;
}

export interface BalanceSheetOtherInfo {
  assetLiabilityRatio: {
    [date: string]: {
      data: number[]; // Info: (20240730 - Shirley) [資產,負債,權益], 數字是已經*100的數字, 不會有小數點
      labels: string[]; // Info: (20240730 - Shirley) ["資產", "負債", "權益"]
    };
  };
  assetMixRatio: {
    // Info: (20240730 - Shirley) 資產組成，包含數量最大的五種資產跟其他
    [date: string]: {
      data: number[]; // Info: (20240730 - Shirley) [資產1, 資產2, 資產3, 資產4, 資產5, 其他], 數字是已經*100的數字, 不會有小數點
      labels: string[];
    };
  };
  dso: {
    curDso: number;
    preDso: number;
  };
  inventoryTurnoverDays: {
    curInventoryTurnoverDays: number;
    preInventoryTurnoverDays: number;
  };
}

export interface IncomeStatementOtherInfo {
  revenueAndExpenseRatio: {
    revenue: IAccountReadyForFrontend;
    totalCost: IAccountReadyForFrontend;
    salesExpense: IAccountReadyForFrontend;
    administrativeExpense: IAccountReadyForFrontend;
    ratio: {
      curRatio: number;
      preRatio: number;
    };
  };
  revenueToRD: {
    revenue: IAccountReadyForFrontend;
    researchAndDevelopmentExpense: IAccountReadyForFrontend;
    ratio: {
      curRatio: number;
      preRatio: number;
    };
  };
}

export interface CashFlowStatementOtherInfo {
  operatingStabilized: {
    beforeIncomeTax: YearlyData;
    amortizationDepreciation: YearlyData; // Info: (20240730 - Shirley) 折舊攤銷費用
    tax: YearlyData;
    operatingIncomeCashFlow: YearlyData;
    ratio: YearlyData;
  };
  lineChartDataForRatio: {
    data: number[];
    labels: string[];
  };
  strategyInvest: {
    [year: string]: {
      data: number[];
      labels: string[];
    };
  };
  thirdTitle: string;
  fourthTitle: string;
  fourPointOneTitle: string;
  ourThoughts: string[];
  freeCash: {
    [year: string]: {
      operatingCashFlow: number;
      ppe: number;
      intangibleAsset: number;
      freeCash: number;
    };
  };
}

export interface BalanceSheetReport extends FinancialReport {
  otherInfo: BalanceSheetOtherInfo;
}

export interface IncomeStatementReport extends FinancialReport {
  otherInfo: IncomeStatementOtherInfo;
}

export interface CashFlowStatementReport extends FinancialReport {
  otherInfo: CashFlowStatementOtherInfo;
}

export function isFinancialReportType(data: string): data is FinancialReportType {
  return (
    data === FinancialReportTypesKey.balance_sheet ||
    data === FinancialReportTypesKey.comprehensive_income_statement ||
    data === FinancialReportTypesKey.cash_flow_statement
  );
}

export interface IFinancialReportsProgressStatusResponse extends IAccountResultStatus {
  type: FinancialReportType;
  startDate: Date;
  endDate: Date;
}

// Info: (20240505 - Murky): type guards can input any type and return a boolean
export function isIAnalysisReportRequest(obj: unknown): obj is IAnalysisReportRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    typeof (obj as { type: unknown }).type === 'string' &&
    'language' in obj &&
    typeof (obj as { language: unknown }).language === 'string' &&
    'start_date' in obj &&
    (obj as { start_date: unknown }).start_date instanceof Date &&
    'end_date' in obj &&
    (obj as { end_date: unknown }).end_date instanceof Date
  );
}

export interface TaxReport401 {
  basicInfo: BasicInfo;
  sales: Sales;
  purchases: Purchases;
  taxCalculation: TaxCalculation;
  imports: Imports;
  bondedAreaSalesToTaxArea: number;
}

interface BasicInfo {
  uniformNumber: string;
  businessName: string;
  personInCharge: string;
  taxSerialNumber: string;
  businessAddress: string;
  currentYear: string;
  startMonth: string;
  endMonth: string;
  usedInvoiceCount: number;
}

export interface Sales {
  breakdown: SalesBreakdown;
  totalTaxableAmount: number;
  includeFixedAsset: number;
}

export interface SalesBreakdown {
  triplicateAndElectronic: SalesDetail;
  cashRegisterTriplicate: SalesDetail;
  duplicateAndCashRegister: SalesDetail;
  invoiceExempt: SalesDetail;
  returnsAndAllowances: SalesDetail;
  total: SalesDetail;
}

interface SalesDetail {
  sales: number;
  tax: number;
  zeroTax: number;
}

interface PurchasesDetail {
  amount: number;
  tax: number;
}

export interface Purchases {
  breakdown: PurchaseBreakdown;
  totalWithNonDeductible: PurchaseTotal;
}

export interface PurchaseBreakdown {
  uniformInvoice: PurchaseCategory;
  cashRegisterAndElectronic: PurchaseCategory;
  otherTaxableVouchers: PurchaseCategory;
  customsDutyPayment: PurchaseCategory;
  returnsAndAllowances: PurchaseCategory;
  total: PurchaseCategory;
}

interface PurchaseCategory {
  generalPurchases: PurchasesDetail;
  fixedAssets: PurchasesDetail;
}

interface PurchaseTotal {
  generalPurchases: number;
  fixedAssets: number;
}

export interface TaxCalculation {
  outputTax: number;
  deductibleInputTax: number;
  previousPeriodOffset: number;
  subtotal: number;
  currentPeriodTaxPayable: number;
  currentPeriodFilingOffset: number;
  refundCeiling: number;
  currentPeriodRefundableTax: number;
  currentPeriodAccumulatedOffset: number;
}

export interface Imports {
  taxExemptGoods: number;
  foreignServices: number;
}

export interface TaxReport401Content {
  id: number;
  accountBookId: number;
  tokenContract: string;
  tokenId: string;
  name: string;
  from: number;
  to: number;
  type: string;
  reportType: string;
  status: string;
  remainingSeconds: number;
  paused: boolean;
  projectId: number | null;
  project: string | null;
  reportLink: string;
  downloadLink: string;
  blockChainExplorerLink: string;
  evidenceId: string;
  content: TaxReport401;
  createdAt: number;
  updatedAt: number;
}
