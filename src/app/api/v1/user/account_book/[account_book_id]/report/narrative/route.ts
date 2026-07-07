import { API_ERRORS } from "@/lib/utils/error_dictionary";

import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { esgRepo } from "@/repositories/esg.repo";
import { ChatService } from "@/services/chat.service";

/**
 * Info: (20260707 - Tzuhan) 取得 ESG 報表的 AI 智能論述
 * GET /api/v1/user/account_book/:account_book_id/report/narrative?reportType=esg_report&period={ReportPeriod}&language={language}
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const reportType = searchParams.get("reportType") as ReportType;
    const period = searchParams.get("period") as ReportPeriod;
    const yearParam = searchParams.get("year");
    const language = searchParams.get("language") || "zh-TW";

    if (reportType !== ReportType.ESG_REPORT) {
      return jsonFail({
        status: ApiCode.VALIDATION_ERROR,
        code: "400",
        message: "Narrative only supports ESG_REPORT currently.",
      });
    }

    const getTradingDateRange = () => {
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

    const range = getTradingDateRange();

    const esgRecords = await esgRepo.getEsgRecordsByFilter({
      accountBookId,
      startDate: range.start,
      endDate: range.end,
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

    // Call AI to generate narrative
    const chatService = new ChatService(process.env.GEMINI_API_KEY || "");
    const rawNarrative = await chatService.generateEsgNarrative(
      report,
      unverifiedItems,
      language,
    );

    let narrative;
    try {
      narrative = JSON.parse(rawNarrative);
    } catch {
      return jsonFail({
        status: ApiCode.INTERNAL_SERVER_ERROR,
        code: "500",
        message: "AI generated invalid JSON",
      });
    }

    return jsonOk({
      narrative,
    });
  } catch (error) {
    console.error("Get report narrative failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
