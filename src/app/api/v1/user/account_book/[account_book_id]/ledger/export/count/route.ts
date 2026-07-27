import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { teamRepo } from "@/repositories/team.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { accountingAccountService } from "@/services/accounting_account.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IAccount } from "@/constants/accounts";
import { LedgerQuerySchema } from "@/validators/ledger";
import { generateLedger } from "@/lib/report/ledger_generator";

/**
 * Info: (20260727 - Julian) 計算分類帳匯出筆數
 * GET /api/v1/user/account_book/:account_book_id/ledger/export/count
 *   ?startDate&endDate&keyword&labelType&sorting
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

    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = LedgerQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      startAccountNo: searchParams.get("startAccountNo") ?? undefined,
      endAccountNo: searchParams.get("endAccountNo") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,
      accountType: searchParams.get("accountType") ?? undefined,
      balanceOp: searchParams.get("balanceOp") ?? undefined,
      balanceValue: searchParams.get("balanceValue") ?? undefined,
      labelType: searchParams.get("labelType") ?? undefined,
      sorting: searchParams.get("sorting") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_QUERY_PARAMETER_IS_REQUIRED);
    }
    const {
      startDate,
      endDate,
      startAccountNo,
      endAccountNo,
      keyword,
      accountType,
      balanceOp,
      balanceValue,
      labelType,
      sorting,
    } = parsed.data;

    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId: accountBook.id,
      hideDeleted: true,
      // Info: (20260727 - Julian) 日期為可選；未指定則取全部（比照傳票管理）
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    const dictionary = (await accountingAccountService.getAccountingAccounts(
      accountBook.id,
    )) as IAccount[];

    const ledger = generateLedger(vouchers, dictionary, {
      startAccountNo,
      endAccountNo,
      keyword,
      accountType,
      balanceOp,
      balanceValue,
      labelType,
      sorting,
      currencyAlias: accountBook.currency,
    });

    // Info: (20260727 - Julian) 匯出筆數 = 分類帳明細列數
    return jsonOk({ count: ledger.items.length });
  } catch (error) {
    console.error("Ledger export count failed", error);
    if (error instanceof Error && /Data Integrity/.test(error.message)) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
