import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonFail, fileOk } from "@/lib/utils/response";
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
import { buildTrialBalanceCsv } from "@/lib/report/trial_balance_csv";

/**
 * Info: (20260724 - Julian) 匯出試算表 CSV
 * GET /api/v1/user/account_book/:account_book_id/trial_balance/export
 *   ?startDate={ISO}&endDate={ISO}&sorting={TrialBalanceSorting}
 *
 * 匯出全量（不分頁）；資料源與權限比照清單端點（不過濾 isVerified）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

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

    const searchParams = request.nextUrl.searchParams;
    const parsed = TrialBalanceQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      sorting: searchParams.get("sorting") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_QUERY_PARAMETER_IS_REQUIRED);
    }
    const { startDate, endDate, sorting } = parsed.data;

    const { periodBegin, periodEnd } = getDefault401Period();
    const periodStart = startDate ? new Date(startDate) : periodBegin;
    const periodEndDate = endDate ? new Date(endDate) : periodEnd;

    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId: accountBook.id,
      hideDeleted: true,
      endDate: periodEndDate,
    });

    const dictionary = (await accountingAccountService.getAccountingAccounts(
      accountBook.id,
    )) as IAccount[];

    const trialBalance = generateTrialBalance(vouchers, dictionary, {
      startDate: periodStart,
      endDate: periodEndDate,
      currencyAlias: accountBook.currency,
      sorting,
    });

    // Info: (20260724 - Julian) 加入 UTF-8 BOM，避免 Excel 開啟 CSV 中文亂碼
    const csv = "\uFEFF" + buildTrialBalanceCsv(trialBalance);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    return fileOk(
      csv,
      `trial_balance_${dateStr}.csv`,
      "text/csv; charset=utf-8",
    );
  } catch (error) {
    console.error("Trial balance export failed", error);
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
