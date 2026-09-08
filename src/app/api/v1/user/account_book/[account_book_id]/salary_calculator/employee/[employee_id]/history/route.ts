import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { SalaryAccess } from "@/constants/salary_access";
import {
  assertSalaryAccountBookAccess,
  salaryRecordService,
} from "@/services/salary_record.service";
import { salaryProfileChangeQuerySchema } from "@/validators";

/**
 * Info: (20260908 - Julian) 某位員工的薪資條件異動軌跡（調薪歷程）。
 * GET /api/v1/user/account_book/:account_book_id/salary_calculator/employee/:employee_id/history
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §6
 *
 * ## 為什麼掛在員工底下，而不是另開一層
 *
 * 查詢的對象就是那一位員工，而它與員工列表共用同一組租戶與授權判斷
 * （形狀照 `salaryRecordDeliverApi` 的先例：掛在被操作的那個東西底下）。
 *
 * ## 授權沿用 `SalaryAccess.READ`
 *
 * 這一支比員工列表更敏感（它揭露歷史金額與「誰改的」），但**不另立層級**：
 * 20260908 的決策是外部觀眾拿到的是匯出檔案而不是帳號
 * （計劃書 §6.3），所以看得到員工列表的人就看得到他的歷程 ——
 * 那兩件事的知情範圍本來就一樣。
 *
 * 已刪除的員工**查得到歷程**：`listProfileChanges` 讀的是異動表，
 * 不濾員工的 `deletedAt`。「刪掉員工，他的調薪歷程也一起消失」
 * 會讓稽核軌跡可以用刪除來規避。
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; employee_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260908 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    const { searchParams } = new URL(request.url);

    /**
     * Info: (20260908 - Julian) 分頁走 `parsePositiveInt`，與稽核紀錄那一支同一套。
     *
     * 先用它把字串收成數字，再交給 zod 驗上限 —— 兩層看起來重複，
     * 但它們守的是不同的東西：`parsePositiveInt` 處理「這個字串不是數字」
     * （給預設值，不讓整頁 400），zod 守的是「pageSize=100000」這種
     * 合法但會把資料庫拖垮的值。
     */
    const parsed = salaryProfileChangeQuerySchema.safeParse({
      page: parsePositiveInt(searchParams.get("page"), { fallback: 1 }),
      pageSize: parsePositiveInt(searchParams.get("pageSize"), {
        fallback: 20,
        max: 100,
      }),
      fields: searchParams.get("fields") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, employee_id: employeeId } =
      await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.READ,
    );

    /**
     * Info: (20260908 - Julian) `fields` 是逗號分隔的欄位名。
     *
     * 空字串會切出 `[""]` —— 那會變成「篩一個叫空字串的欄位」，
     * 也就是一列都撈不到，而使用者看到的是「這個人沒有任何異動」。
     * 過濾掉空元素之後，空字串與沒帶這個參數是同一件事。
     */
    const fields = (parsed.data.fields ?? "")
      .split(",")
      .map((field) => field.trim())
      .filter((field) => field !== "");

    return jsonOk(
      await salaryRecordService.listProfileChanges({
        accountBookId,
        employeeId,
        fields,
        page: parsed.data.page ?? 1,
        pageSize: parsed.data.pageSize ?? 20,
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
    logger.error("[API] salary employee profile change list failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
