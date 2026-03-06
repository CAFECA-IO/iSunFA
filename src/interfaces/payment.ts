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
};


export type IOenOrderData = {
    credits: number;
    amount: number;
    paymentId?: string;
    paymentMethodId?: string;
    timestamp?: string;
};

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
    error = "error"
}

export interface IPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (txHash: string) => void;
    amount: number;
    credits: number;
    baseCredits: number;
    bonusCredits: number;
    displayPrice?: string;
    initialStep?: PaymentStep;
    transactionHash?: string;
    orderId?: string | null;
}
