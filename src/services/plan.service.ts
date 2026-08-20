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
  reconcilePlan,
  resolveChainCardPlan,
  resolveEffectivePlanId,
  resolveHighestPlan,
} from "@/lib/subscription/plan_rules";
import { logger } from "@/lib/utils/logger";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { readOwnedChainCards } from "@/services/subscription_nft.service";

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
 * | `getUserPlan()` | 這個人**現在**是什麼方案（顯示用） | **鏈上為準**，DB 為快取 |
 * | `getTeamEntitlement()` | 這個團隊能用多少（權益用） | 純 DB，fail-closed |
 *
 * 為什麼顯示與權益分成兩支：**兩者的失敗方向相反**。顯示要「不要把付費戶說成免費戶」，
 * 因此採信鏈上憑證；權益要「絕不因資料異常放大額度」，因此只認付款真的落地的那份
 * 資料（DB），而且 RPC 掛掉時不能讓扣費放行。合成一支的話，其中一邊必然被迫接受
 * 錯誤方向的預設值。
 *
 * 純規則（折算、比較、對帳）在 `lib/subscription/plan_rules.ts`；這一層只負責
 * 「從儲存體讀出來」並把規則套上去。
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

export interface IUserPlanTeam {
  teamId: string;
  // Info: (20260819 - Luphia) 對帳後的方案（鏈上為準）
  plan: TeamPlanId;
  dbPlan: TeamPlanId;
  chainPlan: TeamPlanId;
  tokenId: string | null;
}

export const PLAN_SOURCE = {
  // Info: (20260819 - Luphia) 鏈上讀到了（含「讀到了但沒有卡」），以鏈上為準
  CHAIN: "CHAIN",
  // Info: (20260819 - Luphia) 鏈上**讀不到**（未部署、RPC 失敗），退回 DB
  DB: "DB",
} as const;

export type PlanSource = (typeof PLAN_SOURCE)[keyof typeof PLAN_SOURCE];

export interface IUserPlanSnapshot {
  // Info: (20260819 - Luphia) 徽章顯示用：擁有的團隊中最高的方案
  plan: TeamPlanId;
  /**
   * Info: (20260819 - Luphia) 逐團事實。回事實而不是只回一個結論：
   * 方案頁的「目前方案」標記需要的是「是否全部一致」（`resolveUnanimousPlan`），
   * 而徽章需要的是最高——同一份事實兩種讀法。
   */
  ownedPlans: TeamPlanId[];
  teams: IUserPlanTeam[];
  source: PlanSource;
  // Info: (20260819 - Luphia) 鏈上與 DB 不一致的團隊數（0 表示對得上）
  mismatches: number;
}

/**
 * Info: (20260819 - Luphia) 這個人現在是什麼方案（`GET /auth/me`、徽章、方案頁）。
 *
 * **鏈上為準，DB 為快取**（產品決定 20260819）：
 *
 * 1. 讀這個人**擁有**（OWNER）的團隊與各自的訂閱列 → 每團一個 DB 有效方案。
 * 2. 讀他地址上**現在持有**的會員卡 → 每張卡一個鏈上有效方案（依 metadata 的期末折算）。
 * 3. 逐團對帳（`reconcilePlan`）：以鏈上為準，並把差異記下來。
 * 4. 鏈上**讀不到**（未部署合約、RPC 失敗）時退回 DB —— 「讀不到」與「讀到了但沒有卡」
 *    是兩件事，前者不是資訊，把它當「沒有卡」會讓每一位付費戶在 RPC 抖動時被打回免費版。
 *
 * 範圍是擁有的團隊，不是所有參與的團隊：訂閱只有 OWNER 能買（`usePurchaseTarget`），
 * 「我的方案」問的是「我付費買到什麼」。若採所有參與的團隊，一位免費戶被邀進別人的
 * 團隊版就會看到自己是團隊版，而方案頁那一格的購買鈕會因此停用——他反而買不了。
 *
 * **不回寫訂閱本身**：不一致時只回填卡號快取（`nftTokenId`）並警示。卡片是可轉讓的，
 * 而 metadata 裡帶著 `team_id`——若讓它回寫 `TeamSubscription.planId`，
 * 任何拿到一張轉讓卡的人都能改寫那個團隊的計費資料。快取可以被鏈上糾正，
 * 計費資料只能由付款流程寫入。
 */
