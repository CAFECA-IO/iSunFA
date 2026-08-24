"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { HTTP_METHOD } from "@/constants/http";
import { resolveSubscriptionAmount } from "@/lib/billing/seat_billing";
import { SUBSCRIPTION_EXTENSION_WINDOW_DAYS } from "@/constants/subscription_quota";
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

/**
 * Info: (20260820 - Luphia) 建單的結果有**兩種**，而型別必須說得出來（self-review 第二輪）。
 *
 * `PUT /subscription` 對降級與取消排程回的是 `orderId: null`——沒有東西要付。
 * 先前的型別把 `orderId` 宣告成 `string`，於是付款畫面拿著 null 一路走到
 * `completeCheckout(null, undefined)`：**排程其實成功了，而使用者看到付款錯誤。**
 * 型別說謊，所以編譯器幫不上忙。
 *
 * 改成可辨識聯集之後，「不需要付款」是一種必須被處理的結果，而不是一個
 * 恰好為 null 的欄位。
 */
export type IPurchaseOutcome =
  | {
      kind: "order";
      orderId: string;
      challenge: string;
      /**
       * Info: (20260817 - Luphia) server 實際建單的金額（PR #6652 第二輪 C-4）。
       *
       * 付款畫面顯示的席次金額是前端用**頁面載入時**的人數算的，實收由建單當下
       * 的 `countMembers()` 重算——中間有人加入，使用者看到 4,200、卡被扣 5,040。
       */
      cost?: number;
    }
  | {
      kind: "scheduled";
      // Info: (20260820 - Luphia) 排程中的目標方案與生效時點（epoch 秒）
      pendingPlanId: string | null;
      effectiveAt: number | null;
    };

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

  /**
   * Info: (20260820 - Luphia) 選定團隊後查當期期末，用於**付款前的展延揭露**
   *（產品決定 20260820：不設預付上限，但要明確告知）。
   *
   * 付款履行改為展延（`applyTeamSubscriptionInTx`）：當期還沒結束時，新購期間
   * 自**當期屆滿日**起算並累加。使用者需要在付款前就知道這件事——否則
   * 「我今天付錢，是不是從今天算起？」只能靠事後看訂閱頁推斷。
   *
   * 查 `GET /subscription` 而不是把期末塞進團隊清單：那支端點本來就回這個欄位，
   * 而團隊清單是所有購買情境共用的（購點也用），為一個訂閱專屬的揭露改它的
   * 契約不划算。失敗就不顯示揭露——寧可少一行字，不要顯示一個猜的日期。
   */
  const [periodEndSec, setPeriodEndSec] = useState<number | null>(null);
  /**
   * Info: (20260821 - Luphia) 剩餘超過 30 天＝展延閘門會擋（產品裁定 20260821）。
   * 在 effect 裡與 periodEndSec 一起算好（render 期不能呼叫 Date.now()），
   * 付款前就把「暫不開放購買延長」講出來，而不是讓使用者填完卡號才看到錯誤。
   *
   * Info: (20260821 - Luphia) 閘門只管**同方案**的延長（review #6687 三輪）：
   * 換方案走折抵、隨時可買，那條路徑要顯示的是折抵的說明而不是「暫不開放」。
   */
  const [extensionTooEarly, setExtensionTooEarly] = useState(false);
  /**
   * Info: (20260821 - Luphia) 這次購買是不是**換方案**（升級）。
   * 換方案的舊期剩餘會按已付價值折抵成新方案天數（`resolveNextPeriod`），
   * 而那件事必須在付款前說——使用者最想知道的就是「我剩下的天數會怎樣」。
   */
  const [isPlanChange, setIsPlanChange] = useState(false);
  /**
   * Info: (20260820 - Luphia) 排程中的降級也要在付款前說（同一趟查詢就有）。
   *
   * 購買會取代排程——排程一律在**履行**時被 `applyTeamSubscriptionInTx` 清掉
   * （20260821 起延長也一樣，不再於建單前取消：訂單沒付掉時排程必須還在）。
   * 沒有這行揭露，就不會有任何畫面提到那個排程將要消失，而使用者是刻意排定它的。
   */
  const [pending, setPending] = useState<{
    planId: string;
    effectiveAt: number;
  } | null>(null);
  useEffect(() => {
    if (!isSubscription || !selectedTeamId) {
      setPeriodEndSec(null);
      setExtensionTooEarly(false);
      setIsPlanChange(false);
      setPending(null);
      return undefined;
    }
    let active = true;
    request<{
      payload: {
        planId?: string;
        currentPeriodEnd?: number;
        pendingPlanId?: string | null;
        pendingEffectiveAt?: number | null;
      } | null;
    }>(`/api/v1/user/team/${selectedTeamId}/subscription`)
      .then((response) => {
        if (!active) return;
        const end = response.payload?.currentPeriodEnd ?? 0;
        const periodActive = end * 1000 > Date.now();
        // Info: (20260820 - Luphia) 當期已結束（或沒有訂閱）就不是展延，不必揭露
        setPeriodEndSec(periodActive ? end : null);
        /**
         * Info: (20260821 - Luphia) 換方案＝當期有效方案與這次要買的不同。
         * `GET /subscription` 的 `planId` 已是折算後的有效方案（過期回 free），
         * 因此過期戶不會被誤判成換方案——那是重新訂閱。
         */
        const changingPlan =
          periodActive && (response.payload?.planId ?? "") !== context.planId;
        setIsPlanChange(changingPlan);
        // Info: (20260821 - Luphia) 閘門只擋同方案的延長，換方案不受限
        setExtensionTooEarly(
          !changingPlan &&
            end * 1000 - Date.now() >
              SUBSCRIPTION_EXTENSION_WINDOW_DAYS * 86_400_000,
        );
        const pendingPlanId = response.payload?.pendingPlanId ?? null;
        const effectiveAt = response.payload?.pendingEffectiveAt ?? null;
        setPending(
          pendingPlanId && effectiveAt
            ? { planId: pendingPlanId, effectiveAt }
            : null,
        );
      })
      .catch(() => {
        if (!active) return;
        setPeriodEndSec(null);
        setExtensionTooEarly(false);
        setIsPlanChange(false);
        setPending(null);
      });
    return () => {
      active = false;
    };
    // Info: (20260821 - Luphia) 換方案的判斷要跟著使用者選的方案重算
  }, [isSubscription, selectedTeamId, context.planId]);

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

  /**
   * Info: (20260817 - Luphia) 合格名單變動後，清掉已不合格的選擇（PR #6652 第二輪 C-3）。
   *
   * 買點數時選了以 ADMIN 身分合格的 T3，切到訂閱（只有 OWNER 合格）之後，
   * 那個 id 會留在 state 裡：下拉框找不到對應選項而顯示空白，
   * `selectedTeam` 為 null 讓席次金額退回單席價，而送出鈕看起來是啟用的。
   *
   * 送出鈕本身另有 `resolveBlockingReason` 把關（它也會檢查合格性），
   * 這個 effect 負責的是**畫面**：不要留一個選不到、也看不出來的選擇在那裡。
   */
  useEffect(() => {
    if (!selectedTeamId) return;
    if (eligibleTeams.some((team) => team.id === selectedTeamId)) return;
    setSelectedTeamId(null);
  }, [eligibleTeams, selectedTeamId]);

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
  const eligibleTeamIds = useMemo(
    () => eligibleTeams.map((team) => team.id),
    [eligibleTeams],
  );

  const blockingMessage = useMemo(() => {
    const reason = resolveBlockingReason({
      mode,
      usesTeam,
      eligibleTeamIds,
      selectedTeamId,
    });
    if (!reason) return null;
    return reason === BLOCKING_REASON.NO_ELIGIBLE_TEAM
      ? unavailableHint
      : t("purchase_target.team_required");
  }, [mode, usesTeam, eligibleTeamIds, selectedTeamId, unavailableHint, t]);

  /**
   * Info: (20260814 - Luphia) 團隊歸屬時改由 team-scoped 端點建單（回傳同樣的
   * orderId + challenge，後續簽章與 checkout 一步都不用改）；個人歸屬回傳 undefined，
   * 由 modal 沿用原本的 `POST /api/v1/user/order`。
   */
  const orderCreator = useMemo(() => {
    if (!isActive || !usesTeam || !selectedTeamId) return undefined;
    return async (paymentMethodId: string): Promise<IPurchaseOutcome> => {
      if (isSubscription) {
        const response = await request<{
          payload: {
            kind: "order" | "scheduled";
            orderId?: string | null;
            challenge?: string;
            cost?: number;
            pendingPlanId?: string | null;
            effectiveAt?: number | null;
          } | null;
        }>(`/api/v1/user/team/${selectedTeamId}/subscription`, {
          method: HTTP_METHOD.PUT,
          body: JSON.stringify({
            planId: context.planId,
            billingInterval: context.billingInterval ?? "month",
            paymentMethodId,
          }),
        });
        if (!response.payload) throw new Error("Failed to create order");
        /**
         * Info: (20260821 - Luphia) 直接讀 server 的 `kind`（簡化 20260821）。
         *
         * 先前這裡是「`orderId` 是不是 null」的推斷——而 server 端也已改成
         * 可辨識聯集，兩邊各自推斷同一件事只是多一個會不一致的地方。
         */
        if (response.payload.kind === "scheduled") {
          return {
            kind: "scheduled",
            pendingPlanId: response.payload.pendingPlanId ?? null,
            effectiveAt: response.payload.effectiveAt ?? null,
          };
        }
        return {
          kind: "order",
          orderId: response.payload.orderId ?? "",
          challenge: response.payload.challenge ?? "",
          cost: response.payload.cost,
        };
      }

      const response = await request<{
        payload: { orderId: string; challenge: string; cost?: number } | null;
      }>(`/api/v1/user/team/${selectedTeamId}/wallet/purchase`, {
        method: HTTP_METHOD.POST,
        body: JSON.stringify({
          creditPlanId: context.creditPlanId,
          paymentMethodId,
        }),
      });
      if (!response.payload) throw new Error("Failed to create order");
      return {
        kind: "order",
        orderId: response.payload.orderId,
        challenge: response.payload.challenge,
        cost: response.payload.cost,
      };
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
      extensionPeriodEndSec={periodEndSec}
      extensionTooEarly={extensionTooEarly}
      isPlanChange={isPlanChange}
      pendingPlanId={pending?.planId ?? null}
      pendingEffectiveAt={pending?.effectiveAt ?? null}
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
