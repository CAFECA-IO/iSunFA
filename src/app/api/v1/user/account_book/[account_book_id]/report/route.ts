import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { Prisma } from "@/generated/client";
import { generateBalanceSheet } from "@/lib/report/balance_sheet_generator";
import { generateCashFlowStatement } from "@/lib/report/cash_flow_statement_generator";
import { generateIncomeStatement } from "@/lib/report/income_statement_generator";
import { getAccountByCode } from "@/lib/utils/account";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { IAccount } from "@/constants/accounts";
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
        start: new Date(`${selectedYear}-01-01 00:00:00`),
        end: new Date(`${selectedYear}-12-31 23:59:59`),
      };

      switch (period) {
        case ReportPeriod.ALL_YEAR:
          return allYearRange;
        case ReportPeriod.Q1:
          return {
            start: new Date(`${selectedYear}-01-01 00:00:00`),
            end: new Date(`${selectedYear}-03-31 23:59:59`),
          };
        case ReportPeriod.Q2:
          return {
            start: new Date(`${selectedYear}-04-01 00:00:00`),
            end: new Date(`${selectedYear}-06-30 23:59:59`),
          };
        case ReportPeriod.Q3:
          return {
            start: new Date(`${selectedYear}-07-01 00:00:00`),
            end: new Date(`${selectedYear}-09-30 23:59:59`),
          };
        case ReportPeriod.Q4:
          return {
            start: new Date(`${selectedYear}-10-01 00:00:00`),
            end: new Date(`${selectedYear}-12-31 23:59:59`),
          };
        default:
          return allYearRange;
      }
    };

    if (reportType === ReportType.ESG_REPORT) {
      // Info: (20260406 - Luphia) 產出碳盤查報表
      const range = getTradingDateRange();

      const esgRecords = await esgRepo.getEsgRecords({
        where: {
          accountBookId,
          tradingDate: { gte: range.start, lte: range.end },
          isVerified: true,
          deletedAt: null,
        },
      });

      const report = generateEsgReport(esgRecords);
      return jsonOk({ report });
    }

    // Info: (20260408 - Luphia) 資產負債表是從開立帳簿以來的累積餘額，因此不應限制 gte 起始日；損益表與現金流量表則是計算當期發生額，因此需限制 gte。
    const where: Prisma.VoucherWhereInput = {
      accountBookId,
      isVerified: true, // Info: (20260331 - Julian) 僅取得「已核對」
      tradingDate: {
        ...(reportType !== ReportType.BALANCE_SHEET && {
          gte: getTradingDateRange().start,
        }),
        lte: getTradingDateRange().end,
      },
    };

    // Info: (20260331 - Julian) 取得傳票與會計分錄
    const vouchers = await voucherRepo.getVouchers({
      where,
      include: { lines: true },
    });
    const lineItems = vouchers.map((voucher) => voucher.lines).flat();

    // Info: (20260331 - Julian) 格式化會計分錄
    const formattedLineItems: IVoucherLineUI[] = lineItems.map((line) => ({
      ...line,
      particular: line.particular ?? "",
      accounting: getAccountByCode(line.accountingCode) as IAccount,
    }));

    // Info: (20260330 - Julian) 取得報表資料
    const getReportData = () => {
      switch (reportType) {
        case ReportType.BALANCE_SHEET:
          return generateBalanceSheet(formattedLineItems);
        case ReportType.CASH_FLOW:
          return generateCashFlowStatement(formattedLineItems);
        case ReportType.INCOME_STATEMENT:
          return generateIncomeStatement(formattedLineItems);
        default:
          return {};
      }
    };

    const report = await getReportData();

    return jsonOk({ report });
  } catch (error) {
    console.error("Get report failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
