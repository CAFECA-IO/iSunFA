import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { SalaryAccess } from "@/constants/salary_access";
import { assertSalaryAccountBookAccess } from "@/services/salary_record.service";
import { salaryPaySlipDeliveryService } from "@/services/salary_pay_slip_delivery.service";

/**
 * Info: (20260904 - Julian) 這一筆薪資紀錄的寄送歷史。
 * GET /api/v1/user/account_book/:account_book_id/salary_calculator/record/:record_id/deliver
 *
 * ## 為什麼需要它
 *
 * 預覽彈窗要在打開的當下決定按鈕寫「寄出」還是「重新寄送」——「這一筆寄過沒有」
 * 是一個只有伺服器答得出來的問題（別人可能剛剛才寄過）。
 *
 * 這也是 `listByRecord` 的讀者。計畫書 §6.3 記著母計畫的教訓：
 * `SalaryRecord.createdByUserId` 加了欄位卻沒有任何讀者，稽核價值等於零。
 * 同樣的道理適用於方法 —— 一支沒有呼叫端的 repository 方法只是還沒被發現的死碼。
 *
 * ## 為什麼是 READ
 *
 * 與 `GET delivery`（整本帳的歷史）同一類：看紀錄不會把資料送出組織邊界。
 * 寄送本身才是 `WRITE`。
 *
 * ## 沒有分頁
 *
 * 一筆薪資紀錄的寄送次數是個位數（補寄、對方說沒收到）。
 * 整本帳的清單才需要上限，那一支在 `salary_calculator/delivery`。
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

    // Info: (20260904 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, record_id: recordId } =
      await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.READ,
    );

    return jsonOk(
      await salaryPaySlipDeliveryService.listByRecord({
        accountBookId,
        recordId,
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
    logger.error("[API] salary pay slip delivery history failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260904 - Julian) 用電子郵件寄出薪資單。
 * POST /api/v1/user/account_book/:account_book_id/salary_calculator/record/:record_id/deliver
 *
 * ## 為什麼掛在薪資紀錄底下
 *
 * 寄送的對象**就是**那一筆紀錄，`record_id` 是它唯一需要的輸入。
 * 另開一個 `/pay_slip/send` 會需要前端再送一次「要寄誰的、哪個月的」——
 * 而那些正是不該由前端指定的東西。
 *
 * ## Body 為空是刻意的
 *
 * 收件人、金額、期間全部由伺服器從那一筆紀錄推導（計畫書 D3）。
 * 允許前端帶收件信箱的話，薪資單可以被寄到任意地址，
 * 而改掉的那一次不會留在員工檔上 —— 事後查不出當初寄去哪。
 *
 * ## 為什麼是 WRITE 而不是 READ
 *
 * 它不改薪資紀錄本身，但**它把薪資資料送出組織邊界** ——
 * 那件事的份量高於「看得到」。`VIEWER` 讀得到薪資單，寄不出去。
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; record_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260904 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.SALARY_MAIL_SEND,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId, record_id: recordId } =
      await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.WRITE,
    );

    return jsonOk(
      await salaryPaySlipDeliveryService.deliver({
        accountBookId,
        recordId,
        // Info: (20260904 - Julian) 寄送者取自 DeWT，不是 body —— 稽核欄位不能由請求指定
        userId: sessionUser.id,
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
    /**
     * Info: (20260904 - Julian) log 不帶收件信箱與姓名 —— 那是 PII，
     * 而這一行的讀者是維運。要查是哪一筆，`recordId` 已經在這裡了。
     */
    logger.error("[API] salary pay slip deliver failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
