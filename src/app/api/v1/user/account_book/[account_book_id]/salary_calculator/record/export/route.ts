import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonFail, fileOk } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { SalaryAccess } from "@/constants/salary_access";
import {
  assertSalaryAccountBookAccess,
  salaryRecordService,
} from "@/services/salary_record.service";
import { salaryRecordExportSchema } from "@/validators";

/**
 * Info: (20260904 - Julian) 把勾選的薪資紀錄匯出成 CSV。
 * POST /api/v1/user/account_book/:account_book_id/salary_calculator/record/export
 *
 * ## 為什麼是 POST 而不是 GET
 *
 * 要匯出哪幾筆是一組 id，可能上百個 —— 塞進 query string 會撞上網址長度限制，
 * 而那個限制由中間的代理伺服器決定，不是我們能保證的。
 * 它沒有副作用（不改任何資料），但輸入的形狀決定了方法。
 *
 * ## 為什麼是 `READ` 而不是 `WRITE`
 *
 * 匯出的每一格，使用者在畫面上點開薪資單都看得到 —— CSV 沒有給他任何
 * 新的讀取能力，只是換一個格式。這與「寄出薪資單」不同：那個把資料
 * 送到組織外的信箱，所以歸 `WRITE`。
 *
 * 但它**是一次批次擷取**，所以走專屬的 `SALARY_EXPORT` 桶而不是共用 `READ`
 * （同 `ATTENDANCE_EXPORT` 的處置），並且筆數有上限。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260904 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.SALARY_EXPORT,
    );
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    const parsed = salaryRecordExportSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.READ,
    );

    const { csv, exported, requested } =
      await salaryRecordService.exportRecordsCsv({
        accountBookId,
        // Info: (20260904 - Julian) 帳本來自路徑，id 來自 body —— repository 以帳本過濾，猜到別人的 id 也讀不到
        recordIds: parsed.data.recordIds,
      });

    /**
     * Info: (20260904 - Julian) 批次擷取要留痕，但**不記 id、不記金額**。
     *
     * 薪資模組目前沒有稽核表（`AuditLogDataType.EMPLOYEE_PII` 的契約是
     * `dataId` 一律填 `Employee.id`，而 `SalaryCalculatorEmployee` 不是
     * `Employee`，那條路接不上 —— 登記在計畫書裡）。在那之前，
     * 這一行 log 是「有人一次帶走了 N 筆薪資明細」唯一的紀錄。
     *
     * `requested` 與 `exported` 都記：兩者不同代表有 id 查不到
     * （被刪了，或猜的），而那正是值得回頭看的情況。
     */
    logger.info("[salary] records exported", {
      accountBookId,
      userId: sessionUser.id,
      requested,
      exported,
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return fileOk(csv, `salary-records-${stamp}.csv`, "text/csv");
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] salary record export failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
