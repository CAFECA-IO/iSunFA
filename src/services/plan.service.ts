import {
  SUBSCRIPTION_PLAN_PRICE,
  SUBSCRIPTION_PLAN_CREDITS,
} from "@/constants/price";
import { CARBON_STORAGE_QUOTA_GB_BY_PLAN } from "@/constants/carbon_chatbot";
import {
  BILLING_INTERVAL,
  BillingInterval,
  TEAM_PLAN,
  TeamPlanId,
} from "@/constants/subscription_quota";
import {
  resolveEffectivePlanId,
  resolveHighestPlan,
} from "@/lib/subscription/plan_rules";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";

/**
 * Info: (20260819 - Luphia) 方案的**單一入口** service（產品決定 20260819）。
 *
 * 在此之前「方案」這件事有三個以上的門：方案頁自己 import 價格與額度常數、
 * `/auth/me` 自己拼一個 plan、扣費側從 `spend.service` 拿 `resolveEffectivePlanId`。
 * 三個門的代價不是重複程式，是**答案會不一致**——付了團隊版而徽章顯示免費版
 * 就是其中一個門沒接線（回報 20260819）。
 *
 * 三個入口，職責分明：
 *
 * | 入口 | 回答 | 來源 |
 * |---|---|---|
 * | `listPlans()` | 有哪些方案、各自的價格／額度／儲存 | 常數 + DB 系統設定 |
 * | `getUserPlan()` | 這個人**現在**是什麼方案（顯示用） | 純 DB |
 * | `getTeamEntitlement()` | 這個團隊能用多少（權益用） | 純 DB，fail-closed |
 *
 * Info: (20260821 - Luphia) **方案一律讀 DB，不讀鏈**（產品裁定 20260821，
 * 更正 20260819 的「鏈上為準」）：「鏈上為準」的範圍只有**會員卡本身的狀態**
 * （卡片是否存在、metadata、持有人）；金流交易只存在 DB，**付款完成即視為
 * 會員卡有效，不論鏈上是否已完成鑄造**。因此任何「鏈上沒有卡 ⇒ 沒有方案」
 * 的推論都是錯的——這一版曾經那樣寫，代價是每期續訂後、卡片換 URI 之前，
 * 付費戶會被顯示成免費版（review #6687 阻擋級）。鏈上讀取只留在 worker
 * （鑄卡前的探針與既有卡認領），請求路徑一次 RPC 都不打。
 */

export interface IPlanCatalogEntry {
  id: TeamPlanId;
  isPaid: boolean;
  // Info: (20260819 - Luphia) 單一席次的月費／年費（TWD 整數）
  monthlyPrice: number;
  yearlyPrice: number;
  // Info: (20260819 - Luphia) 方案月配點（揭露用；訂閱本身不發點數，見設計書 §5.4.2）
  monthlyCredits: number;
  storageGb: number;
  // Info: (20260819 - Luphia) 雙視窗額度，來自 DB 系統設定（後台可調，不寫死）
  quota: { per5h: number; perWeek: number };
}

/**
 * Info: (20260819 - Luphia) 「有哪些方案」。
 *
 * 價格與月配點是程式常數（改價要改版、要留 git 紀錄），額度是 DB 系統設定
 * （後台可調參）——差別刻意保留，但**只有這裡讀得到它們**：其他地方一律經此入口，
 * 否則方案頁會顯示一組數字而扣費用另一組（那已經發生過，見設計書 §5.3）。
 */
export async function listPlans(): Promise<IPlanCatalogEntry[]> {
  const ids = Object.values(TEAM_PLAN);
  return Promise.all(
    ids.map(async (id) => {
      const quota = await subscriptionPlanQuotaRepo.resolveQuota(id);
      return {
        id,
        isPaid: id !== TEAM_PLAN.FREE,
        monthlyPrice: SUBSCRIPTION_PLAN_PRICE[id].monthly,
        yearlyPrice: SUBSCRIPTION_PLAN_PRICE[id].yearly,
        monthlyCredits: SUBSCRIPTION_PLAN_CREDITS[id],
        storageGb: CARBON_STORAGE_QUOTA_GB_BY_PLAN[id],
        quota: { per5h: quota.per5h, perWeek: quota.perWeek },
      };
    }),
  );
}

