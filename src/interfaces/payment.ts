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
  /**
   * Info: (20260820 - Luphia) 變更已排程、**沒有付款**（降級一律於當期屆滿生效）。
   *
   * 不能沿用 `success`：那一頁顯示「已付金額」與點數前後餘額，而這條路徑
   * 一毛錢都沒收。也不能沿用 `error`：排程確實成功了。
   */
  scheduled = "scheduled",
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
   *
   * Info: (20260820 - Luphia) 結果是**可辨識聯集**（self-review 第二輪）：
   * 降級與取消排程沒有東西要付，`PUT /subscription` 回的是 `orderId: null`。
   * 先前這裡宣告成 `{ orderId: string }`，於是付款畫面拿著 null 一路走到
   * `completeCheckout(null, undefined)`——排程其實成功了，而使用者看到付款錯誤。
   * 型別說謊，編譯器就幫不上忙；改成聯集之後「不需付款」是一種必須處理的結果。
   */
  orderCreator?: (paymentMethodId: string) => Promise<
    | { kind: "order"; orderId: string; challenge: string; cost?: number }
    | {
        kind: "scheduled";
        pendingPlanId: string | null;
        effectiveAt: number | null;
      }
  >;
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
