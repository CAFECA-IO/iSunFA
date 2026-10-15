import { useState, useRef } from "react";
import { useAuth } from "@/contexts/auth_context";
import { PaymentStatus } from "@/components/common/payment_confirm_modal";
import { requestAssertion } from "@/lib/auth/assertion_client";
import { getLoginOptions } from "@/lib/auth/fido2_client";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import { WalletCustodyType } from "@/constants/auth_provider";
import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { request } from "@/lib/utils/request";
import { IOrderParams } from "@/lib/analysis/pricing";
import { type OrderType } from "@/constants/status";
import { CREDIT_EVENT } from "@/constants/credit_events";
import { publishCreditEvent } from "@/lib/credit_events";

export interface IOrderPayload extends IOrderParams {
  type: OrderType;
}

/**
 * Info: (20261015 - Luphia) 付款成功後交給呼叫端的資料。
 * 個人點數改為 DB 帳本（區塊鏈退役）後沒有交易哈希，`transactionHash` 保留為選填
 * 只為相容既有呼叫端；passkey 帳號另帶回本次確認用的 assertion。
 */
export type IOrderPaymentSuccess = {
  orderId: string;
  transactionHash?: string;
  reportId?: string;
} & Partial<AuthenticationJSON>;

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
    onPaymentSuccess: (authData: IOrderPaymentSuccess) => Promise<void> | void,
  ) => {
    if (executingFlagRef.current) return false;
    executingFlagRef.current = true;

    if (!user) {
      setErrorMessage("請重新登入以獲取付款金鑰");
      setWorkflowStatus("error");
      executingFlagRef.current = false;
      return false;
    }

    setWorkflowStatus("preparing");
    setErrorMessage("");

    // Info: (20261015 - Luphia) 付款前同步一次餘額，避免以過期的點數判斷夠不夠付
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

      return await runPayment(orderId, calculatedCost, onPaymentSuccess);
    } catch (error) {
      console.error("Analysis/Transaction failed:", error);
      const err = error as Error;
      setErrorMessage(err.message || "Payment or Analysis failed");
      setWorkflowStatus("error");
      return false;
    } finally {
      executingFlagRef.current = false;
    }
  };

  /**
   * Info: (20260813 - Luphia) 付款流程本體（自 executeOrderTransaction 抽出，行為不變）。
   *
   * 抽出的理由：碳盤查的無帳本會話由**伺服器**以冪等鍵先建好訂單（設計書 §5.5），
   * 前端只需付那一張，不能再自行建單——另建一張會讓伺服器那張永遠停在待付，
   * 而重送時仍找不到已付訖的訂單。
   *
   * Info: (20261015 - Luphia) 改為伺服器端扣個人點數（區塊鏈退役）：
   * 不再組 UserOp、不再送 bundler，`point_payment` 一次完成扣點與標記 PAID。
   * - 託管帳號：原本就由伺服器代簽，直接送出。
   * - passkey 帳號：仍須以帳戶憑證確認（條款 §3.3）——取一枚 USER_ACTION 的
   *   challengeToken、在裝置上簽它，與用優惠券同一套機制。
   */
  const runPayment = async (
    orderId: string,
    calculatedCost: number,
    onPaymentSuccess: (authData: IOrderPaymentSuccess) => Promise<void> | void,
  ) => {
    if (!user) {
      setErrorMessage("請重新登入以獲取付款金鑰");
      setWorkflowStatus("error");
      return false;
    }
    try {
      let fido2Signature:
        | { authentication: AuthenticationJSON; challengeToken: string }
        | undefined;

      if (user.custody !== WalletCustodyType.CUSTODIAL) {
        setWorkflowStatus("signing_payment");
        const { challenge, token } = await getLoginOptions(
          undefined,
          ChallengePurpose.USER_ACTION,
        );
        if (!token) throw new Error("Failed to obtain a payment challenge");
        const authentication = await requestAssertion({
          challenge,
          custody: user.custody,
          challengeToken: token,
        });
        fido2Signature = { authentication, challengeToken: token };
      }

      setWorkflowStatus("submitting_payment");
      const submitRes = await request<{
        payload: { orderId: string; reportId?: string };
      }>(`/api/v1/user/order/${orderId}/point_payment`, {
        method: "POST",
        body: JSON.stringify(fido2Signature ? { fido2Signature } : {}),
      });

      if (!submitRes || !submitRes.payload) {
        throw new Error("Point payment failed");
      }

      setWorkflowStatus("payment_success");

      /**
       * Info: (20260827 - Luphia) 告訴其他分頁「錢已經進來了」（issue #6714）。
       *
       * 加購點數與升級方案都是從暫停的畫面 `target="_blank"` 開新分頁進來的，
       * 所以付完錢的這一頁**不是**那個在等點數的頁面。少了這一則廣播，
       * 使用者得自己走回去按一次「接著匯入」——而他剛剛就是為了那件事付的錢。
       *
       * 位置在伺服器確認之後：發在送出的那一刻等於廣播一個可能不成立的事實，
       * 而收到的那一頁會據此去花錢。
       */
      publishCreditEvent({ type: CREDIT_EVENT.PAYMENT_SUCCEEDED });

      // Info: (20261015 - Luphia) 扣點已在伺服器同步完成，本地先扣、隨後以 /auth/me 校正
      if (user.credits !== undefined) {
        updateLocalCredits(String(-calculatedCost));
      }

      await onPaymentSuccess({
        orderId,
        reportId: submitRes.payload.reportId,
        ...(fido2Signature?.authentication ?? {}),
      });

      // Info: (20261015 - Luphia) 背景校正餘額（帳本扣點是同步的，不必再等鏈上傳播）
      refreshAuth();
      return true;
    } catch (error) {
      console.error("Analysis/Transaction failed:", error);
      const err = error as Error;
      setErrorMessage(err.message || "Payment or Analysis failed");
      setWorkflowStatus("error");
      return false;
    }
  };

  /**
   * Info: (20260813 - Luphia) 付一張**已存在**的訂單（碳盤查無帳本會話，設計書 §5.5）。
   * 與 executeOrderTransaction 共用同一條付款流程，故託管與 passkey 兩條路徑一致。
   */
  const payExistingOrder = async (
    orderId: string,
    calculatedCost: number,
    onPaymentSuccess: (authData: IOrderPaymentSuccess) => Promise<void> | void,
  ) => {
    if (executingFlagRef.current) return false;
    executingFlagRef.current = true;
    setWorkflowStatus("preparing");
    setErrorMessage("");
    // Info: (20260419 - Luphia) 同 executeOrderTransaction：先同步餘額，避免以過期的點數判斷
    await refreshAuth();
    try {
      return await runPayment(orderId, calculatedCost, onPaymentSuccess);
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
    payExistingOrder,
    setWorkflowStatus,
    setErrorMessage,
    setTxHash,
  };
};
