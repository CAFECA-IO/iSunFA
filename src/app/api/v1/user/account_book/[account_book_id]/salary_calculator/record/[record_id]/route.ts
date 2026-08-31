import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import {
  assertSalaryAccountBookAccess,
  salaryRecordService,
} from "@/services/salary_record.service";

/**
 * Info: (20260831 - Julian) 單筆薪資紀錄（含輸入與結果快照）。
 * GET /api/v1/user/account_book/:account_book_id/salary_calculator/record/:record_id
 *
 * 快照在這裡才回傳：前端用 `result` 餵既有的 `<PaySlip>` 顯示，
 * 用 `input` 把當時的填答載回計算機。
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; record_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260831 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, record_id: recordId } =
      await params;
    await assertSalaryAccountBookAccess(accountBookId, sessionUser.id);

    return jsonOk(
      await salaryRecordService.getRecord({ accountBookId, recordId }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] salary record detail failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260831 - Julian) 刪除薪資紀錄。
 * DELETE /api/v1/user/account_book/:account_book_id/salary_calculator/record/:record_id
 *
 * 硬刪：紀錄沒有「刪了還要看得到」的情境，而重存本來就會覆寫舊值。
 * 需要改動軌跡時走 `AuditLog`，不在這張表堆版本（計劃書 §3.2）。
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; record_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260831 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.SALARY_WRITE,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, record_id: recordId } =
      await params;
    await assertSalaryAccountBookAccess(accountBookId, sessionUser.id);

    await salaryRecordService.deleteRecord({ accountBookId, recordId });

    return jsonOk({ id: recordId });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] salary record delete failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
