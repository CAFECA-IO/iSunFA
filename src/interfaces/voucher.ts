import { IAccount } from "@/constants/accounts";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export enum TradingType {
  INCOME = "INCOME",
  OUTCOME = "OUTCOME",
  TRANSFER = "TRANSFER",
}

export interface IVoucherDashboardSummary {
  todayVoucherCount: number;
  monthTotalAmount: number | bigint | string;
  pendingVoucherCount: number;
  aiAverageConfidence: number;
}

export interface IVoucherLine {
  id: string;
  accounting: IAccount;
  particular: string;
  amount: number | bigint | string;
  isDebit: boolean;
}

export interface IVoucherLineUI {
  id: string;
  accountingCode: string;
  accounting: IAccount | null;
  particular: string;
  amount: number | bigint | string;
  isDebit: boolean | null;
}

export interface IVoucher {
  id: string;
  tradingDate: number;
  tradingType: TradingType | null;
  note: string;
  isDeleted: boolean;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  lineItems: {
    lines: IVoucherLineUI[];
    totalAmount: number | bigint | string;
  };
  issuerName: string;
  confidence: number;
  isVerified: boolean;
  analysisStatus: AIAnalysisStatus;
  aiNote: string;
  journalId?: string;
  esgRecordId?: string;
}

export interface IParsedVoucherLine {
  accountingCode: string;
  particular: string;
  amount: number | bigint | string;
  isDebit: boolean;
}

export interface IParsedVoucher {
  tradingDate: string;
  tradingType: "INCOME" | "OUTCOME" | "TRANSFER";
  note: string;
  lines: IParsedVoucherLine[];
}
