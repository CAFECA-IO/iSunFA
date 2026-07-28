import { ILedger, ILedgerPageResult } from "@/interfaces/ledger";
import { ILedgerQuery } from "@/validators/ledger";
import { voucherRepo } from "@/repositories/voucher.repo";
import { accountingAccountService } from "@/services/accounting_account.service";
import { generateLedger } from "@/lib/report/ledger_generator";
import { buildLedgerCsv } from "@/lib/report/ledger_csv";
import { assertAccountBookMember } from "@/services/account_book_access.guard";

/**
 * Info: (20260728 - Julian)
 * 分類帳核心資料流（授權→取傳票→取 COA→產生），三個對外方法共用。
 * 日期為可選；未指定則取全部（比照傳票管理）。不過濾 isVerified（懸記一併納入）。
 */
async function buildLedger(
  accountBookId: string,
  userId: string,
  query: ILedgerQuery,
): Promise<ILedger> {
  const accountBook = await assertAccountBookMember(accountBookId, userId);

  const vouchers = await voucherRepo.getVouchersByFilter({
    accountBookId: accountBook.id,
    hideDeleted: true,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  });

  const dictionary = await accountingAccountService.getAccountingAccounts(
    accountBook.id,
  );

  return generateLedger(vouchers, dictionary, {
    startAccountNo: query.startAccountNo,
    endAccountNo: query.endAccountNo,
    keyword: query.keyword,
    accountType: query.accountType,
    rootCode: query.rootCode,
    balanceOp: query.balanceOp,
    balanceValue: query.balanceValue,
    labelType: query.labelType,
    sorting: query.sorting,
    currencyAlias: accountBook.currency,
  });
}

export const ledgerService = {
  /**
   * Info: (20260728 - Julian) 分類帳清單（於明細列層分頁）。
   */
  async getLedger(
    accountBookId: string,
    userId: string,
    query: ILedgerQuery,
  ): Promise<ILedgerPageResult> {
    const ledger = await buildLedger(accountBookId, userId, query);

    const totalCount = ledger.items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / query.pageSize));
    const start = (query.page - 1) * query.pageSize;
    const pagedItems = ledger.items.slice(start, start + query.pageSize);

    return {
      data: pagedItems,
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages,
      note: {
        currencyAlias: ledger.currencyAlias,
        total: ledger.total,
      },
    };
  },

  /**
   * Info: (20260728 - Julian) 分類帳 CSV（全量、加 UTF-8 BOM 避免 Excel 中文亂碼）。
   */
  async getLedgerCsv(
    accountBookId: string,
    userId: string,
    query: ILedgerQuery,
  ): Promise<string> {
    const ledger = await buildLedger(accountBookId, userId, query);
    return "\uFEFF" + buildLedgerCsv(ledger);
  },

  /**
   * Info: (20260728 - Julian) 分類帳匯出筆數 = 明細列數。
   */
  async getLedgerCount(
    accountBookId: string,
    userId: string,
    query: ILedgerQuery,
  ): Promise<number> {
    const ledger = await buildLedger(accountBookId, userId, query);
    return ledger.items.length;
  },
};
