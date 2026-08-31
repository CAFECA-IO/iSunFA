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
import {
  salaryCalculatorEmployeeWriteSchema,
  toSalaryCalculatorEmployeeWriteInput,
} from "@/validators";

/**
 * Info: (20260831 - Julian) 薪資計算機的員工名單。
 * GET /api/v1/user/account_book/:account_book_id/salary_calculator/employee
 *
 * 授權走 `assertSalaryAccountBookAccess`（帳本的團隊成員），
 * **不是** HR 那一套的 `resolveEmployee` —— 使用這個工具的是老闆或會計，
 * 他們不必是這個帳本 HR 員工檔上的人（計劃書 §1.3）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
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

    const { account_book_id: accountBookId } = await params;
    await assertSalaryAccountBookAccess(accountBookId, sessionUser.id);

    return jsonOk(await salaryRecordService.listEmployees(accountBookId));
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] salary calculator employee list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260831 - Julian) 新增員工。
 * POST /api/v1/user/account_book/:account_book_id/salary_calculator/employee
 *
 * 員工編號在本帳本重複時回 409（`CF_SALARY_EMPLOYEE_NUMBER_TAKEN`），
 * 由 service 把 repository 的具名錯誤轉過來 —— P2002 不會冒到前端。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
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

    const body = await request.json();
    const parsed = salaryCalculatorEmployeeWriteSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    await assertSalaryAccountBookAccess(accountBookId, sessionUser.id);

    return jsonOk(
      await salaryRecordService.createEmployee({
        accountBookId,
        input: toSalaryCalculatorEmployeeWriteInput(parsed.data),
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
    logger.error("[API] salary calculator employee create failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
