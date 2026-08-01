import { ApiCode } from "@/lib/utils/status";
export class ReportBotService {
  public async generateReport(
    dewt: string,
    apiUrl: string,
    accountBookId: string,
  ): Promise<unknown> {
    console.log(`\n[Bot:Report] Generating financial reports...`);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const reportTypes = [
      "BALANCE_SHEET",
      "CASH_FLOW",
      "INCOME_STATEMENT",
      "ESG_REPORT",
    ];
    const reports: Record<string, unknown> = {};

    for (const reportType of reportTypes) {
      const res = await fetch(
        `${apiUrl}/api/v1/user/account_book/${accountBookId}/report?reportType=${reportType}&period=ALL_YEAR`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${dewt}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await res.json();
      if (res.ok && data.code === ApiCode.SUCCESS) {
        console.log(`[Bot:Report] ${reportType} generated successfully.`);
        reports[reportType] = data.payload.report;
      } else {
        console.error(
          `[Bot:Report] Failed to generate ${reportType}: ${data.message || JSON.stringify(data)}`,
        );
      }
    }

    return reports;
  }
}

export const reportBotService = new ReportBotService();
