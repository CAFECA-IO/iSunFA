"use client";

import { useCallback, useMemo, useState } from "react";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import type { PaymentStatus } from "@/components/common/payment_confirm_modal";
import PaymentSourceSelector, {
  PAYMENT_SOURCE,
  type PaymentSource,
} from "@/components/common/payment_source_selector";
import {
  useOrderTransaction,
  type IOrderPayload,
} from "@/hooks/use_order_transaction";
import { useTeamQuotaPayment } from "@/hooks/use_team_quota_payment";

/**
 * Info: (20260813 - Luphia) 分析類消費的統一付款入口（設計書 §5.6）。
 *
 * 系統裡有 6 個付款呼叫點（物流分析、里程試算、AI 諮詢室、AI 分析報告、
 * 憑證掃描、憑證上傳），原本各自接一次 `useOrderTransaction` + `PaymentConfirmModal`。
 * 後果是「支援團隊額度」變成每個站點都要記得補的事——里程試算就是漏掉的那個。
 *
 * 這支 hook 是 `useOrderTransaction` 的**同介面替換品**：
 * `pay(payload, cost, onPaid)` 與原本的 `executeOrderTransaction` 簽名相同，
 * 內部依所選來源分流（團隊額度免簽章 / 個人點數鏈上簽章），
 * 並回傳一個現成的來源選擇器節點塞進 modal 的 `extraContent`。
 *
 * 因此各站點的遷移是三行改動，而「兩種付款來源」從此是模組的性質，
 * 不再是每個站點各自的功課。
 */

export interface IAnalysisPaymentPaidInfo {
  orderId: string;
  transactionHash?: string;
  reportId?: string;
}

export const useAnalysisPayment = () => {
  const personal = useOrderTransaction();
  const team = useTeamQuotaPayment();
  /**
   * Info: (20260813 - Luphia) 有團隊時預設走團隊額度：免簽章、當場完成，
   * 且用的是團隊已經買下的資源；沒有團隊時選擇器不出現，行為與改版前完全相同。
   */
  const [source, setSource] = useState<PaymentSource>(PAYMENT_SOURCE.TEAM);

  const useTeamSource = team.teams.length > 0 && source === PAYMENT_SOURCE.TEAM;

  const pay = useCallback(
    async (
      orderPayload: IOrderPayload,
      cost: number,
      onPaid: (
        info: IAnalysisPaymentPaidInfo & Partial<AuthenticationJSON>,
      ) => Promise<void> | void,
    ): Promise<boolean> => {
      if (useTeamSource) {
        /**
         * Info: (20260813 - Luphia) 團隊額度付款沒有鏈上交易，因此 onPaid 只帶得到
         * orderId 之外的空值；呼叫端若依賴 transactionHash 需自行容錯
         * （既有站點都只用 orderId / reportId）。
         */
        return team.payWithTeamQuota(
          orderPayload,
          ({ orderId }) => onPaid({ orderId }),
          team.selectedTeamId,
        );
      }
      return personal.executeOrderTransaction(orderPayload, cost, onPaid);
    },
    [useTeamSource, team, personal],
  );

  const reset = useCallback(() => {
    personal.resetTransaction();
    team.reset();
  }, [personal, team]);

  /**
   * Info: (20260813 - Luphia) 把團隊付款的狀態映射成既有 modal 認得的 PaymentStatus，
   * 讓各站點的 modal 一行都不用改。needs_team 刻意映射為 idle：
   * 「還沒選團隊」不是付款失敗，畫面要維持可操作，由選擇器標紅提示。
   */
  const workflowStatus: PaymentStatus = useMemo(() => {
    if (!useTeamSource) return personal.workflowStatus;
    switch (team.status) {
      case "paying":
        return "submitting_payment";
      case "success":
        return "payment_success";
      case "error":
        return "error";
      default:
        return "idle";
    }
  }, [useTeamSource, personal.workflowStatus, team.status]);

  const errorMessage = useTeamSource
    ? team.errorMessage
    : personal.errorMessage;

  const paymentSourceNode = (
    <PaymentSourceSelector
      source={source}
      onSourceChange={setSource}
      teams={team.teams}
      selectedTeamId={team.selectedTeamId}
      onSelectTeam={team.setSelectedTeamId}
      teamBalance={team.teamBalance}
      needsTeamSelection={team.status === "needs_team"}
      disabled={team.status === "paying"}
    />
  );

  return {
    pay,
    reset,
    /**
     * Info: (20260813 - Luphia) 供 PaymentConfirmModal 判斷要不要顯示／套用個人餘額
     * （設計書 §5.6）：團隊額度付款不動個人點數，個人餘額的試算與攔阻都不適用。
     */
    paysWithTeamQuota: useTeamSource,
    /**
     * Info: (20260813 - Luphia) 沿用個人路徑的錯誤設定器：呼叫端用它顯示付款前的
     * 自訂驗證訊息（見 analysis_view）。團隊路徑的錯誤由 hook 內部管理。
     */
    setErrorMessage: personal.setErrorMessage,
    workflowStatus,
    errorMessage,
    txHash: personal.txHash,
    paymentSourceNode,
    source,
    setSource,
  };
};
