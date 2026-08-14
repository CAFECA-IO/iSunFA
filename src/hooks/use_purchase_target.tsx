"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { HTTP_METHOD } from "@/constants/http";
import { resolveSubscriptionAmount } from "@/lib/billing/seat_billing";
import {
  BLOCKING_REASON,
  PURCHASE_MODE,
  filterEligibleTeams,
  resolveBlockingReason,
  resolvePurchaseMode,
} from "@/lib/purchase/purchase_target";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import PurchaseTargetSelector, {
  PURCHASE_TARGET,
  type PurchaseTarget,
} from "@/components/pricing/purchase_target_selector";

/**
 * Info: (20260814 - Luphia) 訂閱 / 購點的歸屬對象（設計書 §6.1、§7）。
 *
 * 在此之前，定價頁的訂閱與購點都打同一支 `POST /api/v1/user/order`，訂單裡沒有團隊欄位。
 * 後果不是「無法選團隊」這麼輕——訂閱訂單因為不是 `BILLING_SUBSCRIBE`、也沒有 teamId，
 * 履行時會落到「鑄造個人點數」那條 fallback：用戶付了訂閱費，拿到等值個人點數，
 * 團隊方案一秒都沒生效，而畫面顯示付款成功。
 *
 * 這支 hook 讓歸屬對象成為建單的一部分：選定團隊後改走 team-scoped 端點
 * （`PUT /team/{id}/subscription`、`POST /team/{id}/wallet/purchase`），
 * 兩者都會把 teamId 寫進訂單，履行路徑才認得。
 */

export interface IPurchaseContext {
  // Info: (20260814 - Luphia) 訂閱方案 id（team / business）；購點時為空字串
  planId: string;
  billingInterval?: "month" | "year";
  // Info: (20260814 - Luphia) 點數包 id（tier1–tier6）；訂閱時為 undefined
  creditPlanId?: string;
  // Info: (20260814 - Luphia) 訂閱單價（單一席次），用於在付款前揭露「席次 × 單價」
  unitPrice?: number;
}

export interface IPurchaseOrderResult {
  orderId: string;
  challenge: string;
}

interface ITeamListItem {
  id: string;
  name: string;
  role: string | null;
  // Info: (20260814 - Luphia) 團隊人數＝席次數，訂閱金額為「席次 × 單價」（規範 P2）
  memberCount?: number;
}

