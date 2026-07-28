import { IReportResult } from "@/interfaces/report";
import { IReportQuery } from "@/validators/report";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { accountingAccountService } from "@/services/accounting_account.service";
import { assertAccountBookMember } from "@/services/account_book_access.guard";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { generateTrialBalance } from "@/lib/report/trial_balance_generator";
import { ExportCsvType } from "@/constants/enums";

const DEFAULT_AI_NOTE = "Unknown";

// Info: (20260728 - Julian) 現金流量表期初現金餘額；目前固定為 0，待 Roadmap V2 Sprint 2 支援期初餘額後改為實際值
const OPENING_CASH_BALANCE = 0;

export const reportService = {
  /**
   * Info: (20260728 - Julian)
   * 取得財務/ESG 報表：授權→期間換算→取數→產表→彙整未核對項目。
   * 行為對齊原 report route（僅省略 HTTP 封裝與 token 驗證）。
   */
  async getReport(
    accountBookId: string,
    userId: string,
    query: IReportQuery,
  ): Promise<IReportResult> {
    const accountBook = await assertAccountBookMember(accountBookId, userId);
    const { reportType, period, year, sorting } = query;

    // Info: (20260728 - Julian) 依 ReportPeriod 換算查詢期間；未帶年份則取當年
    const getTradingDateRange = (): { start: Date; end: Date } => {
      const selectedYear = year ?? new Date().getFullYear();

      const allYearRange = {
        start: new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0)),
        end: new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999)),
      };

      switch (period) {
        case ReportPeriod.ALL_YEAR:
          return allYearRange;
        case ReportPeriod.Q1:
          return {
            start: new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0)),
            end: new Date(Date.UTC(selectedYear, 2, 31, 23, 59, 59, 999)),
          };
        case ReportPeriod.Q2:
          return {
            start: new Date(Date.UTC(selectedYear, 3, 1, 0, 0, 0)),
            end: new Date(Date.UTC(selectedYear, 5, 30, 23, 59, 59, 999)),
          };
        case ReportPeriod.Q3:
          return {
            start: new Date(Date.UTC(selectedYear, 6, 1, 0, 0, 0)),
            end: new Date(Date.UTC(selectedYear, 8, 30, 23, 59, 59, 999)),
          };
        case ReportPeriod.Q4:
          return {
            start: new Date(Date.UTC(selectedYear, 9, 1, 0, 0, 0)),
            end: new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999)),
          };
        default:
          return allYearRange;
      }
    };

    // Info: (20260728 - Julian) 碳盤查報表：取 ESG 紀錄（含未核對）→ 產表
    if (reportType === ReportType.ESG_REPORT) {
      const range = getTradingDateRange();
      const esgRecords = await esgRepo.getEsgRecordsByFilter({
        accountBookId: accountBook.id,
        startDate: range.start,
        endDate: range.end,
        hideDeleted: true,
      });

      const unverifiedItems = esgRecords
        .filter((e) => !e.isVerified)
        .map((e) => ({
          id: e.id,
          note: e.aiNote || DEFAULT_AI_NOTE,
          type: ExportCsvType.ESG,
        }));

      const report = generateEsgReport(esgRecords);
      return {
        reportType: ReportType.ESG_REPORT,
        report,
        unverifiedCount: unverifiedItems.length,
        unverifiedItems,
      };
    }

    // Info: (20260728 - Julian) 期間僅計算一次，避免重複 new Date
    const range = getTradingDateRange();

    // Info: (20260728 - Julian) 資產負債表與試算表自開帳起算（含期初），故不限制 gte 起始日；損益表與現金流量表計當期發生額，需限制 gte
    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId: accountBook.id,
      hideDeleted: true,
      startDate:
        reportType !== ReportType.BALANCE_SHEET &&
        reportType !== ReportType.TRIAL_BALANCE
          ? range.start
          : undefined,
      endDate: range.end,
    });
    const lineItems = vouchers.map((voucher) => voucher.lineItems.lines).flat();

    // Info: (20260728 - Julian) 試算表需完整 COA 字典（標準 + 自訂）供樹狀上捲
    const coaDictionary =
      reportType === ReportType.TRIAL_BALANCE
        ? await accountingAccountService.getAccountingAccounts(accountBook.id)
        : [];

    const unverifiedItems = vouchers
      .filter((v) => !v.isVerified)
      .map((v) => ({
        id: v.id,
        note: v.note || v.aiNote || DEFAULT_AI_NOTE,
        type: ExportCsvType.VOUCHER,
      }));
    const base = {
      unverifiedCount: unverifiedItems.length,
      unverifiedItems,
    };

    // Info: (20260728 - Julian) 依 reportType 回傳可判別聯集分支；reportType 已由 Schema 驗證且 ESG 已前置處理
    switch (reportType) {
      case ReportType.BALANCE_SHEET:
        return {
          ...base,
          reportType,
          report: generateBalanceSheet(lineItems, accountBook.parValue),
        };
      case ReportType.CASH_FLOW:
        return {
          ...base,
          reportType,
          report: generateCashFlowStatement(lineItems, OPENING_CASH_BALANCE),
        };
      case ReportType.INCOME_STATEMENT:
        return {
          ...base,
          reportType,
          report: generateIncomeStatement(lineItems),
        };
      case ReportType.TRIAL_BALANCE:
        return {
          ...base,
          reportType,
          report: generateTrialBalance(vouchers, coaDictionary, {
            startDate: range.start,
            endDate: range.end,
            currencyAlias: accountBook.currency,
            sorting,
          }),
        };
      default:
        // Info: (20260728 - Julian) 不可達（reportType 已窮舉），保留 Fail Fast 防呆
        throw new Error("UNSUPPORTED_REPORT_TYPE");
    }
  },
};