/**
 * Info: (20260819 - Luphia) 單一席次的單價（**實際收費**用）。
 *
 * 收費金額與方案頁揭露的金額必須來自同一份目錄。先前建單（`changeTeamSubscription`）
 * 與續訂（`subscription_renewal.cron`）各自 index 一次價格常數，方案頁與付款容器
 * 又各自 index 一次——四處讀同一份常數，而「改價時漏掉其中一處」不會有任何測試發現，
 * 症狀是使用者看到一個價格、卡被扣另一個。
 *
 * 同步（不做 DB 查詢）：價格是程式常數，這一支只負責讓它只有一個出口。
 */
export function getPlanUnitPrice(
  planId: TeamPlanId,
  billingInterval: BillingInterval,
): number {
  const price = SUBSCRIPTION_PLAN_PRICE[planId];
  return billingInterval === BILLING_INTERVAL.YEAR
    ? price.yearly
    : price.monthly;
}

/**
 * Info: (20260819 - Luphia) 團隊的**權益**方案：純 DB、fail-closed。
 *
 * 扣費（`spendCredits`）、席次補收（`quoteSeatAddition`）、額度顯示、記憶保留
 * 都應該經這一支。刻意**不讀鏈**：RPC 逾時不能讓扣費放行，而卡片是可轉讓的
 * ——若權益採信鏈上憑證，收到一張轉讓卡的人就能動用那個團隊的額度。
 */
export async function getTeamEntitlement(params: {
  teamId: string;
  nowSec: number;
}): Promise<TeamPlanId> {
  const subscription = await teamSubscriptionRepo.getByTeamId(params.teamId);
  return resolveEffectivePlanId(subscription, params.nowSec);
}

export interface IUserPlanSnapshot {
  // Info: (20260819 - Luphia) 徽章顯示用：擁有的團隊中最高的方案
  plan: TeamPlanId;
  /**
   * Info: (20260819 - Luphia) 逐團事實。回事實而不是只回一個結論：
   * 方案頁的「目前方案」標記需要的是「是否全部一致」（`resolveUnanimousPlan`），
   * 而徽章需要的是最高——同一份事實兩種讀法。
   */
  ownedPlans: TeamPlanId[];
}

/**
 * Info: (20260819 - Luphia) 這個人現在是什麼方案（`GET /auth/me`、徽章、方案頁）。
 *
 * **純 DB**（產品裁定 20260821）：付款完成即有效，鑄卡狀態與顯示無關。
 * 一次查詢（owned teams + 訂閱 join），零 RPC——`/auth/me` 是所有畫面的
 * 前置條件，它的成本上限就是這一次查詢。
 *
 * 範圍是**擁有**（OWNER）的團隊，不是所有參與的團隊：訂閱只有 OWNER 能買
 * （`usePurchaseTarget`），「我的方案」問的是「我付費買到什麼」。若採所有參與的
 * 團隊，一位免費戶被邀進別人的團隊版就會看到自己是團隊版，而方案頁那一格的
 * 購買鈕會因此停用——他反而買不了。
 *
 * 有效方案一律經 `resolveEffectivePlanId`：過期、PAST_DUE 折算為 free，
 * 與扣費側同一個判準——畫面說團隊版而額度按免費版扣，比顯示免費版更糟。
 */
export async function getUserPlan(params: {
  userId: string;
  nowSec: number;
}): Promise<IUserPlanSnapshot> {
  const owned = await teamRepo.listOwnedTeamsWithSubscription(params.userId);
  const ownedPlans = owned.map((team) =>
    resolveEffectivePlanId(team.subscription, params.nowSec),
  );
  return { plan: resolveHighestPlan(ownedPlans), ownedPlans };
}
