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
import {
  SALARY_DELIVERY_LIST_DEFAULT_LIMIT,
  SALARY_DELIVERY_LIST_MAX_LIMIT,
} from "@/constants/salary_delivery";

/**
 * Info: (20260904 - Julian) 這本帳的薪資單寄送歷史（「已寄出」分頁）。
 * GET /api/v1/user/account_book/:account_book_id/salary_calculator/delivery
 *
 * ## 為什麼是 READ 而不是 WRITE
 *
 * 寄送本身是 `WRITE`，因為它把薪資資料送出組織邊界。**看紀錄不會**送出任何東西 ——
 * 它與「看薪資紀錄清單」是同一類動作，沿用同一個層級與同一個限流桶。
 *
 * 讀取範圍（`VIEWER` 該不該看得到全公司寄了什麼）與計畫書 §13 的薪資資料分級
 * 是同一個決策的兩面，上線前要一起拍板 —— 屆時改的是 `SALARY_ACCESS_ROLES`，
 * 不是這一行。
 *
 * ## 回應裡沒有薪資單快照
 *
 * 清單只回中繼資料。點開某一列時前端再走既有的 `GET record/:record_id` ——
 * 否則開啟分頁就等於把整本帳每一位員工的完整薪資明細送進瀏覽器，
 * 而使用者一次只會看其中一列（見 `ISalaryPaySlipDeliveryListItem` 的說明）。
 */
export async function GET(
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
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId } = await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.READ,
    );

    /**
     * Info: (20260904 - Julian) `limit` 由查詢字串給，但**上限由伺服器決定**。
     *
     * 沒有夾住上限的話，`?limit=999999` 會讓一本累積了幾年寄送紀錄的帳本
     * 在一次請求裡把整張表撈出來 —— 那是使用者送得出來、而不該被採信的東西。
     * 解析不出數字時退回預設值，不報錯：這是清單，不是表單。
     */
    const rawLimit = Number(request.nextUrl.searchParams.get("limit"));
    const limit =
      Number.isSafeInteger(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, SALARY_DELIVERY_LIST_MAX_LIMIT)
        : SALARY_DELIVERY_LIST_DEFAULT_LIMIT;

    return jsonOk(
      await salaryPaySlipDeliveryService.listByAccountBook({
        accountBookId,
        limit,
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
    logger.error("[API] salary pay slip delivery list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
