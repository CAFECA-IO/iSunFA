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
 * Info: (20260724 - Julian) 取得分類帳 (Ledger)
 * GET /api/v1/user/account_book/:account_book_id/ledger
 *   ?startDate={ISO}&endDate={ISO}&startAccountNo=&endAccountNo=&labelType=&sorting=&page=&pageSize=
 *
 * 權限與資料流比照既有 .../report/route.ts：未過濾 isVerified（納入懸記分錄），
 * 分頁作用於報表「明細列」層而非傳票層。
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
    const parsed = LedgerQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      startAccountNo: searchParams.get("startAccountNo") ?? undefined,
      endAccountNo: searchParams.get("endAccountNo") ?? undefined,
      labelType: searchParams.get("labelType") ?? undefined,
      sorting: searchParams.get("sorting") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
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
      page,
      pageSize,
    } = parsed.data;

    // Info: (20260724 - Julian) 取得期間內全部傳票（不分頁、不過濾 isVerified）
    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId: accountBook.id,
      hideDeleted: true,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    // Info: (20260724 - Julian) 取得完整 COA 字典（標準 + 自訂）供帳別葉節點判定
    const dictionary = (await accountingAccountService.getAccountingAccounts(
      accountBook.id,
    )) as IAccount[];

    // Info: (20260724 - Julian) 產生分類帳（純函式；MoneyUtil running balance）
    const ledger = generateLedger(vouchers, dictionary, {
      startAccountNo,
      endAccountNo,
      labelType,
      sorting,
      currencyAlias: accountBook.currency,
    });

    // Info: (20260724 - Julian) 於明細列層分頁
    const totalCount = ledger.items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const pagedItems = ledger.items.slice(start, start + pageSize);

    return jsonOk({
      data: pagedItems,
      page,
      pageSize,
      totalCount,
      totalPages,
      note: {
        currencyAlias: ledger.currencyAlias,
        total: ledger.total,
      },
    });
  } catch (error) {
    console.error("Get ledger failed", error);
    // Info: (20260724 - Julian) 資料整合性錯誤不應偽裝為 DB 失敗
    if (error instanceof Error && /Data Integrity/.test(error.message)) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
