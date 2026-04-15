import { useState } from "react";
import { useAuth } from "@/contexts/auth_context";
import { PaymentStatus } from "@/components/common/payment_confirm_modal";
import { fido2ClientService } from "@/lib/auth/fido2_client";
import {
  encodeWebAuthnSignature,
  hexToBase64Url,
} from "@/lib/auth/crypto_utils";
import {
  prepareTransferUserOp,
  submitSignedUserOp,
} from "@/services/token.service";
import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { request } from "@/lib/utils/request";

export interface IOrderPayload {
  category: string;
  periodType: string;
  year: number;
  periodValue: string;
  country?: string;
  keyword?: string;
  isExternal?: boolean;
  items: {
    name: string;
    unitPrice: number;
    quantity: number;
  }[];
}

export const useOrderTransaction = () => {
  const [workflowStatus, setWorkflowStatus] = useState<PaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const { user, refreshAuth } = useAuth();

  const resetTransaction = () => {
    setWorkflowStatus("idle");
    setErrorMessage("");
    setTxHash("");
  };

  const executeOrderTransaction = async (
    orderPayload: IOrderPayload,
    calculatedCost: number,
    onPaymentSuccess: (
      authData: {
        orderId: string;
        transactionHash: string;
      } & AuthenticationJSON,
    ) => Promise<void>,
  ) => {
    if (!user?.address || !user?.pubKeyX || !user?.pubKeyY) {
      setErrorMessage("請重新登入以獲取付款金鑰");
      setWorkflowStatus("error");
      return false;
    }

    setWorkflowStatus("preparing");
    setErrorMessage("");

    try {
      // Info: (20260209 - Tzuhan) 1. 取得 orderId
      const orderRes = await request<{
        payload: { orderId: string; challenge: string };
      }>("/api/v1/user/order", {
        method: "POST",
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes?.payload) throw new Error("Failed to create order");
      const { orderId } = orderRes.payload;

      // Info: (20260209 - Tzuhan) 2. 準備轉帳 UserOp
      const prepRes = await prepareTransferUserOp(
        user.address,
        calculatedCost,
        orderId,
      );
      if (!prepRes.success || !prepRes.data) {
        throw new Error(prepRes.message || "Failed to prepare transfer");
      }
      const { userOp, userOpHash } = prepRes.data;

      // Info: (20260209 - Tzuhan) 3. 簽署 (Client FIDO2)
      setWorkflowStatus("signing_payment");
      const challengeBase64 = hexToBase64Url(userOpHash);
      const transferAuth: AuthenticationJSON =
        await fido2ClientService.startLogin({
          challenge: challengeBase64,
          timeout: 60000,
          userVerification: "required",
          allowCredentials: [],
        });

      // Info: (20260209 - Tzuhan) 4. 編碼簽名
      const encodedSignature = encodeWebAuthnSignature(
        transferAuth,
        BigInt(user.pubKeyX),
        BigInt(user.pubKeyY),
      );

      // Info: (20260209 - Tzuhan) 5. 提交已簽署的 UserOp
      setWorkflowStatus("submitting_payment");
      const submitRes = await submitSignedUserOp({
        ...userOp,
        signature: encodedSignature,
      });

      if (!submitRes.success) {
        throw new Error(submitRes.message || "Token transfer failed");
      }

      const transactionHash = (submitRes.data as { tx: string })?.tx;
      setTxHash(transactionHash || "");

      // Info: (20260209 - Tzuhan) 6. 提交分析請求 (呼叫 callback 處理)
      setWorkflowStatus("payment_success");
      await onPaymentSuccess({
        orderId,
        transactionHash,
        ...transferAuth,
      });

      // Info: (20260209 - Tzuhan) 7. Refresh user balance
      await refreshAuth();
      return true;
    } catch (error) {
      console.error("Analysis/Transaction failed:", error);
      const err = error as Error;
      setErrorMessage(err.message || "Payment or Analysis failed");
      setWorkflowStatus("error");
      return false;
    }
  };

  return {
    workflowStatus,
    errorMessage,
    txHash,
    resetTransaction,
    executeOrderTransaction,
    setWorkflowStatus,
    setErrorMessage,
    setTxHash,
  };
};
