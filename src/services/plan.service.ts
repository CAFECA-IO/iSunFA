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
  isChainCopyStale,
  PLAN_SOURCE,
  type PlanSource,
  reconcilePlan,
  resolveChainCardPlan,
  resolveEffectivePlanId,
  resolveHighestPlan,
} from "@/lib/subscription/plan_rules";
import {
  CHAIN_CARD_READ_TIMEOUT_MS,
  SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
  SUBSCRIPTION_CARD_PENDING_GRACE_MS,
} from "@/constants/subscription_nft";
import { logger } from "@/lib/utils/logger";
import { teamRepo } from "@/repositories/team.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import { readOwnedChainCards } from "@/services/subscription_nft.service";

// Info: (20260820 - Luphia) 來源列舉的單一來源在 plan_rules（client 也匯入它）
export { PLAN_SOURCE } from "@/lib/subscription/plan_rules";
export type { PlanSource } from "@/lib/subscription/plan_rules";

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

export interface IUserPlanSnapshot {
  // Info: (20260819 - Luphia) 徽章顯示用：擁有的團隊中最高的方案
  plan: TeamPlanId;
  /**
   * Info: (20260819 - Luphia) 逐團事實。回事實而不是只回一個結論：
   * 方案頁的「目前方案」標記需要的是「是否全部一致」（`resolveUnanimousPlan`），
   * 而徽章需要的是最高——同一份事實兩種讀法。
   */
  ownedPlans: TeamPlanId[];
  /**
   * Info: (20260820 - Luphia) 這份快照的來源（取最保守的那一個）。
   *
   * 只要有一個團隊還在等鏈上，整份就標 `PENDING_CHAIN`——前端要說「憑證產生中」，
   * 而它拿到的是一個徽章用的單一值。
   *
   * Info: (20260820 - Luphia) 逐團明細（`teams` / `mismatches`）已移除（簡化 20260820）：
   * 沒有任何呼叫端讀它們，而不一致本身仍然會以 `log.warn` / `log.error` 留下紀錄
   *——那才是需要被看見的地方。留著一份沒有人讀的結構只會讓下一個人以為它有用途。
   */
  source: PlanSource;
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
  const nowMs = nowSec * 1000;
  const log = logger.child({ service: "PlanService" });

  const owned = await teamRepo.listOwnedTeamsWithSubscription(userId);
  const dbPlans = new Map<string, TeamPlanId>(
    owned.map((team) => [
      team.teamId,
      resolveEffectivePlanId(team.subscription, nowSec),
    ]),
  );

  const cardState = await teamSubscriptionRepo.listCardSyncState(
    owned.map((team) => team.teamId),
  );

  const staleTeams = new Set(
    owned
      .filter((team) => {
        const state = cardState.get(team.teamId);
        if (!state) return false;
        return isChainCopyStale({
          syncedAt: state.syncedAt,
          attempts: state.attempts,
          updatedAtMs: state.updatedAtMs,
          nowMs,
          maxAttempts: SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
          graceMs: SUBSCRIPTION_CARD_PENDING_GRACE_MS,
        });
      })
      .map((team) => team.teamId),
  );

  /**
   * Info: (20260820 - Luphia) 只有「DB 說付費、卻沒有卡號」時才值得掃鏈上事件
   *（self-review 風險 2）。
   *
   * 原本的條件是 `已確認卡片數 < balanceOf`，看似只在快取缺漏時掃一次。但持有
   * 「已不屬於自己團隊」的卡時（換過 OWNER、團隊解散），那張卡永遠不在 hint 裡，
   * 於是條件永遠成立——**每次 `/auth/me` 都會對合約做一次 fromBlock 0 的全鏈掃描**。
   *
   * 由 service 算出「該找、但找不到」的數量再交給讀取端：掃描要處理的情形只有一種
   * ——DB 認為這個團隊付費，而我們不知道它的卡號（履行漏掉、DB 還原到舊備份）。
   */
  const missingCards = owned.filter(
    (team) =>
      (dbPlans.get(team.teamId) ?? TEAM_PLAN.FREE) !== TEAM_PLAN.FREE &&
      !cardState.get(team.teamId)?.tokenId,
  ).length;

  const chain = await readChainPlans({
    address,
    hintTokenIds: [...cardState.values()]
      .map((state) => state.tokenId)
      .filter((tokenId): tokenId is string => Boolean(tokenId)),
    discoverMissing: missingCards > 0,
    nowSec,
    onFailure: (reason) =>
      log.warn("鏈上方案讀取失敗或逾時，本次以 DB 為準", { userId, reason }),
  });

