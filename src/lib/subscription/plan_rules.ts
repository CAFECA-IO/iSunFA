import {
  PLAN_RANK,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
  TeamPlanId,
} from "@/constants/subscription_quota";
import type { ISubscriptionCardMetadata } from "@/lib/subscription/subscription_card";

/**
 * Info: (20260819 - Luphia) 方案判斷的**全部**純規則，一個檔案。
 *
 * 這些規則原本散在兩個地方：`spend.service` 有 `resolvePlanId` / `resolveEffectivePlanId`
 * （扣費側用），而顯示側另有一組。收斂到這裡的理由不是整齊，是**只能有一個判斷點**：
 * 「什麼是有效方案」若在服務層各判一次，畫面說團隊版而額度按免費版扣的那一天不會有人發現。
 *
 * 這一層刻意只依賴 constants：`plan_rules` 會被 client component 匯入（方案頁），
 * 一旦碰到 repository 或 viem，那個頁面就打包不起來。
 *
 * 從儲存體**讀出**方案是 `services/plan.service.ts` 的事（DB + 鏈上），這裡只做折算。
 *
 * Info: (20260820 - Luphia) 方案的**高低次序**（`PLAN_RANK`）住在
 * `constants/subscription_quota.ts`，不在這裡：它是方案列舉本身的屬性，
 * 而升／降級的判斷（`isPlanDowngrade`，決定降級於期末才生效）也讀同一份。
 * 本檔改為匯入——同一組次序若有兩份定義，兩邊遲早分岔，而分岔的後果是
 * 「這次算不算降級」在顯示側與計費側得到不同答案。
 */

/**
 * Info: (20260819 - Luphia) 字串是不是已知的團隊方案。
 *
 * 認不出來的值一律排除，**不當成免費版**：DB 的 `plan_id` 是自由字串欄位，
 * 哪天多出一個新方案代號，把它當免費版會讓付費戶在畫面上看到「免費版」；
 * 排除只是不標記——錯的方向差很多。
 *
 * 注意這與 `resolvePlanId` 的方向相反，而兩者都對：**扣費**遇到不認識的代號必須
 * fail-closed 到最小額度（不能因資料異常放大額度），**顯示**遇到不認識的代號
 * 則寧可不說，而不是說一個已知為錯的答案。
 */
export function isTeamPlanId(value: string): value is TeamPlanId {
  return (Object.values(TEAM_PLAN) as string[]).includes(value);
}

/**
 * Info: (20260807 - Luphia) 方案解析採 fail-closed：查無訂閱或未知 planId 一律視為 free，
 * 絕不因資料異常放大額度。
 */
export function resolvePlanId(planId: string | undefined): TeamPlanId {
  const known = Object.values(TEAM_PLAN) as string[];
  if (planId && known.includes(planId)) return planId as TeamPlanId;
  return TEAM_PLAN.FREE;
}

/**
 * Info: (20260807 - Luphia) 有效方案 = 方案 ID + 訂閱狀態 + 計費週期三者同時成立，
 * 缺一即 fail-closed 到 free——即使續訂 Worker 尚未跑到，過期訂閱也不會多放一點額度。
 */
export function resolveEffectivePlanId(
  subscription: {
    planId: string;
    status: string;
    currentPeriodEnd: Date;
  } | null,
  nowSec: number,
): TeamPlanId {
  if (!subscription) return TEAM_PLAN.FREE;
  const planId = resolvePlanId(subscription.planId);
  if (planId === TEAM_PLAN.FREE) return TEAM_PLAN.FREE;
  const isActive = subscription.status === TEAM_SUBSCRIPTION_STATUS.ACTIVE;
  const inPeriod =
    Math.floor(subscription.currentPeriodEnd.getTime() / 1000) >= nowSec;
  return isActive && inPeriod ? planId : TEAM_PLAN.FREE;
}

/**
 * Info: (20260819 - Luphia) 鏈上會員卡說這張卡現在代表什麼方案。
 *
 * 與 DB 側同構：方案代號未知或期間已過 → free。**卡片不會過期消失**（合約沒有 burn），
 * 因此「期末在過去」是常態而不是異常——一張去年的卡代表的是 free，不是 business。
 *
 * 讀 `period_end` 而不是相信 `plan`：兩者都寫在同一份 metadata 裡，但只有前者能
 * 判斷這張卡**現在**還算不算有效。
 */
export function resolveChainCardPlan(
  metadata: ISubscriptionCardMetadata | null,
  nowSec: number,
): TeamPlanId {
  if (!metadata) return TEAM_PLAN.FREE;
  const attribute = (trait: string): string | number | undefined =>
    metadata.attributes.find((item) => item.trait_type === trait)?.value;

  const plan = String(attribute("plan") ?? "");
  if (!isTeamPlanId(plan)) return TEAM_PLAN.FREE;
  if (plan === TEAM_PLAN.FREE) return TEAM_PLAN.FREE;

  const periodEnd = Number(attribute("period_end"));
  if (!Number.isFinite(periodEnd) || periodEnd < nowSec) return TEAM_PLAN.FREE;
  return plan;
}

/**
 * Info: (20260819 - Luphia) 最高方案（徽章用）。沒有任何來源時回 free：
 * 「查不到」與「免費」在顯示上是同一件事，而回 undefined 只會讓每個呼叫端
 * 自己補一個 fallback，補法還不見得一致。
 */
export function resolveHighestPlan(plans: TeamPlanId[]): TeamPlanId {
  return plans.reduce<TeamPlanId>(
    (best, plan) => (PLAN_RANK[plan] > PLAN_RANK[best] ? plan : best),
    TEAM_PLAN.FREE,
  );
}

