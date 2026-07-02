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
