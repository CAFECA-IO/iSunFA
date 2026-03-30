import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { mockIncomeStatementData } from "@/interfaces/income_statement";
import { mockBalanceSheetData } from "@/interfaces/balance_sheet";
import { mockCashFlowStatementData } from "@/interfaces/cash_flow_statement";
import { ReportType } from "@/constants/financial_report";

/**
 * Info: (20260330 - Julian) 取得財務報表
 * GET /api/v1/user/account_book/:account_book_id/report?reportType={ReportType}
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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get("reportType") as ReportType;
    // const startDate = searchParams.get("startDate");
    // const endDate = searchParams.get("endDate");

    // Info: (20260330 - Julian) 取得報表資料
    // TODO: 串接實際的報表資料
    const getReportData = () => {
      switch (reportType) {
        case ReportType.INCOME_STATEMENT:
          return mockIncomeStatementData;
        case ReportType.BALANCE_SHEET:
          return mockBalanceSheetData;
        case ReportType.CASH_FLOW:
          return mockCashFlowStatementData;
        default:
          return {};
      }
    };

    const report = await getReportData();

    return jsonOk({ report });
  } catch (error) {
    console.error("Get journals failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get journals failed");
  }
}
