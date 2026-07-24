import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonFail, fileOk } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { accountingAccountService } from "@/services/accounting_account.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IAccount } from "@/constants/accounts";
import { LedgerQuerySchema } from "@/validators/ledger";
import { generateLedger } from "@/lib/report/ledger_generator";
import { buildLedgerCsv } from "@/lib/report/ledger_csv";

/**
 * Info: (20260724 - Julian) 匯出分類帳 CSV
 * GET /api/v1/user/account_book/:account_book_id/ledger/export
 *   ?startDate={ISO}&endDate={ISO}&startAccountNo=&endAccountNo=&labelType=&sorting=
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

    const searchParams = request.nextUrl.searchParams;
    const parsed = LedgerQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      startAccountNo: searchParams.get("startAccountNo") ?? undefined,
      endAccountNo: searchParams.get("endAccountNo") ?? undefined,
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
      labelType,
      sorting,
    } = parsed.data;

    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId: accountBook.id,
      hideDeleted: true,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    const dictionary = (await accountingAccountService.getAccountingAccounts(
      accountBook.id,
    )) as IAccount[];

    const ledger = generateLedger(vouchers, dictionary, {
      startAccountNo,
      endAccountNo,
      labelType,
      sorting,
      currencyAlias: accountBook.currency,
    });

    // Info: (20260724 - Julian) 加入 UTF-8 BOM，避免 Excel 開啟 CSV 中文亂碼
    const csv = "\uFEFF" + buildLedgerCsv(ledger);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    return fileOk(csv, `ledger_${dateStr}.csv`, "text/csv; charset=utf-8");
  } catch (error) {
    console.error("Ledger export failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