export async function getUserPlan(params: {
  userId: string;
  address?: string | null;
  nowSec: number;
}): Promise<IUserPlanSnapshot> {
  const { userId, address, nowSec } = params;
  const log = logger.child({ service: "PlanService" });

  const owned = await teamRepo.listOwnedTeamsWithSubscription(userId);
  const dbPlans = new Map<string, TeamPlanId>(
    owned.map((team) => [
      team.teamId,
      resolveEffectivePlanId(team.subscription, nowSec),
    ]),
  );

  const cachedTokenIds = await teamSubscriptionRepo.listCardTokenIds(
    owned.map((team) => team.teamId),
  );

  const chain = await readChainPlans({
    address,
    hintTokenIds: [...cachedTokenIds.values()].filter(
      (tokenId): tokenId is string => Boolean(tokenId),
    ),
    nowSec,
    onFailure: (reason) =>
      log.warn("鏈上方案讀取失敗，本次以 DB 為準", { userId, reason }),
  });

  const teams: IUserPlanTeam[] = owned.map((team) => {
    const dbPlan = dbPlans.get(team.teamId) ?? TEAM_PLAN.FREE;
    const card = chain.available ? chain.byTeam.get(team.teamId) : undefined;
    const chainPlan = card?.plan ?? TEAM_PLAN.FREE;

    if (!chain.available) {
      return {
        teamId: team.teamId,
        plan: dbPlan,
        dbPlan,
        chainPlan,
        tokenId: cachedTokenIds.get(team.teamId) ?? null,
      };
    }

    const { plan, mismatch } = reconcilePlan({ dbPlan, chainPlan });
    if (mismatch) {
      log.warn("鏈上方案與 DB 不一致，以鏈上為準", {
        userId,
        teamId: team.teamId,
        dbPlan,
        chainPlan,
      });
    }
    return {
      teamId: team.teamId,
      plan,
      dbPlan,
      chainPlan,
      tokenId: card?.tokenId ?? cachedTokenIds.get(team.teamId) ?? null,
    };
  });

  // Info: (20260819 - Luphia) 快取被鏈上糾正（發現 DB 不知道的卡）：只補卡號，不動計費資料
  if (chain.available) {
    await backfillTokenIdCache(teams, cachedTokenIds, log);
  }

  const ownedPlans = teams.map((team) => team.plan);
  return {
    plan: resolveHighestPlan(ownedPlans),
    ownedPlans,
    teams,
    source: chain.available ? PLAN_SOURCE.CHAIN : PLAN_SOURCE.DB,
    mismatches: teams.filter((team) => team.plan !== team.dbPlan).length,
  };
}

/**
 * Info: (20260819 - Luphia) 鏈上那一半：一張卡對一個團隊。
 *
 * 同一個團隊有多張卡時取**最高**：重鑄本來就不該發生（指紋冪等擋著），但如果真的
 * 發生了，取最高才不會因為讀到那張舊的而把人降級。`available` 分開回報，
 * 因為「沒有地址／合約未部署／RPC 失敗」與「這個人真的沒有卡」的處置完全不同。
 */
async function readChainPlans(params: {
  address?: string | null;
  hintTokenIds: string[];
  nowSec: number;
  onFailure: (reason: string) => void;
}): Promise<{
  available: boolean;
  byTeam: Map<string, { plan: TeamPlanId; tokenId: string }>;
}> {
  const byTeam = new Map<string, { plan: TeamPlanId; tokenId: string }>();
  if (!params.address) return { available: false, byTeam };

  try {
    const cards = await readOwnedChainCards(
      params.address,
      params.hintTokenIds,
    );
    for (const card of cards) {
      if (!card.teamId) continue;
      const plan = resolveChainCardPlan(card.metadata, params.nowSec);
      const existing = byTeam.get(card.teamId);
      if (!existing || resolveHighestPlan([existing.plan, plan]) === plan) {
        byTeam.set(card.teamId, { plan, tokenId: card.tokenId });
      }
    }
    return { available: true, byTeam };
  } catch (error) {
    params.onFailure(error instanceof Error ? error.message : String(error));
    return { available: false, byTeam };
  }
}

/**
 * Info: (20260819 - Luphia) 把鏈上發現、DB 卻不知道的卡號寫回快取。
 *
 * 只在「DB 沒有卡號」時寫，不覆蓋既有卡號：既有卡號是 worker 從鑄造收據取得的
 * 權威值，而這裡的來源是事件掃描——兩者衝突時不該由顯示路徑決定誰對。
 *
 * 失敗不影響回傳：這是快取回填，讀方案不能因為寫快取失敗而失敗。
 */
async function backfillTokenIdCache(
  teams: IUserPlanTeam[],
  cached: Map<string, string | null>,
  log: ReturnType<typeof logger.child>,
): Promise<void> {
  for (const team of teams) {
    if (!team.tokenId) continue;
    if (cached.get(team.teamId)) continue;
    try {
      await teamSubscriptionRepo.cacheCardTokenId(team.teamId, team.tokenId);
      log.info("以鏈上結果回填卡號快取", {
        teamId: team.teamId,
        tokenId: team.tokenId,
      });
    } catch (error) {
      log.warn("回填卡號快取失敗（不影響方案讀取）", {
        teamId: team.teamId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
