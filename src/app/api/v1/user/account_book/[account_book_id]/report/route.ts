import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { esgRepo } from "@/repositories/esg.repo";
import { voucherRepo } from "@/repositories/voucher.repo";

/**
 * Info: (20260330 - Julian) 取得財務報表
 * GET /api/v1/user/account_book/:account_book_id/report?reportType={ReportType}&period={ReportPeriod}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get("reportType") as ReportType;
    const period = searchParams.get("period") as ReportPeriod;
    const yearParam = searchParams.get("year");

    // Info: (20260331 - Julian) 取得期間 Date
    const getTradingDateRange: () => { start: Date; end: Date } = () => {
      const thisYear = new Date().getFullYear();
      const selectedYear = yearParam ? parseInt(yearParam, 10) : thisYear;

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

    if (reportType === ReportType.ESG_REPORT) {
      // Info: (20260406 - Luphia) 產出碳盤查報表
      const range = getTradingDateRange();

      const esgRecords = await esgRepo.getEsgRecordsByFilter({
        accountBookId,
        startDate: range.start,
        endDate: range.end,
        // Info: (20260514 - Tzuhan) 取消 isVerified 限制，將未核對的單據也納入碳排計算，並交由 UI 提示異常
        hideDeleted: true,
      });

      const unverifiedItems = esgRecords
        .filter((e) => !e.isVerified)
        .map((e) => ({
          id: e.id,
          note: e.aiNote || "Unknown",
          type: "esg",
        }));
      const report = generateEsgReport(esgRecords);
      return jsonOk({
        report,
        unverifiedCount: unverifiedItems.length,
        unverifiedItems,
      });
    }

    // Info: (20260408 - Luphia) 資產負債表是從開立帳簿以來的累積餘額，因此不應限制 gte 起始日；損益表與現金流量表則是計算當期發生額，因此需限制 gte。
    // Info: (20260331 - Julian) 取得傳票與會計分錄
    const vouchers = await voucherRepo.getVouchersByFilter({
      accountBookId,
      // Info: (20260514 - Tzuhan) 取消 isVerified 限制，將未核對的傳票也納入財報計算，以反映最真實的狀況
      hideDeleted: true, // Info: (20260504 - Tzuhan) ⚠️修復：排除被軟刪除的傳票
      startDate:
        reportType !== ReportType.BALANCE_SHEET
          ? getTradingDateRange().start
          : undefined,
      endDate: getTradingDateRange().end,
    });
    const lineItems = vouchers.map((voucher) => voucher.lineItems.lines).flat();

    // Info: (20260330 - Julian) 取得報表資料
    const getReportData = () => {
      switch (reportType) {
        case ReportType.BALANCE_SHEET:
          return generateBalanceSheet(lineItems, accountBook.parValue);
        case ReportType.CASH_FLOW:
          return generateCashFlowStatement(lineItems);
        case ReportType.INCOME_STATEMENT:
          return generateIncomeStatement(lineItems);
        default:
          return {};
      }
    };

    const report = await getReportData();
    const unverifiedItems = vouchers
      .filter((v) => !v.isVerified)
      .map((v) => ({
        id: v.id,
        note: v.note || v.aiNote || "Unknown",
        type: "voucher",
      }));

    return jsonOk({
      report,
      unverifiedCount: unverifiedItems.length,
      unverifiedItems,
    });
  } catch (error) {
    console.error("Get report failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
