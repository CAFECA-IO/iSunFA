import { IJSONObject } from "@/validators/common";

export type IOenCallbackData = {
    token?: string;
    status?: string;
    card4no?: string;
    cardBrand?: string;
    issuer?: string;
};

export type IOenCallbackPayload = {
    customId?: string;
    token?: string;
    status?: string;
    success?: boolean;
    card4no?: string;
    cardBrand?: string;
    issuer?: string;
    data?: IOenCallbackData;
};

export type IOenOrderData = {
    credits?: number;
    amount?: number;
    paymentId?: string;
    bindingOrderId?: string;
    checkoutResponse?: IJSONObject;
    oenResponse?: IJSONObject;
    chargeResponse?: IJSONObject;
    callbackBody?: IOenCallbackPayload;
    error?: string;
};

export interface IOenCheckoutRequest {
    amount: number;
    credits: number;
    paymentMethodId?: string | null;
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
    initialStep?: "confirm" | "processing" | "success" | "error";
    transactionHash?: string;
    orderId?: string | null;
}
