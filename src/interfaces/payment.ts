import type { ReactNode } from "react";
export type IOenCallbackData = {
  success?: boolean;
  purpose?: string;
  merchantId?: string;
  transactionId?: string;
  message?: string | null;
  customId?: string;
  paymentInfo?: string;
  token?: string;
  id?: string;
  code?: string;
  data?: { id: string; authCode: string };
};

export type IOenOrderData = {
  credits: number;
  amount: string;
  paymentId?: string;
  paymentMethodId?: string;
  timestamp?: string;
  planId?: string;
  title?: string;
  billingInterval?: "month" | "year";
  baseCredits?: string;
  bonusCredits?: string;
};

export interface IAIAnalysisOrderFile {
  hash: string;
  name: string;
  journalId?: string;
  voucherId?: string;
  esgRecordId?: string;
}

export interface IAIAnalysisOrderData {
  files?: IAIAnalysisOrderFile[];
  data?: Record<string, unknown> & {
    files?: IAIAnalysisOrderFile[];
  };
  [key: string]: unknown;
}

export interface IOenCheckoutResponse {
  requireBinding: boolean;
  redirectUrl?: string;
  txHash?: string;
  paymentId?: string;
  success?: boolean;
}

export interface IOrderStatusResponse {
  status: string;
  transactionHash?: string;
  errorMessage?: string;
  data?: Partial<IOenOrderData>;
}

export enum PaymentStep {
  confirm = "confirm",
  processing = "processing",
  success = "success",
  error = "error",
  bank_transfer = "bank_transfer",
  bank_transfer_success = "bank_transfer_success",
}

export interface IPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
  amount: string;
  credits: string;
  baseCredits: string;
  bonusCredits: string;
  displayPrice?: string;
  initialStep?: PaymentStep;
  transactionHash?: string;
  orderId?: string | null;
  title?: string;
  planId?: string;
  billingInterval?: "month" | "year";
  details?: string[];
  /**
   * Info: (20260814 - Luphia) 歸屬對象的選擇器（訂閱／購點要指定團隊，設計書 §6.1、§7）。
   * 由 usePurchaseTarget 產生後塞進確認畫面，modal 本身不管它長什麼樣。
   */
  targetSelector?: ReactNode;
  /**
   * Info: (20260814 - Luphia) 改寫建單方式：有值時以它建單（team-scoped 端點，
   * 訂單會帶 teamId），否則沿用預設的 `POST /api/v1/user/order`。
   * 回傳的 orderId + challenge 與預設路徑同形，後續簽章與 checkout 完全共用。
   */
  orderCreator?: (
    paymentMethodId: string,
  ) => Promise<{ orderId: string; challenge: string }>;
  // Info: (20260814 - Luphia) 歸屬對象未備妥（未選團隊 / 權限不足）時的阻擋訊息
  purchaseBlockingMessage?: string | null;
}

export interface IOrderWithMission {
  id: string;
  mission: string | null;
  tokens: number | null;
}

export interface IOrderUpdateTokensParams {
  id: string;
  tokens: number;
}