  let anyPending = false;
  const resolved = owned.map((team) => {
    const dbPlan = dbPlans.get(team.teamId) ?? TEAM_PLAN.FREE;
    const cachedTokenId = cardState.get(team.teamId)?.tokenId ?? null;

    if (!chain.available) return { plan: dbPlan, tokenId: cachedTokenId };

    const card = chain.byTeam.get(team.teamId);
    const chainPlan = card?.plan ?? TEAM_PLAN.FREE;
    const chainStale = staleTeams.has(team.teamId);
    const { plan, mismatch, source } = reconcilePlan({
      dbPlan,
      chainPlan,
      chainStale,
    });
    if (source === PLAN_SOURCE.PENDING_CHAIN) anyPending = true;
    if (mismatch) {
      log.warn("鏈上方案與 DB 不一致，以鏈上為準", {
        userId,
        teamId: team.teamId,
        dbPlan,
        chainPlan,
      });
    }
    /**
     * Info: (20260820 - Luphia) 待辦停太久要看得見。
     *
     * 寬限內以 DB 顯示是刻意的；**超過寬限**的那一列會回到鏈上為準，於是使用者
     * 突然被打回免費版。那不是顯示問題而是 worker 卡住了，因此以 error 記錄——
     * 只留 warn 的話它會混在每期續訂都會出現的正常訊息裡。
     */
    const state = cardState.get(team.teamId);
    if (!chainStale && state && state.syncedAt === null) {
      log.error("訂閱卡待同步已超過寬限，方案顯示改回鏈上結果", {
        userId,
        teamId: team.teamId,
        attempts: state.attempts,
        dbPlan,
        chainPlan,
      });
    }
    return { plan, tokenId: card?.tokenId ?? cachedTokenId };
  });

  // Info: (20260819 - Luphia) 快取被鏈上糾正（發現 DB 不知道的卡）：只補卡號，不動計費資料
  if (chain.available) {
    await backfillTokenIdCache(
      owned.map((team, index) => ({
        teamId: team.teamId,
        tokenId: resolved[index].tokenId,
      })),
      cardState,
      log,
    );
  }

  const ownedPlans = resolved.map((team) => team.plan);
  return {
    plan: resolveHighestPlan(ownedPlans),
    ownedPlans,
    source: !chain.available
      ? PLAN_SOURCE.DB
      : anyPending
        ? PLAN_SOURCE.PENDING_CHAIN
        : PLAN_SOURCE.CHAIN,
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
  discoverMissing: boolean;
  nowSec: number;
  onFailure: (reason: string) => void;
}): Promise<{
  available: boolean;
  byTeam: Map<string, { plan: TeamPlanId; tokenId: string }>;
}> {
  const byTeam = new Map<string, { plan: TeamPlanId; tokenId: string }>();
  if (!params.address) return { available: false, byTeam };

  try {
    const cards = await withTimeout(
      readOwnedChainCards(params.address, {
        hintTokenIds: params.hintTokenIds,
        discoverMissing: params.discoverMissing,
      }),
      CHAIN_CARD_READ_TIMEOUT_MS,
    );
    for (const card of cards) {
      if (!card.teamId) continue;
      const plan = resolveChainCardPlan(card.metadata, params.nowSec);
      const existing = byTeam.get(card.teamId);
      /**
       * Info: (20260820 - Luphia) 同一團有多張卡時：先比方案（取高），同高則取
       * **號碼小的那一張**（最早鑄出的）。
       *
       * 重鑄本來就不該發生（指紋冪等擋著），但真發生時「回哪一個卡號」不能取決於
       * 迴圈次序——那會讓同一次查詢在不同時候回不同的卡號，而卡號會被寫回快取。
       */
      if (
        !existing ||
        resolveHighestPlan([existing.plan, plan]) !== existing.plan ||
        (existing.plan === plan &&
          BigInt(card.tokenId) < BigInt(existing.tokenId))
      ) {
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
 * Info: (20260820 - Luphia) 逾時保護（self-review 風險 1）。
 *
 * `catch` 擋得住失敗，擋不住**慢**：RPC 掛住時 `/auth/me` 會一起掛住，而它是所有
 * 畫面的前置條件。逾時的處置與失敗相同——退回 DB，並在回應標明來源。
 *
 * 逾時之後那個 promise 仍會跑完（viem 無法取消），因此掛一個 `catch` 吞掉它的
 * 錯誤：沒有這一行，逾時後的失敗會變成 unhandled rejection，在某些 Node 設定下
 * 直接讓行程結束。
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`鏈上讀取逾時（${ms}ms）`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    promise.catch(() => undefined);
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
  teams: { teamId: string; tokenId: string | null }[],
  cardState: Map<string, { tokenId: string | null }>,
  log: ReturnType<typeof logger.child>,
): Promise<void> {
  for (const team of teams) {
    if (!team.tokenId) continue;
    if (cardState.get(team.teamId)?.tokenId) continue;
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
