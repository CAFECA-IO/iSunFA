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
import { accountBookCompanyProfileService } from "@/services/account_book_company_profile.service";
import { AccountBookCompanyProfileSchema } from "@/validators/salary_company_profile";

/**
 * Info: (20260914 - Julian) 讀這本帳的公司設定。
 * GET /api/v1/user/account_book/:account_book_id/salary_calculator/company_profile
 *
 * 讀是 `READ`（`OWNER + EDITOR`），寫才是 `SETTINGS_WRITE`（只有 `OWNER`）——
 * 記帳士看得到公司抬頭與特休年度制度是必要的（薪資單上就印著），
 * 但那不代表他該替公司改它。
 *
 * 還沒設定過的帳本回一份空的 ＋ `isConfigured: false`，不是 404：
 * 「還沒設定」是正常狀態，不是找不到東西。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260914 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
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

    return jsonOk(
      await accountBookCompanyProfileService.getProfile(accountBookId),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] account book company profile read failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260914 - Julian) 整份覆寫這本帳的公司設定。
 * PUT /api/v1/user/account_book/:account_book_id/salary_calculator/company_profile
 *
 * ## 為什麼是 `SETTINGS_WRITE` 而不是 `WRITE`
 *
 * `WRITE`（`OWNER + EDITOR`）是「改得動這本帳的薪資資料」——
 * 記帳士的日常。這一支管的是兩件**代表公司做決定**的事：
 *
 * 1. 公司抬頭：每一張薪資單與工資清冊上的署名
 * 2. 特休年度制度：細則 §24 II 明定是**勞雇雙方協商**的結果，
 *    改了它會讓每一位員工的年度終結日整個移位
 *
 * 所以收到 `OWNER` 一人。層級表在 `SALARY_ACCESS_ROLES`，
 * 要調整的是那一行，不是這一支 route。
 *
 * ## 為什麼是 PUT 而不是 PATCH
 *
 * 這是一張表單，送出的就是完整的一份。部分更新會讓「把統編清空」
 * 與「沒有動統編」在 payload 上分不開。
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260914 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.SALARY_WRITE,
    );
    if (limited) return limited;

    const { account_book_id: accountBookId } = await params;
    await assertSalaryAccountBookAccess(
      accountBookId,
      sessionUser.id,
      SalaryAccess.SETTINGS_WRITE,
    );

    const parsed = AccountBookCompanyProfileSchema.safeParse(
      await request.json(),
    );
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    return jsonOk(
      await accountBookCompanyProfileService.saveProfile({
        accountBookId,
        profile: parsed.data,
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
    logger.error("[API] account book company profile save failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
