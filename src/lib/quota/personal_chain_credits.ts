import { formatUnits } from "viem";
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
    return BigInt(Math.floor(Number(formatUnits(balance, CREDIT_DECIMALS))));
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