/**
 * Info: (20260819 - Luphia) 全體一致的方案，否則 undefined（不標任何一格）。
 *
 * 方案頁的「目前方案」標記會**停用購買鈕**：擁有一個免費團隊與一個團隊版團隊的人，
 * 若照最高標成團隊版，他就再也無法為那個免費團隊訂閱團隊版。
 *
 * 沒有團隊時也回 undefined 而不是 free：那個人還沒有任何訂閱對象，
 * 把免費版標成「目前方案」會把免費版那一格的鈕也停掉，而他確實可以去建團隊。
 */
export function resolveUnanimousPlan(
  plans: TeamPlanId[],
): TeamPlanId | undefined {
  if (plans.length === 0) return undefined;
  const [first] = plans;
  return plans.every((plan) => plan === first) ? first : undefined;
}

/**
 * Info: (20260819 - Luphia) 同一個團隊，DB 與鏈上各說一個方案時的取捨。
 *
 * 產品決定 20260819：**鏈上為準，DB 是快取**。但「為準」的前提是那份鏈上資料
 * **確實是最新的**，而這件事我們自己知道——`nftSyncedAt IS NULL` 就是「我們還沒
 * 把新內容寫上去」的證據（見 `constants/subscription_nft`）。
 *
 * 因此判斷是「取已知較新的那一份」，而新舊**可知、不是猜**：
 *
 * | 鏈上那份 | 採信 | 為什麼 |
 * |---|---|---|
 * | 已確認同步 | **鏈上** | 此時與 DB 不一致是真的不一致（履行漏掉、DB 還原到舊備份），而使用者手上握著憑證 |
 * | 已知過期（待同步） | **DB** | 我們自己還沒寫上去。剛續訂成功的卡片 `period_end` 仍是舊的，折算為 free——照鏈上顯示會把付費戶打回免費版，而且**每期續訂都會發生一次** |
 *
 * 第二列有界（`SUBSCRIPTION_CARD_PENDING_GRACE_MS`）：卡住的同步不該讓「顯示付費」
 * 永久靠 DB 撐著。超過就回到第一列，並讓呼叫端以 error 記錄——那時該修 worker。
 *
 * 「鏈上**讀不到**」是第三種情形，不在這裡：那不是資訊（RPC 失敗、合約未部署），
 * 由 `plan.service` 退回 DB 並在回應標明來源。
 */
/**
 * Info: (20260820 - Luphia) 方案答案的來源。**一份列舉，三種值**（簡化 20260820）。
 *
 * 原本這裡與 `plan.service` 各有一份（前者兩種、後者三種），中間再寫一段
 * 對照——而兩份列舉的字面值一模一樣。多出來的是一段可以寫錯的對照，
 * 不是任何額外的表達力。
 */
export const PLAN_SOURCE = {
  // Info: (20260820 - Luphia) 鏈上讀到了、且那份是最新的
  CHAIN: "CHAIN",
  // Info: (20260820 - Luphia) 鏈上那份已知過期（待同步且在寬限內）：以 DB 為顯示依據
  PENDING_CHAIN: "PENDING_CHAIN",
  // Info: (20260820 - Luphia) 鏈上**讀不到**（未部署、RPC 失敗、逾時）：退回 DB
  DB: "DB",
} as const;

export type PlanSource = (typeof PLAN_SOURCE)[keyof typeof PLAN_SOURCE];

export function reconcilePlan(params: {
  dbPlan: TeamPlanId;
  chainPlan: TeamPlanId;
  // Info: (20260820 - Luphia) 鏈上那份是否**已知過期**（待同步且仍在寬限內）
  chainStale: boolean;
}): {
  plan: TeamPlanId;
  mismatch: boolean;
  // Info: (20260820 - Luphia) 只會是 CHAIN 或 PENDING_CHAIN；DB 由呼叫端決定（讀不到）
  source: typeof PLAN_SOURCE.CHAIN | typeof PLAN_SOURCE.PENDING_CHAIN;
} {
  if (params.chainStale) {
    return {
      plan: params.dbPlan,
      /**
       * Info: (20260820 - Luphia) 待同步期間**不算不一致**：兩者本來就該不同
       * （我們還沒寫上去）。算進去的話，每一次續訂都會產生一筆假的告警，
       * 而真正需要注意的不一致就淹沒在裡面。
       */
      mismatch: false,
      source: PLAN_SOURCE.PENDING_CHAIN,
    };
  }
  return {
    plan: params.chainPlan,
    mismatch: params.chainPlan !== params.dbPlan,
    source: PLAN_SOURCE.CHAIN,
  };
}

/**
 * Info: (20260820 - Luphia) 鏈上那份是不是「已知過期」——純判斷，供 `plan.service` 呼叫。
 *
 * 三個條件同時成立才算：**沒有同步時間**（待辦）、**還沒放棄**（重試未達上限）、
 * 且**還在寬限內**。後兩個是界：卡住的同步（黑名單、缺角色）會停在待辦，
 * 而沒有界的話那一列會永久以 DB 顯示付費，鏈上卻沒有任何憑證。
 */
export function isChainCopyStale(params: {
  syncedAt: Date | null;
  attempts: number;
  updatedAtMs: number;
  nowMs: number;
  maxAttempts: number;
  graceMs: number;
}): boolean {
  if (params.syncedAt !== null) return false;
  if (params.attempts >= params.maxAttempts) return false;
  return params.nowMs - params.updatedAtMs <= params.graceMs;
}
