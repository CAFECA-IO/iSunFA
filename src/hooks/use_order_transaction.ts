import { useState, useRef } from "react";
import { useAuth } from "@/contexts/auth_context";
import { PaymentStatus } from "@/components/common/payment_confirm_modal";
import { fido2ClientService } from "@/lib/auth/fido2_client";
import {
  encodeWebAuthnSignature,
  hexToBase64Url,
} from "@/lib/auth/crypto_utils";
import { prepareTransferUserOp } from "@/lib/utils/user_op_builder";
import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { request } from "@/lib/utils/request";
import { IOrderParams } from "@/lib/analysis/pricing";
import { type OrderType } from "@/constants/status";

export interface IOrderPayload extends IOrderParams {
  type: OrderType;
}

export const useOrderTransaction = () => {
  const [workflowStatus, setWorkflowStatus] = useState<PaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const { user, refreshAuth, updateLocalCredits } = useAuth();

  // Info: (20260417 - Luphia) Prevent React double-click async execution bugs
  const executingFlagRef = useRef(false);

  const resetTransaction = () => {
    setWorkflowStatus("idle");
    setErrorMessage("");
    setTxHash("");
    executingFlagRef.current = false;
  };

  const executeOrderTransaction = async (
    orderPayload: IOrderPayload,
    calculatedCost: number,
    onPaymentSuccess: (
      authData: {
        orderId: string;
        transactionHash: string;
        reportId?: string;
      } & AuthenticationJSON,
    ) => Promise<void> | void,
  ) => {
    if (executingFlagRef.current) return false;
    executingFlagRef.current = true;

    if (!user?.address || !user?.pubKeyX || !user?.pubKeyY) {
      setErrorMessage("請重新登入以獲取付款金鑰");
      setWorkflowStatus("error");
      executingFlagRef.current = false;
      return false;
    }

    setWorkflowStatus("preparing");
    setErrorMessage("");

    // Info: (2026/04/19) 即時向後端同步已建立的訂單 Pending 點數，避免餘額顯示錯誤
    await refreshAuth();

    try {
      const payloadString = JSON.stringify(orderPayload);

      // Info: (20260209 - Tzuhan) 1. 取得 orderId
      const orderRes = await request<{
        payload: { orderId: string; challenge: string };
      }>("/api/v1/user/order", {
        method: "POST",
        body: payloadString,
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

      // Info: (20260417 - Luphia) 5. 提交至背景處理 API
      setWorkflowStatus("submitting_payment");
      const submitRes = await request<{
        payload: { txHash: string; orderId: string; reportId?: string };
      }>(`/api/v1/user/order/${orderId}/blockchain_payment`, {
        method: "POST",
        body: JSON.stringify({
          userOp: { ...userOp, signature: encodedSignature },
          signature: encodedSignature,
          authentication: transferAuth,
        }),
      });

      if (!submitRes || !submitRes.payload) {
        throw new Error("Token transfer dispatch failed");
      }

      const transactionHash = submitRes.payload.txHash;
      setTxHash(transactionHash || "");

      // Info: (20260417 - Luphia) 6. 分析請求已在背景產生 (呼叫 callback 處理 UI 刷新)
      setWorkflowStatus("payment_success");

      // Info: (20260419 - Agent) Optimistic UI Update to hide alt-mempool fetch latency
      if (user?.credits !== undefined) {
        updateLocalCredits(String(-calculatedCost));
      }

      await onPaymentSuccess({
        orderId,
        transactionHash,
        reportId: submitRes.payload?.reportId,
        ...transferAuth,
      });

      // Info: (20260209 - Tzuhan) 7. Refresh user balance from chain (may take seconds to propagate)
      // Info: (20260419 - Luphia) Call it in the background instead of awaiting so UI doesn't freeze
      setTimeout(() => {
        refreshAuth();
      }, 5000);
      return true;
    } catch (error) {
      console.error("Analysis/Transaction failed:", error);
      const err = error as Error;
      setErrorMessage(err.message || "Payment or Analysis failed");
      setWorkflowStatus("error");
      executingFlagRef.current = false;
      return false;
    } finally {
      executingFlagRef.current = false;
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
