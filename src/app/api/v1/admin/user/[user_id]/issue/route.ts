import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { issuePointsByAdmin } from "@/services/point_account.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { MoneyUtil } from "@/lib/utils/money";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const { user: adminUser, body } = await validateAdminFido2(req);

    const { user_id: userId } = await params;
    if (!userId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const amount = String(body.amount);

    /**
     * Info: (20261015 - Luphia) 點數是整數（DB 帳本以 BigInt 記帳，區塊鏈退役）。
     * 原本鏈上是 18 位小數的 ERC-20，小數點數鑄得出去、訂單卻在 `BigInt(amount)` 炸掉。
     */
    const amountDec = MoneyUtil.toDecimal(amount);
    if (amountDec.isNaN() || amountDec.lte(0) || !amountDec.isInteger()) {
      return jsonFail(API_ERRORS.VA_ISSUE_AMOUNT_MUST_BE_GREATE);
    }

    const targetUser = await webAuthnRepo.findUserById(userId);
    if (!targetUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20261015 - Luphia) 建單與入帳在同一筆交易（原本是先鑄造、後建單）
    await issuePointsByAdmin({
      targetUserId: targetUser.id,
      amount: BigInt(amountDec.toFixed(0)),
      adminUserId: adminUser.id,
    });

    return jsonOk(null, "Issue success");
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
