import { IAccount } from "@/constants/accounts";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export enum TradingType {
  INCOME = "income",
  OUTCOME = "outcome",
  TRANSFER = "transfer",
}

export interface IVoucherDashboardSummary {
  todayVoucherCount: number;
  monthTotalAmount: number;
  pendingVoucherCount: number;
  aiAverageConfidence: number;
}

export interface IVoucherLine {
  id: string;
  accounting: IAccount;
  particular: string;
  amount: number;
  isDebit: boolean;
}

export interface IVoucherLineUI {
  id: string;
  accounting: IAccount | null;
  particular: string;
  amount: number;
  isDebit: boolean | null;
}

export interface IVoucher {
  id: string;
  tradingDate: number;
  tradingType: TradingType;
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
    totalAmount: number;
  };
  issuerName: string;
  confidence: number;
  isVerified: boolean;
  analysisStatus: AIAnalysisStatus
  aiNote: string;
}

export interface IParsedVoucherLine {
  accountingCode: string;
  particular: string;
  amount: number;
  isDebit: boolean;
}

export interface IParsedVoucher {
  tradingDate: string;
  tradingType: "INCOME" | "OUTCOME" | "TRANSFER";
  note: string;
  lines: IParsedVoucherLine[];
}
