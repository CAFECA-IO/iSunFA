import { IAccount } from "@/constants/accounts";

export enum TradingType {
  INCOME = "income",
  OUTCOME = "outcome",
  TRANSFER = "transfer",
}

export enum VoucherStatus {
  VERIFIED = "VERIFIED",
  MANUAL = "MANUAL",
}

export interface IVoucherDashboardSummary {
  todayVoucherCount: number;
  monthTotalAmount: number;
  pendingVoucherCount: number;
  aiAverageConfidence: number;
}

export const mockVoucherDashboardSummary: IVoucherDashboardSummary = {
  todayVoucherCount: 10,
  monthTotalAmount: 10000.342,
  pendingVoucherCount: 5,
  aiAverageConfidence: 85,
};

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
  status: VoucherStatus;
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
