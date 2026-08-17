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
 * Info: (20260818 - Luphia) 個人鏈上點數目前**不可扣款**（第三輪，調查 20260818）。
 *
 * `CreditPoint` 合約只有 `burnAndUnlock(uint256)`，燒的是呼叫者自己的餘額；
 * **沒有可由平台呼叫的 `burn(address, uint256)`**，代理帳號無權銷毀成員錢包裡的代幣。
 * 也就是說這一層的扣款從來沒有成功過。
 *
 * 在此之前的行為是 fail-**open**：`spendCredits` 把鏈上餘額加進 `available` 當作
 * 放行依據，而扣款必定失敗、餘額永遠不會減少——於是一個持有 ≥1 點的成員可以
 * 無上限消費，成本全部由 `settleSpend` 的追補記到**團隊額度**上。
 * 「因為他有點數所以放行，然後叫團隊付」。
 *
 * 因此在合約補上之前，這一層一律視為不存在：不計入放行、不嘗試扣款。
 *
 * **恢復前必須先做完 A-1**：扣款要先寫一筆 DB 分錄再 burn、成功回填 txHash、
 * 失敗寫反向分錄（照 `allocate()` 已經做對的那條路），並帶冪等鍵。
 * 目前的 `chargeChainCredits` 兩者都沒有——重試就會再燒一次，而且帳上查不到。
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
 * 由伺服器代為執行（agent 權限），不需要用戶逐次簽章——這是「額度用完仍能無縫使用」
 * 的代價，也是必須寫進條款的信任模型變更：系統能在沒有用戶當下授權的情況下
 * 銷毀他錢包裡的點數。範圍限於「已經發生的用量」，且每一筆都有 txHash 可查。
 */
export async function chargeChainCredits(
  address: string,
  points: bigint,
): Promise<IChainChargeResult> {
  if (points <= BigInt(0)) return { charged: false, reason: "non-positive" };

  /**
   * Info: (20260818 - Luphia) 合約沒有可由平台呼叫的 burn（見 isChainCreditSpendable）。
   *
   * 擋在這裡而不是讓它走到 `burn()`：走到底會送出一筆必定 revert 的交易，
   * 而在 `receipt.status` 的檢查補上之前，那筆 revert 還會被回報成成功。
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
