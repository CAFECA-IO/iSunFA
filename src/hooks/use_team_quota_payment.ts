"use client";

import { useCallback, useEffect, useState } from "react";
import { request, ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { useAuth } from "@/contexts/auth_context";
import type { IOrderPayload } from "@/hooks/use_order_transaction";
import type {
  ITeamSubscriptionView,
  ITeamWalletView,
} from "@/interfaces/team_wallet";

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

/**
 * Info: (20260813 - Luphia) 選定團隊後的可用餘額：訂閱額度雙視窗 + 我的分配點數。
 * 兩者都要——扣抵是先額度後點數（物流碳足跡相反），只看其中一邊會誤判付不付得起。
 */
export interface ITeamBalance {
  quota5h: { limit: string; used: string; resetAt: number };
  quotaWeek: { limit: string; used: string; resetAt: number };
  allocationBalance: string;
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
  const [teamBalance, setTeamBalance] = useState<ITeamBalance | null>(null);
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

  /**
   * Info: (20260813 - Luphia) 選定團隊後取該團隊的可用餘額：
   * 付款前看不到餘額，就只能按下去才知道夠不夠——而不夠的後果是一張待付訂單。
   * 訂閱額度與分配點數分屬兩支端點（設計書 §7），兩者都要才算得出可用量。
   */
  useEffect(() => {
    if (!selectedTeamId) {
      setTeamBalance(null);
      return;
    }
    let active = true;
    const fetchBalance = async () => {
      try {
        const [subscription, wallet] = await Promise.all([
          request<{ payload: ITeamSubscriptionView | null }>(
            `/api/v1/user/team/${selectedTeamId}/subscription`,
          ),
          request<{ payload: ITeamWalletView | null }>(
            `/api/v1/user/team/${selectedTeamId}/wallet`,
          ),
        ]);
        if (!active) return;
        const quota = subscription.payload?.quota;
        if (!quota) {
          setTeamBalance(null);
          return;
        }
        setTeamBalance({
          quota5h: quota.quota5h,
          quotaWeek: quota.quotaWeek,
          allocationBalance: wallet.payload?.myAllocationBalance ?? "0",
        });
      } catch {
        // Info: (20260813 - Luphia) 餘額是輔助資訊，取不到就不顯示，不擋住付款
        if (active) setTeamBalance(null);
      }
    };
    fetchBalance();
    return () => {
      active = false;
    };
  }, [selectedTeamId]);

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
      // Info: (20260813 - Luphia) 帶回 orderId：呼叫端（如里程試算）以它輪詢結果
      onSuccess: (info: { orderId: string }) => Promise<void> | void,
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
        await onSuccess({ orderId });
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
    teamBalance,
    selectedTeamId,
    setSelectedTeamId,
    status,
    errorMessage,
    reset,
    payWithTeamQuota,
  };
};
