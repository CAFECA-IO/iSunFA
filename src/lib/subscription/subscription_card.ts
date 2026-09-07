import {
  SUBSCRIPTION_CARD_ACTION,
  SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
  SUBSCRIPTION_CARD_NAME,
  SUBSCRIPTION_CARD_URI_PREFIX,
  SubscriptionCardAction,
} from "@/constants/subscription_nft";
import { TEAM_PLAN, TeamPlanId } from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 訂閱會員卡的**純決策與純資料**。
 *
 * 這一層不碰鏈、不碰 DB：要不要送交易、送哪一種、metadata 長什麼樣，全部是
 * 輸入到輸出的函式，因此可以逐條單測（包含「已經同步過就不要再送一次」這種
 * 沒有真鏈就驗不到的分支）。服務層只負責把決策執行掉並把結果寫回。
 */

export interface ISubscriptionCardState {
  // Info: (20260819 - Luphia) 已鑄卡的 tokenId（十進位字串；uint256 放不進 number）
  tokenId: string | null;
  // Info: (20260819 - Luphia) 上次寫上鏈的內容指紋；null 表示從未成功同步
  syncedFingerprint: string | null;
  // Info: (20260819 - Luphia) 連續失敗次數（成功即歸零）
  attempts: number;
}

export interface ISubscriptionCardFacts {
  teamId: string;
  /**
   * Info: (20260821 - Luphia) 刻意**沒有**團隊名稱（review #6687 中-3）。
   * tokenURI 的內容會永久留在鏈上（`setTokenURI` 只能覆寫當前值，舊值仍在
   * 歷史 calldata 裡，而合約沒有 burn）——「某位址屬於某事務所」是未經同意的
   * 客戶識別資訊。`team_id` 是內部 UUID，對外不可反查，顯示名稱由離鏈補。
   */
  // Info: (20260819 - Luphia) **有效**方案（過期／PAST_DUE 已折算為 free），非 DB 原值
  effectivePlanId: TeamPlanId;
  periodStartSec: number;
  periodEndSec: number;
  seats: number;
}

/**
 * Info: (20260819 - Luphia) 內容指紋：決定「鏈上那張卡是否已經是最新的」。
 *
 * 只納入會改變卡片語意的欄位。刻意**不含**持有地址：卡片鑄出去之後只有持有人
 * 自己能轉，團隊換 OWNER 不會、也不該讓平台再鑄一張（那是憑空多一張有效憑證）。
 * 也刻意不含 `updatedAt` 之類的時間戳——那會讓每次寫入都判定為過期，
 * 於是每輪 worker 都送一筆交易。
 */
export function buildCardFingerprint(facts: {
  effectivePlanId: TeamPlanId;
  periodEndSec: number;
  seats: number;
}): string {
  return [facts.effectivePlanId, facts.periodEndSec, facts.seats].join(":");
}

export interface ISubscriptionCardMetadata {
  name: string;
  description: string;
  attributes: { trait_type: string; value: string | number }[];
}

/**
 * Info: (20260819 - Luphia) ERC721 metadata。欄位名沿用 OpenSea 慣例
 * （name / description / attributes），錢包與瀏覽器才顯示得出來。
 *
 * 期間以 epoch 秒表示，不寫格式化日期：時區與語系是**顯示端**的事，
 * 寫進 metadata 只會讓同一張卡在不同地方讀出不同日期。
 */
export function buildCardMetadata(
  facts: ISubscriptionCardFacts,
): ISubscriptionCardMetadata {
  const isPaid = facts.effectivePlanId !== TEAM_PLAN.FREE;
  return {
    name: `${SUBSCRIPTION_CARD_NAME} · ${facts.effectivePlanId}`,
    description: isPaid
      ? `iSunFA ${facts.effectivePlanId} subscription.`
      : `iSunFA subscription is not active.`,
    attributes: [
      { trait_type: "plan", value: facts.effectivePlanId },
      { trait_type: "team_id", value: facts.teamId },
      { trait_type: "seats", value: facts.seats },
      { trait_type: "period_start", value: facts.periodStartSec },
      { trait_type: "period_end", value: facts.periodEndSec },
    ],
  };
}

/**
 * Info: (20260819 - Luphia) metadata → tokenURI（data URI，見常數檔的說明）。
 *
 * `JSON.stringify` 的鍵順序由物件字面序決定，因此同樣的輸入永遠得到同樣的 URI——
 * 這一點是必要的：同步判斷靠指紋，但「重跑一次會不會產生不同的 URI」決定了
 * 補償重試是不是冪等。
 */
export function buildCardTokenUri(metadata: ISubscriptionCardMetadata): string {
  const json = JSON.stringify(metadata);
  return `${SUBSCRIPTION_CARD_URI_PREFIX}${Buffer.from(json, "utf8").toString("base64")}`;
}

