import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { SalaryAccess } from "@/constants/salary_access";
import {
  assertSalaryAccountBookAccess,
  salaryRecordService,
} from "@/services/salary_record.service";
import {
  salaryCalculatorEmployeeWriteSchema,
  toSalaryCalculatorEmployeeWriteInput,
} from "@/validators";

/**
 * Info: (20260831 - Julian) 編輯員工。
 * PUT /api/v1/user/account_book/:account_book_id/salary_calculator/employee/:employee_id
 *
 * 全量更新而非差異更新：表單本來就是把五個欄位一起送上來的，
 * 而差異更新會讓「把員工編號清空」與「沒有動到員工編號」變成同一件事。
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; employee_id: string }> },
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

    const { account_book_id: accountBookId, employee_id: employeeId } =
      await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.WRITE,
    );

    return jsonOk(
      await salaryRecordService.updateEmployee({
        accountBookId,
        employeeId,
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
    logger.error("[API] salary calculator employee update failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260831 - Julian) 刪除員工（soft delete）。
 * DELETE /api/v1/user/account_book/:account_book_id/salary_calculator/employee/:employee_id
 *
 * 軟刪而非硬刪：這個人的薪資紀錄是對外憑據，不能因為名單上把他移掉而消失
 * （計劃書 §2.3）。刪除會讓出 Email，同一個人之後可以重新加入。
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; employee_id: string }> },
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

    const { account_book_id: accountBookId, employee_id: employeeId } =
      await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.WRITE,
    );

    await salaryRecordService.deleteEmployee({ accountBookId, employeeId });

    return jsonOk({ id: employeeId });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] salary calculator employee delete failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
