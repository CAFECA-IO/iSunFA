import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { teamRepo } from "@/repositories/team.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { accountingAccountService } from "@/services/accounting_account.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IAccount } from "@/constants/accounts";
import { TrialBalanceQuerySchema } from "@/validators/trial_balance";
import {
  generateTrialBalance,
  getDefault401Period,
} from "@/lib/report/trial_balance_generator";

/**
 * Info: (20260724 - Julian) 取得試算表 (Trial Balance)
 * GET /api/v1/user/account_book/:account_book_id/trial_balance
 *   ?startDate={ISO}&endDate={ISO}&sorting={TrialBalanceSorting}&page={n}&pageSize={n}
 *
 * 權限與資料流比照既有 .../report/route.ts：未過濾 isVerified（納入懸記分錄），
 * 分頁作用於報表「科目列」層而非傳票層。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260724 - Julian) 驗證身分
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260724 - Julian) 取得帳本（租戶隔離根）
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260724 - Julian) 團隊成員權限檢查（租戶隔離），比照 dashboard 端點
    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    // Info: (20260724 - Julian) 驗證查詢參數
    const searchParams = request.nextUrl.searchParams;
    const parsed = TrialBalanceQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      sorting: searchParams.get("sorting") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_QUERY_PARAMETER_IS_REQUIRED);
    }
    const { startDate, endDate, sorting, page, pageSize } = parsed.data;

    // Info: (20260724 - Julian) 未指定期間時，以當下 401 申報週期為預設
    const { periodBegin, periodEnd } = getDefault401Period();
    const periodStart = startDate ? new Date(startDate) : periodBegin;
    const periodEndDate = endDate ? new Date(endDate) : periodEnd;

    // Info: (20260724 - Julian) 取得截止日前之全部傳票（不分頁、不過濾 isVerified）
    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId: accountBook.id,
      hideDeleted: true,
      endDate: periodEndDate,
    });

    // Info: (20260724 - Julian) 取得完整 COA 字典（標準 + 自訂，不帶 search/type）供樹狀上捲
    const dictionary = (await accountingAccountService.getAccountingAccounts(
      accountBook.id,
    )) as IAccount[];

    // Info: (20260724 - Julian) 產生試算表（純函式；MoneyUtil + AccountUtil；Fail Fast 借貸平衡）
    const trialBalance = generateTrialBalance(vouchers, dictionary, {
      startDate: periodStart,
      endDate: periodEndDate,
      currencyAlias: accountBook.currency,
      sorting,
    });

    // Info: (20260724 - Julian) 於科目列層分頁
    const totalCount = trialBalance.items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = trialBalance.items.slice(start, start + pageSize);

    return jsonOk({
      data: pagedItems,
      page,
      pageSize,
      totalCount,
      totalPages,
      note: {
        currencyAlias: trialBalance.currencyAlias,
        total: trialBalance.total,
      },
    });
  } catch (error) {
    console.error("Get trial balance failed", error);
    // Info: (20260724 - Julian) 決定論護欄（借貸不平衡/資料整合性）錯誤不應偽裝為 DB 失敗
    if (
      error instanceof Error &&
      /Imbalance|Data Integrity/.test(error.message)
    ) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
