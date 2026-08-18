import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { leavePolicyWriteSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { leavePolicyService } from "@/services/leave_policy.service";

/**
 * Info: (20260818 - Julian) 假別設定的單筆讀取。
 * GET /api/v1/user/account_book/[account_book_id]/hr/leave/policy/:policy_id
 *
 * 計畫書 §10 沒有為它編號 —— 改不了自己看不到的東西，而 L1 回的是
 * 請假的人需要的欄位（不含 `paidRatio` 與給假規則）。理由同 L30 的 GET。
 * 需 `HR_ADMIN` 職能：`paidRatio` 是薪資領域的資訊。
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; policy_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260818 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, policy_id: leavePolicyId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leavePolicyService.read({
        accountBookId,
        actorEmployeeId: actor.id,
        leavePolicyId,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] leave policy read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260818 - Julian) L3：修改假別設定。
 * PUT /api/v1/user/account_book/[account_book_id]/hr/leave/policy/:policy_id
 *
 * ## 全量取代
 *
 * 假別的欄位互相牽制（單位基準決定要不要有分鐘數、給假方式決定能不能有
 * 固定日數）。只送一部分會讓不變式對著一半新一半舊的組合做判斷 ——
 * 而那個組合從來沒有真的存在過。
 *
 * ## 內建假別只開放四類欄位
 *
 * 名稱、最小請假單位、證明文件要求與門檻、遞延月數。其餘（給假方式、
 * 工資比例、雇主有無准駁權…）直接來自法規，改了會讓一個違法的設定
 * 看起來像一筆正常的假別，回 `VA_LEAVE_POLICY_LOCKED_FIELD` 並指出是哪一欄。
 *
 * ## 併計不得成環
 *
 * 家庭照顧假併入事假是有向關係；A→B→A 會讓扣減沿著環一直走。
 * 自指由 `assertLeavePolicyUnit` 擋，更長的環由 `assertNoMergeCycle` 擋。
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; policy_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260818 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const body = await request.json();
    const parsed = leavePolicyWriteSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, policy_id: leavePolicyId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leavePolicyService.update({
        accountBookId,
        actorEmployeeId: actor.id,
        leavePolicyId,
        input: parsed.data,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] leave policy update failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260818 - Julian) L4：停用假別。
 * DELETE /api/v1/user/account_book/[account_book_id]/hr/leave/policy/:policy_id
 *
 * ## 停用不是刪除
 *
 * 已核准的假單與已授予的額度批次都指著這一列（`onDelete: Restrict`）。
 * 刪掉它等於讓歷史假單失去它的規則來源 —— 而「這張三年前的假單當初
 * 是依哪一套規則核的」正是勞檢會問的東西。
 *
 * ## 內建假別不可停用
 *
 * 停掉特休不會讓法定義務消失，只會讓員工請不了假，而
 * `leave_seed_integrity` 對「每個帳本都有完整的內建假別」的保證也會落空。
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; policy_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260818 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, policy_id: leavePolicyId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await leavePolicyService.deactivate({
        accountBookId,
        actorEmployeeId: actor.id,
        leavePolicyId,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] leave policy deactivate failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