/**
 * Info: (20260819 - Luphia) tokenURI → metadata。解不開時回 null，不丟錯。
 *
 * 鏈上讀回來的東西一律當**未知**（CLAUDE.md §2）：那個字串可能是別的系統鑄的卡、
 * 可能是舊格式、也可能根本不是 data URI。任何一種都只是「這張卡不算訂閱憑證」，
 * 不是例外狀況——丟錯會讓一張陌生的卡把整個方案查詢變成失敗。
 *
 * 驗證到 `attributes` 是陣列為止：再往下的欄位語意由 `plan_rules` 判斷，
 * 這裡只保證結構對得上，不假裝知道內容是不是合理。
 */
export function parseCardTokenUri(
  uri: string | null | undefined,
): ISubscriptionCardMetadata | null {
  if (!uri || !uri.startsWith(SUBSCRIPTION_CARD_URI_PREFIX)) return null;
  try {
    const json = Buffer.from(
      uri.slice(SUBSCRIPTION_CARD_URI_PREFIX.length),
      "base64",
    ).toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<ISubscriptionCardMetadata>;
    if (!Array.isArray(candidate.attributes)) return null;
    return {
      name: typeof candidate.name === "string" ? candidate.name : "",
      description:
        typeof candidate.description === "string" ? candidate.description : "",
      attributes: candidate.attributes.filter(
        (item): item is ISubscriptionCardMetadata["attributes"][number] =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as { trait_type?: unknown }).trait_type === "string",
      ),
    };
  } catch {
    return null;
  }
}

// Info: (20260819 - Luphia) metadata 裡的團隊（`team_id` 屬性）；認不出來回 null
export function readCardTeamId(
  metadata: ISubscriptionCardMetadata | null,
): string | null {
  const value = metadata?.attributes.find(
    (item) => item.trait_type === "team_id",
  )?.value;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export interface ISubscriptionCardDecision {
  action: SubscriptionCardAction;
  // Info: (20260819 - Luphia) 決策理由：進 log 與測試斷言，讓「為什麼沒動作」說得出來
  reason: string;
  fingerprint: string;
}

/**
 * Info: (20260819 - Luphia) 該不該動鏈，以及動哪一種。
 *
 * 順序有意義：
 *
 * 1. **重試上限先判**。已經連續失敗 5 次的團隊，不管內容有沒有變都不再送交易，
 *    否則永久性失敗（黑名單、缺角色）會讓 worker 每分鐘燒一次 gas 估算。
 * 2. **指紋相同就停手**（冪等）。這是唯一能防「每輪重鑄一張」的判斷，
 *    而重鑄的後果不是多花一點 gas——是同一個訂閱在鏈上留下兩張都看起來有效的卡。
 * 3. 有卡 → 換 URI；沒卡且付費 → 鑄；沒卡且免費 → 不鑄。
 *
 * 最後一條是產品語意：卡片代表**付費訂閱**。免費方案沒有卡，所以「沒有卡」
 * 不是待辦事項；但降級之後那張既存的卡必須改寫成非有效，否則它會繼續
 * 對外聲稱一個已經結束的訂閱。
 */
export function decideCardAction(
  facts: ISubscriptionCardFacts,
  state: ISubscriptionCardState,
  maxAttempts: number = SUBSCRIPTION_CARD_MAX_SYNC_ATTEMPTS,
): ISubscriptionCardDecision {
  const fingerprint = buildCardFingerprint(facts);

  if (state.attempts >= maxAttempts) {
    return {
      action: SUBSCRIPTION_CARD_ACTION.GIVE_UP,
      reason: `已連續失敗 ${state.attempts} 次，達上限 ${maxAttempts}`,
      fingerprint,
    };
  }

  if (state.tokenId && state.syncedFingerprint === fingerprint) {
    return {
      action: SUBSCRIPTION_CARD_ACTION.NONE,
      reason: "鏈上內容與訂閱一致",
      fingerprint,
    };
  }

  if (state.tokenId) {
    return {
      action: SUBSCRIPTION_CARD_ACTION.UPDATE_URI,
      reason: `內容已變更（${state.syncedFingerprint ?? "未同步"} → ${fingerprint}）`,
      fingerprint,
    };
  }

  if (facts.effectivePlanId === TEAM_PLAN.FREE) {
    return {
      action: SUBSCRIPTION_CARD_ACTION.NONE,
      reason: "免費方案不發卡",
      fingerprint,
    };
  }

  return {
    action: SUBSCRIPTION_CARD_ACTION.MINT,
    reason: `付費方案 ${facts.effectivePlanId} 尚未發卡`,
    fingerprint,
  };
}
