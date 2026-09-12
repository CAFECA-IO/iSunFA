import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { publicClient } from "@/lib/viem_public";
import { burn } from "@/services/token.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260814 - Luphia) 成員個人鏈上點數的讀取與扣款（PR #6652 第二輪 A-1）。
 *
 * 團隊分配改為鑄到成員自己的錢包之後（ADR 015 修訂），扣費管線的第二層若仍讀離鏈的
 * `TeamWalletAllocation`，遷移一跑就永遠是 0——成員手上有點數，系統卻說他有 0 點。
 * 這裡把第二層接到真正的餘額所在：鏈上。
 *
 * 高頻的額度消費**仍然完全離鏈**；只有「額度用完、由個人點數補上的差額」才動鏈，
 * 而且是在**結算**時一次扣清（不做預扣—退還），所以一次溢出消費最多一筆鏈上交易。
 */

// Info: (20260814 - Luphia) CreditPoint 為 18 位小數的 ERC-20，點數與 wei 的換算集中在這裡
const CREDIT_DECIMALS = 18;

export function isChainCreditConfigured(): boolean {
  return Boolean(CONTRACT_ADDRESSES.CREDIT_POINT);
}

/**
 * Info: (20260818 - Luphia) 這一層**以現在的做法**不可扣款（第三輪，調查 20260818）。
 *
 * `chargeChainCredits` 走的是平台側 burn：代理帳號直接呼叫合約把成員錢包裡的代幣
 * 銷毀。`CreditPoint` 沒有那個函式（只有 `burnAndUnlock(uint256)`，燒 `msg.sender`
 * 自己的餘額），而 `ABIS.CREDIT_POINT` 曾經宣告過它——所以這條扣款從來沒有成功過。
 * 那條宣告已刪除（見 `config/contracts.ts`），`abi_contract_parity.test.ts` 會擋下
 * 同一類新增。
 *
 * 在此之前的行為是 fail-**open**：`spendCredits` 把鏈上餘額加進 `available` 當作
 * 放行依據，而扣款必定失敗、餘額永遠不會減少——於是一個持有 ≥1 點的成員可以
 * 無上限消費，成本全部由 `settleSpend` 的追補記到**團隊額度**上。
 * 「因為他有點數所以放行，然後叫團隊付」。
 *
 * 因此這一層目前一律視為不存在：不計入放行、不嘗試扣款。
 *
 * ## 恢復的方向不是改合約（20260818 更正）
 *
 * 先前這裡寫的是「要恢復須改合約加 `burn(address, uint256)` 並重新部署」。**那是錯的
 * 補救方向**，而且是最糟的一種：它會讓平台能在持有人沒有授權的情況下銷毀他錢包裡的
 * 資產，與條款 §3.3 明文承諾的「該項扣除需經您以帳戶憑證簽章確認」相反。
 *
 * 扣成員個人點數這件事**本來就做得到**，而且產品裡已經在做——用的是持有人簽章而非
 * 平台權限：`ensurePersonalCreditCharge()` 建待付訂單 → 402 → 前端 `useOrderTransaction`
 * 走 `prepareTransferUserOp`，由成員的智慧錢包把點數 `transfer` 給 `MEMBERSHIP_SYSTEM`
 * （託管帳戶由 `custodialWalletService` 代簽，體感是直接扣）→ 重送同一則（冪等鍵不變）
 * 即放行。顧問分析（`bot.analysis.service`）、上傳（`bot.upload.service`）、
 * 以及**無帳本的碳盤查／費思會話**（`carbon_billing.service`）都走這條，合約不必動。
 *
 * 也就是說缺的不是鏈上能力，是**這一層沒有接上那條既有路徑**。要恢復請改用它，
 * 不要改合約；連帶會拿到它已經做對的部分（訂單即 DB 分錄、冪等鍵、失敗鑄回退款）。
 *
 * 剩下的是產品決定而非工程限制：團隊路徑是**實耗結算**（跑完才知道金額），訂單路徑
 * 必須**先收款**。無帳本那條的解法是保守預估一次收足、不退差額。
 *
 * Info: (20260818 - Luphia) 產品已拍板：**額度不足時整則走個人點數**（不切帳）。
 * 也就是預估成本超過剩餘額度時，該則訊息整筆由個人點數支付、團隊額度不動，
 * 與無帳本那條路同一個模型（保守預估、一次收足、不退差額）。
 * 不切帳的理由是切了也仍然要估算，而 `SPEND_SOURCE.MIXED` 的複雜度只換到省下
 * 一小段額度。實作是獨立的一票（要改 `spendCredits` 的放行判斷與 402 的出路），
 * 尚未進行——這個旗標仍然回 false。
 *
 * ---
 *
 * ## 這個旗標為 false 時，同時失效的行為（第四輪 B-2）
 *
 * 這一段是**集中標記**：扣費管線裡有一批程式碼目前走不到，而「走不到」有三種
 * 不同的原因，混在一起看就會有人把還需要的路徑當成死碼刪掉。
 * 以下每一條都有測試釘住（`spend_second_layer_inert.test.ts`），
 * 因此這份清單不會默默過期——它與程式碼不一致時會紅。
 *
 * ### A. 因為這個旗標而不可達（旗標翻回 true 就恢復）
 *
 * - `chargeChainCredits()`：`settleSpend` 的溢出路徑，`spender` 為 null 而不呼叫。
 * - `SPEND_SOURCE.MIXED` 的結算回傳，以及 `chainCharged` / `chainTxHash` 兩個欄位
 *   （只在 `chainCharge.charged` 為 true 時出現）。
 * - 402 payload 的 `QUOTA_EXCEEDED_OPTION.USE_PERSONAL_WALLET`
 *   （見 `buildQuotaExceededOptions`）。
 *
 * ### B. 因為 2026-08-14 分配上鏈（ADR 015）而不可達，與這個旗標無關
 *
 * - `splitSpend()` 的第三個參數與 wallet 腳：`spendCredits` 硬傳 `BigInt(0)`。
 * - `teamWalletRepo.consumeAllocation()`：全 repo 已無生產呼叫端
 *   （離鏈分配餘額不再是消費來源）。
 * - `resolveSpendPriority` / `FEATURE_SPEND_PRIORITY` 已於 2026-08-14 移除。
 *   因此 **20260813 的產品拍板「物流碳足跡優先扣分配點數」自那天起就不成立**——
 *   原因是分配變成成員的個人資產、那個排序失去意義，**不是**因為第二層停用。
 *   翻回這個旗標不會讓那個拍板復活；要它復活得重新設計逐功能的扣款順序。
 *
 * ### C. 看起來是死碼，但**不可刪**：舊資料的退款路徑
 *
 * - `records.walletHeld` / `records.walletRefunded`、`splitRefund()`、
 *   `teamWalletRepo.refundAllocationPartial()`、`SPEND_SOURCE.TEAM_ALLOCATION`。
 *
 * 這些讀的是**既有的** Ledger 列。改制前完成預扣、尚未結算的冪等鍵仍然需要退款，
 * 而新的鍵不會再產生 `walletHeld > 0`。刪掉它們不會有任何測試變紅，
 * 但會讓那些舊鍵永遠退不了款——那是真實的錢。
 */
