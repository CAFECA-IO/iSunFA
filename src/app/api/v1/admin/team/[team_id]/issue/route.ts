import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { issueTeamCreditsByAdmin } from "@/services/team_wallet.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { MoneyUtil } from "@/lib/utils/money";

/**
 * Info: (20260813 - Luphia) 後台發放點數給團隊（/admin/user 的團隊發放）。
 *
 * 與 `/admin/user/[user_id]/issue` 的差別在入帳對象：個人點數是鏈上 mint，
 * 團隊點數是離鏈錢包（ADR 015），因此不經合約、不需等待交易。
 * 兩者一樣要求管理員 FIDO2 簽章——發放點數等同發錢。
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const { user: adminUser, body } = await validateAdminFido2(req);

    const { team_id: teamId } = await params;
    if (!teamId) return jsonFail(API_ERRORS.VL_MISSING_PARAMS);

    const amountDec = MoneyUtil.toDecimal(String(body.amount));
    if (amountDec.isNaN() || amountDec.lte(0) || !amountDec.isInteger()) {
      return jsonFail(API_ERRORS.VA_ISSUE_AMOUNT_MUST_BE_GREATE);
    }

    const result = await issueTeamCreditsByAdmin({
      teamId,
      credits: BigInt(amountDec.toString()),
      operatorUserId: adminUser.id,
    });

    return jsonOk(result, "Issue success");
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /admin/team/[team_id]/issue error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
