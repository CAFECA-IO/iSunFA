import { WalletCustodyType } from "@/constants/auth_provider";
import { custodialKeyRepo } from "@/repositories/custodial_key.repo";

/**
 * Info: (20260810 - Luphia) 判斷一個使用者的錢包是自管（passkey）還是託管。
 *
 * Info: (20260811 - Luphia) 本檔原本還有一支 assertUserApproval()，內容是
 * 「託管使用者一律放行、不驗任何簽章」。它從來沒有任何呼叫者，但留著就是誘餌：
 * 下一個人接到「託管使用者付款失敗」的 bug 時，那看起來就是官方解法。
 * 託管帳號的正確做法是向 /api/v1/auth/custodial/sign 取得一份真正的 WebAuthn
 * assertion（見 custodial_signing.service），既有端點因此完全不需要 bypass 分支。
 */

// Info: (20260810 - Luphia) 以 UserCustodialKey 是否存在為權威依據，不靠 credentialId 前綴猜
export async function resolveCustodyType(
  userId: string,
): Promise<WalletCustodyType> {
  const custodialKey = await custodialKeyRepo.findByUserId(userId);
  return custodialKey ? WalletCustodyType.CUSTODIAL : WalletCustodyType.PASSKEY;
}