export function isChainCreditSpendable(): boolean {
  return false;
}

/**
 * Info: (20260814 - Luphia) 讀取成員可用的個人點數（無條件捨去到整數點）。
 *
 * 讀取失敗一律回 0 而非丟錯：這個值只用來決定「要不要放行」，
 * 讓 RPC 抖動把用戶擋在額度已經用完的畫面前，比少放行一次更糟——
 * 真正的扣款在結算時還會再確認一次。
 */
export async function readChainCredits(address: string): Promise<bigint> {
  if (!isChainCreditConfigured()) return BigInt(0);
  try {
    const balance = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.CREDIT_POINT,
      abi: ABIS.CREDIT_POINT,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    })) as bigint;
    // Info: (20260814 - Luphia) 小數部分不足 1 點的零頭不計入可用量
    /**
     * Info: (20260818 - Luphia) 以整數除法換算，不走浮點（第三輪 A-1 附註、CLAUDE.md §2）。
     *
     * 原本是 `BigInt(Math.floor(Number(formatUnits(balance, 18))))`——繞了一趟 float。
     * 目前的點數量級遠低於 2^53 所以不會掉精度，但這是本專案自己立規矩要防的寫法，
     * 而且它就在金額路徑上。整數除法同樣是「無條件捨去到整點」，且永遠精確。
     */
    return balance / BigInt(10) ** BigInt(CREDIT_DECIMALS);
  } catch (error) {
    logger.error("failed to read chain credits", {
      address,
      message: error instanceof Error ? error.message : String(error),
    });
    return BigInt(0);
  }
}

export interface IChainChargeResult {
  charged: boolean;
  txHash?: string;
  reason?: string;
}

/**
 * Info: (20260814 - Luphia) 自成員錢包銷毀點數作為消費扣款。
 *
 * Info: (20260818 - Luphia) 這支的**前提就是錯的**，留著只為了說明錯在哪（見
 * `isChainCreditSpendable` 的更正段）。它假設「由伺服器代為執行、不需要用戶逐次簽章」
 * 是可以用信任模型變更換來的無縫體驗——但條款 §3.3 承諾的正好相反（扣除需經持有人
 * 簽章確認），而部署的合約也沒有給平台那個權限。
 *
 * 要接第二層請改走 `ensurePersonalCreditCharge()` 那條持有人簽章的路，不要沿用這支。
 */
export async function chargeChainCredits(
  address: string,
  points: bigint,
): Promise<IChainChargeResult> {
  if (points <= BigInt(0)) return { charged: false, reason: "non-positive" };

  /**
   * Info: (20260818 - Luphia) 擋在這裡而不是讓它走到 `burn()`：走到底會送出一筆必定
   * revert 的交易，而在 `receipt.status` 的檢查補上之前，那筆 revert 還會被回報成成功。
   */
  if (!isChainCreditSpendable()) {
    return { charged: false, reason: "not-spendable" };
  }
  if (!isChainCreditConfigured()) {
    logger.error("credit point address not configured; cannot charge", {
      address,
    });
    return { charged: false, reason: "not-configured" };
  }

  const balance = await readChainCredits(address);
  if (balance < points) {
    return { charged: false, reason: "insufficient" };
  }

  const result = await burn(
    CONTRACT_ADDRESSES.CREDIT_POINT,
    address,
    Number(points),
  );
  if (!result.success) {
    return { charged: false, reason: result.message ?? "burn failed" };
  }
  return { charged: true, txHash: (result.data as { tx?: string })?.tx };
}
