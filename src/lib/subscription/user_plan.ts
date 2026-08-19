import { TEAM_PLAN, TeamPlanId } from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 「這個人現在是什麼方案」的兩條顯示規則。
 *
 * 訂閱掛在**團隊**上、且只有 OWNER 能買（`usePurchaseTarget`），所以「使用者的方案」
 * 本身是個投影：一個人可能同時擁有一個免費團隊與一個團隊版團隊。畫面上有兩個
 * 需求不同的位置，因此有兩條規則，而不是一條硬套：
 *
 * - **徽章**（header）要回答「我是什麼客戶」→ 取最高（`resolveHighestPlan`）。
 *   徽章不會擋任何操作，寫最高的那個才對得上使用者的認知。
 * - **方案頁的「目前方案」標記**要回答「這一格是不是已經買到的」→ 全體一致才標
 *   （`resolveUnanimousPlan`）。因為那個標記會**停用購買鈕**：某人擁有的團隊有
 *   免費也有團隊版時，若照最高標成團隊版，他就再也無法為那個免費團隊訂閱團隊版。
 *
 * 兩條都是純函式：規則寫在這裡，畫面只負責把結果翻成句子。
 */

/**
 * Info: (20260819 - Luphia) 方案高低次序。數字只用於比較，不代表價格或額度倍數——
 * 那些是 DB 系統設定（見 `subscription_plan_quota`），不可從這裡推導。
 */
export const PLAN_RANK: Record<TeamPlanId, number> = {
  [TEAM_PLAN.FREE]: 0,
  [TEAM_PLAN.TEAM]: 1,
  [TEAM_PLAN.BUSINESS]: 2,
};

/**
 * Info: (20260819 - Luphia) 字串是不是已知的團隊方案。
 *
 * API 回來的是 `string[]`（跨網路的東西一律當成未知），而顯示規則吃 `TeamPlanId`。
 * 認不出來的值一律丟掉而不是當成免費版：DB 的 `plan_id` 是自由字串欄位，
 * 哪天多出一個新方案代號，這裡把它當免費版會讓付費戶看到「免費版」，
 * 而丟掉只是不標記——錯的方向差很多。
 */
export function isTeamPlanId(value: string): value is TeamPlanId {
  return (Object.values(TEAM_PLAN) as string[]).includes(value);
}

/**
 * Info: (20260819 - Luphia) 最高方案。沒有任何團隊時回 free：
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
 * 沒有團隊時也回 undefined，而不是 free：這個人還沒有任何訂閱對象，
 * 把免費版標成「目前方案」會把免費版那一格的鈕也停掉，而他確實可以去建團隊。
 */
export function resolveUnanimousPlan(
  plans: TeamPlanId[],
): TeamPlanId | undefined {
  if (plans.length === 0) return undefined;
  const [first] = plans;
  return plans.every((plan) => plan === first) ? first : undefined;
}
