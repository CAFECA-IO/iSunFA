"use client";

import { useCallback, useEffect, useState } from "react";
import { request, ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { useAuth } from "@/contexts/auth_context";
import type { IOrderPayload } from "@/hooks/use_order_transaction";

/**
 * Info: (20260813 - Luphia) 以團隊額度支付一筆訂單（設計書 §5.6）。
 *
 * 與個人鏈上點數（useOrderTransaction）的差別是**免簽章**：團隊額度與分配點數都是
 * 離鏈帳本，扣抵在 server 端一次完成，因此這裡只有「建單 → 扣抵」兩步。
 *
 * 付款團隊的歸屬規則也在這裡落實：只屬一個團隊時不必問（送出時不帶 teamId，
 * 由 server 解析）；屬多個團隊時才需要選單——多問一步只為了消除歧義，
 * 而不是每個人每次都要選一遍。
 */

export interface ITeamOption {
  id: string;
  name: string;
}

export type TeamQuotaPaymentStatus =
  | "idle"
  | "paying"
  | "success"
  | "needs_team"
  | "error";

// Info: (20260813 - Luphia) 沿用既有的訂單 payload 型別，兩條付款路徑餵的是同一份資料

export const useTeamQuotaPayment = () => {
  const { user, refreshAuth } = useAuth();
  const [teams, setTeams] = useState<ITeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState<TeamQuotaPaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) {
      setTeams([]);
      return;
    }
    let active = true;
    const fetchTeams = async () => {
      try {
        const response = await request<{ payload: ITeamOption[] | null }>(
          "/api/v1/user/team",
        );
        if (!active) return;
        const list = response.payload ?? [];
        setTeams(list);
        // Info: (20260813 - Luphia) 只有一個團隊就預選它：畫面上仍看得到是哪個團隊付錢，但不必操作
        if (list.length === 1) setSelectedTeamId(list[0].id);
      } catch {
        if (active) setTeams([]);
      }
    };
    fetchTeams();
    return () => {
      active = false;
    };
  }, [user]);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
  }, []);

  /**
   * Info: (20260813 - Luphia) 建單 → 以團隊額度扣抵。
   *
   * `teamId` 省略時由 server 解析（唯一團隊才成立）；多團隊未指定會回
   * TW_TEAM_AMBIGUOUS，此時狀態轉為 needs_team 讓畫面出選單，而不是把它
   * 顯示成一句失敗訊息——那會讓用戶以為功能壞了。
   */
  const payWithTeamQuota = useCallback(
    async (
      orderPayload: IOrderPayload,
      onSuccess: () => Promise<void> | void,
      teamId?: string | null,
    ): Promise<boolean> => {
      setStatus("paying");
      setErrorMessage("");
      try {
        const orderRes = await request<{ payload: { orderId: string } }>(
          "/api/v1/user/order",
          { method: "POST", body: JSON.stringify(orderPayload) },
        );
        const orderId = orderRes?.payload?.orderId;
        if (!orderId) throw new Error("Failed to create order");

        await request(`/api/v1/user/order/${orderId}/team_quota_payment`, {
          method: "POST",
          body: JSON.stringify(teamId ? { teamId } : {}),
        });

        setStatus("success");
        /**
         * Info: (20260813 - Luphia) 付款後同步帳戶狀態：團隊額度付款不動個人點數，
         * 但畫面上的餘額與待付訂單來自同一支 me 端點，不重取會停在付款前的數字。
         */
        await refreshAuth();
        await onSuccess();
        return true;
      } catch (error) {
        if (error instanceof RequestApiError) {
          const body = error.data as { errorCode?: string } | undefined;
          if (body?.errorCode === API_ERRORS.TW_TEAM_AMBIGUOUS.code) {
            setStatus("needs_team");
            return false;
          }
        }
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Team quota payment failed",
        );
        return false;
      }
    },
    [refreshAuth],
  );

  return {
    teams,
    selectedTeamId,
    setSelectedTeamId,
    status,
    errorMessage,
    reset,
    payWithTeamQuota,
  };
};
