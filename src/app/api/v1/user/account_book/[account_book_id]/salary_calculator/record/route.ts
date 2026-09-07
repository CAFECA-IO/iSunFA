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
  salaryRecordQuerySchema,
  salaryRecordWriteSchema,
  toSalaryRecordWriteInput,
} from "@/validators";

/**
 * Info: (20260831 - Julian) 薪資紀錄清單。
 * GET /api/v1/user/account_book/:account_book_id/salary_calculator/record
 *
 * 可用 `employeeId` / `year` / `month` 篩選，分頁參數 `page` / `pageSize`。
 * 回的是不含快照的摘要 —— 快照兩份加起來近 70 個數字，一頁 20 筆就是 1400 個，
 * 而列表只需要看得出「哪個人、哪個月、領多少」。明細走單筆端點。
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

    const { searchParams } = new URL(request.url);
    const parsed = salaryRecordQuerySchema.safeParse({
      employeeId: searchParams.get("employeeId") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      month: searchParams.get("month") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.READ,
    );

    return jsonOk(
      await salaryRecordService.listRecords({
        // Info: (20260831 - Julian) 帳本來自路徑，不是 query —— 篩選條件不該能改寫租戶
        accountBookId,
        ...parsed.data,
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
    logger.error("[API] salary record list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260831 - Julian) 儲存薪資紀錄（重存即覆寫）。
 * POST /api/v1/user/account_book/:account_book_id/salary_calculator/record
 *
 * 覆寫語意在 repository 靠 `@@unique([accountBookId, employeeId, year, month])` 的
 * upsert 達成，不是先查再決定 —— 那會留下一個競態視窗，
 * 而在薪資上那個視窗的後果是同一個月出現兩筆。
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
    const parsed = salaryRecordWriteSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId } = await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.WRITE,
    );

    return jsonOk(
      await salaryRecordService.saveRecord({
        accountBookId,
        // Info: (20260831 - Julian) 「誰存的」只有一個來源：DeWT 解出來的身分，不是 request body
        userId: sessionUser.id,
        input: toSalaryRecordWriteInput(parsed.data),
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
    logger.error("[API] salary record save failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