export const usePurchaseTarget = (context: IPurchaseContext) => {
  const { user, sessionExpired } = useAuth();
  /**
   * Info: (20260814 - Luphia) 從團隊頁的「購買點數 / 管理方案」過來時會帶 `?team=`：
   * 那個人已經表明要買給哪個團隊，再問一次只是多一步，而且選錯就買到別人帳上。
   */
  const searchParams = useSearchParams();
  const presetTeamId = searchParams?.get("team") ?? null;
  const { t } = useTranslation();
  const [teams, setTeams] = useState<ITeamListItem[]>([]);
  /**
   * Info: (20260814 - Luphia) 團隊清單的載入狀態。
   *
   * 原本查詢失敗一律 `setTeams([])`，於是「登入過期」「網路失敗」「你真的沒有團隊」
   * 三件事在畫面上長得一模一樣——團隊按鈕靜靜停用、點了沒反應。
   * 使用者實測就是這樣被卡住的（登入過期，但畫面只說得出「沒有團隊」）。
   */
  const [teamsStatus, setTeamsStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [target, setTarget] = useState<PurchaseTarget>(
    PURCHASE_TARGET.PERSONAL,
  );

  // Info: (20260814 - Luphia) 規則收斂在 lib/purchase/purchase_target（可單測）
  const mode = resolvePurchaseMode(context.planId, context.creditPlanId);
  const isSubscription = mode === PURCHASE_MODE.SUBSCRIPTION;
  const isActive = mode !== PURCHASE_MODE.NONE;

  useEffect(() => {
    if (!user) {
      setTeams([]);
      setTeamsStatus("ready");
      return;
    }
    let active = true;
    setTeamsStatus("loading");
    const fetchTeams = async () => {
      try {
        const response = await request<{ payload: ITeamListItem[] | null }>(
          "/api/v1/user/team",
        );
        if (!active) return;
        setTeams(response.payload ?? []);
        setTeamsStatus("ready");
      } catch {
        // Info: (20260814 - Luphia) 失敗就說失敗，不要偽裝成「沒有團隊」
        if (!active) return;
        setTeams([]);
        setTeamsStatus("error");
      }
    };
    fetchTeams();
    return () => {
      active = false;
    };
  }, [user, reloadToken]);

  // Info: (20260814 - Luphia) 供畫面重試（網路抖動不該讓人只能重整整頁）
  const reloadTeams = useCallback(() => setReloadToken((n) => n + 1), []);

  const eligibleTeams = useMemo(
    () => filterEligibleTeams(teams, mode),
    [teams, mode],
  );

  useEffect(() => {
    // Info: (20260814 - Luphia) 訂閱沒有個人選項，切換方案時要把 target 拉回團隊
    setTarget(isSubscription ? PURCHASE_TARGET.TEAM : PURCHASE_TARGET.PERSONAL);
  }, [isSubscription]);

  useEffect(() => {
    // Info: (20260814 - Luphia) 只有一個可用團隊就預選，多一步選擇沒有資訊量
    if (eligibleTeams.length === 1) setSelectedTeamId(eligibleTeams[0].id);
  }, [eligibleTeams]);

  useEffect(() => {
    /**
     * Info: (20260814 - Luphia) 網址指定的團隊只在「確實有資格」時採用：
     * 帶著沒有權限的 teamId 進來不該讓畫面看起來可以付款，
     * 那只會把失敗延後到扣款那一刻。
     */
    if (!presetTeamId || !isActive) return;
    if (!eligibleTeams.some((team) => team.id === presetTeamId)) return;
    setSelectedTeamId(presetTeamId);
    setTarget(PURCHASE_TARGET.TEAM);
  }, [presetTeamId, eligibleTeams, isActive]);

  const usesTeam = target === PURCHASE_TARGET.TEAM;

  /**
   * Info: (20260814 - Luphia) 沒有團隊可選時，說出**是哪一種**沒有：
   * 還在載入、載入失敗、登入過期、或真的沒有符合權限的團隊。
   * 這四種的下一步完全不同（等一下／重試／重新登入／請團隊擁有者操作）。
   */
  const unavailableHint = useMemo(() => {
    if (!isActive || !usesTeam || eligibleTeams.length > 0) return null;
    if (sessionExpired) return t("purchase_target.session_expired");
    if (teamsStatus === "loading") return t("purchase_target.teams_loading");
    if (teamsStatus === "error") return t("purchase_target.teams_failed");
    return isSubscription
      ? t("purchase_target.no_owner_team")
      : t("purchase_target.no_manager_team");
  }, [
    isActive,
    usesTeam,
    eligibleTeams.length,
    isSubscription,
    sessionExpired,
    teamsStatus,
    t,
  ]);

  // Info: (20260814 - Luphia) 阻擋與否由純函式判定，畫面只負責把理由翻成句子

  /**
   * Info: (20260814 - Luphia) 尚未備妥就不讓送出：訂閱沒選團隊而放行，
   * 等於製造一張沒有歸屬的訂單——那正是這次要消滅的東西。
   */
  const blockingMessage = useMemo(() => {
    const reason = resolveBlockingReason({
      mode,
      usesTeam,
      eligibleTeamCount: eligibleTeams.length,
      selectedTeamId,
    });
    if (!reason) return null;
    return reason === BLOCKING_REASON.NO_ELIGIBLE_TEAM
      ? unavailableHint
      : t("purchase_target.team_required");
  }, [
    mode,
    usesTeam,
    eligibleTeams.length,
    selectedTeamId,
    unavailableHint,
    t,
  ]);

  /**
   * Info: (20260814 - Luphia) 團隊歸屬時改由 team-scoped 端點建單（回傳同樣的
   * orderId + challenge，後續簽章與 checkout 一步都不用改）；個人歸屬回傳 undefined，
   * 由 modal 沿用原本的 `POST /api/v1/user/order`。
   */
  const orderCreator = useMemo(() => {
    if (!isActive || !usesTeam || !selectedTeamId) return undefined;
    return async (paymentMethodId: string): Promise<IPurchaseOrderResult> => {
      if (isSubscription) {
        const response = await request<{
          payload: IPurchaseOrderResult | null;
        }>(`/api/v1/user/team/${selectedTeamId}/subscription`, {
          method: HTTP_METHOD.PUT,
          body: JSON.stringify({
            planId: context.planId,
            billingInterval: context.billingInterval ?? "month",
            paymentMethodId,
          }),
        });
        if (!response.payload) throw new Error("Failed to create order");
        return response.payload;
      }

      const response = await request<{ payload: IPurchaseOrderResult | null }>(
        `/api/v1/user/team/${selectedTeamId}/wallet/purchase`,
        {
          method: HTTP_METHOD.POST,
          body: JSON.stringify({
            creditPlanId: context.creditPlanId,
            paymentMethodId,
          }),
        },
      );
      if (!response.payload) throw new Error("Failed to create order");
      return response.payload;
    };
  }, [
    isActive,
    usesTeam,
    selectedTeamId,
    isSubscription,
    context.planId,
    context.billingInterval,
    context.creditPlanId,
  ]);

  const selectedTeam = useMemo(
    () => eligibleTeams.find((team) => team.id === selectedTeamId) ?? null,
    [eligibleTeams, selectedTeamId],
  );

  /**
   * Info: (20260814 - Luphia) 訂閱以「席次 × 單價」計費（規範 P2）。
   * 這裡算出來的金額只用於**付款前揭露**——真正的收費金額由 server 依當下人數計算，
   * 兩者若因為期間有人加入而有落差，以 server 為準。
   */
  const seatCount = isSubscription ? (selectedTeam?.memberCount ?? null) : null;
  const seatAmount =
    isSubscription && seatCount !== null && context.unitPrice
      ? resolveSubscriptionAmount(context.unitPrice, seatCount)
      : null;

  const targetNode = !isActive ? null : (
    <PurchaseTargetSelector
      target={target}
      onTargetChange={setTarget}
      teams={eligibleTeams}
      selectedTeamId={selectedTeamId}
      onSelectTeam={setSelectedTeamId}
      allowPersonal={!isSubscription}
      unavailableHint={unavailableHint}
      onRetryTeams={teamsStatus === "error" ? reloadTeams : undefined}
      seatCount={seatCount}
      unitPrice={context.unitPrice ?? null}
      seatAmount={seatAmount}
    />
  );

  const reset = useCallback(() => {
    setTarget(isSubscription ? PURCHASE_TARGET.TEAM : PURCHASE_TARGET.PERSONAL);
  }, [isSubscription]);

  return {
    targetNode,
    orderCreator,
    blockingMessage,
    reset,
    target,
    selectedTeamId,
    /**
     * Info: (20260814 - Luphia) 供付款畫面顯示實際金額：選定團隊的訂閱是
     * 「席次 × 單價」，沿用方案卡上的單價會少報一大截。
     */
    seatCount,
    seatAmount,
  };
};
