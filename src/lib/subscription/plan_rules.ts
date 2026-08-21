import {
  PLAN_RANK,
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
  TeamPlanId,
} from "@/constants/subscription_quota";

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
 * 從儲存體**讀出**方案是 `services/plan.service.ts` 的事，這裡只做折算。
 *
 * Info: (20260821 - Luphia) 方案**只讀 DB**（產品裁定 20260821）：「鏈上為準」的
 * 範圍只有會員卡本身的狀態，付款完成即視為有效。曾經住在這裡的對帳規則
 * （reconcilePlan / isChainCopyStale / resolveChainCardPlan / PLAN_SOURCE）
 * 隨著顯示路徑不再讀鏈而整組移除——沒有第二個來源，就沒有東西要對帳。
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
