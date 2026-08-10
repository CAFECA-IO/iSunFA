import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { WalletCustodyType } from "@/constants/auth_provider";
import { custodialKeyRepo } from "@/repositories/custodial_key.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { IUser } from "@/interfaces/user";

/**
 * Info: (20260810 - Luphia) 「使用者同意這個動作」的統一判定。
 *
 * 系統原本只有一種答案：對指定 challenge 的 FIDO2 簽章。第三方登入（ADR 016）之後
 * 出現了沒有 passkey 的託管使用者——他們簽不出任何東西，於是付款、使用優惠券、
 * 邀請成員等所有要求簽章的操作全部走不通。
 *
 * 這裡把判定收斂成一處，避免每個端點各自寫一套「如果是託管就跳過」而漏掉某幾個。
 *
 * 安全上的取捨（必須明講）：
 * 託管使用者沒有第二因素，能授權動作的只有已登入的 DeWT session。
 * 這是 ADR 016 選擇託管式的直接後果——伺服器持有私鑰，session 有效時它本來就能代簽。
 * 因此「付款時再驗一次生物特徵」這層保護對託管使用者並不存在，
 * 相對地 passkey 使用者的驗證強度完全沒有被放寬。
 */

export interface IApprovalResult {
  custody: WalletCustodyType;
}

export interface IAssertApprovalParams {
  user: IUser;
  // Info: (20260810 - Luphia) passkey 使用者必須對這個 challenge 簽章
  challenge: string;
  authentication?: AuthenticationJSON;
  // Info: (20260810 - Luphia) 稽核用：這次同意的是什麼動作
  action: string;
}

// Info: (20260810 - Luphia) 以 UserCustodialKey 是否存在為權威依據，不靠 credentialId 前綴猜
export async function resolveCustodyType(
  userId: string,
): Promise<WalletCustodyType> {
  const custodialKey = await custodialKeyRepo.findByUserId(userId);
  return custodialKey ? WalletCustodyType.CUSTODIAL : WalletCustodyType.PASSKEY;
}

/**
 * Info: (20260810 - Luphia) 驗證使用者對某個動作的同意。
 * passkey 使用者：行為與過去完全相同，缺簽章或驗不過一律拒絕。
 * 託管使用者：以 session 為憑，但每一次都留下稽核紀錄——
 * 這類授權沒有第二因素，紀錄是唯一的事後追查依據。
 */
export async function assertUserApproval(
  params: IAssertApprovalParams,
): Promise<IApprovalResult> {
  const { user, challenge, authentication, action } = params;

  const custody = await resolveCustodyType(user.id);

  if (custody === WalletCustodyType.CUSTODIAL) {
    logger.info("Custodial approval granted by session", {
      userId: user.id,
      address: user.address,
      action,
    });
    return { custody };
  }

  if (!authentication) {
    throw new AppError(API_ERRORS.VL_MISSING_FIDO2);
  }

  // Info: (20260810 - Luphia) 驗不過時 verifySignature 自己會拋 UNAUTHORIZED
  await webAuthnService.verifySignature(
    user.address,
    authentication,
    challenge,
  );

  return { custody };
}
