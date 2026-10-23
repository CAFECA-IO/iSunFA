import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  MOPS_DOC_QUERY_URL,
  OBSERVATORY_FETCH_OUTCOME,
  OBSERVATORY_SOURCE,
} from "@/constants/company_observatory";
import {
  firstCheckAt,
  nextRecheckAt,
  targetYearsFor,
} from "@/lib/company_observatory/retry_policy";
import {
  buildMopsFileUrl,
  createMopsFinancialReportDownloader,
  parseMopsAnnualPeriod,
  parseMopsFileNames,
  selectAnnualFinancialFile,
} from "@/services/company_observatory/mops_financial_report.downloader";
import { OBSERVATORY_DOWNLOADERS } from "@/services/company_observatory/downloader.registry";
import { decodeBig5 } from "@/lib/company_observatory/content";
import {
  backfillKey,
  mopsSummaryRequestBody,
  mopsSummarySourceUrl,
  parseMopsSummaryHtml,
  planFinancialBackfill,
} from "@/lib/company_observatory/mops_financial_summary";
import { IObservatoryHttpClient } from "@/interfaces/company_observatory";

/**
 * Info: (20261023 - Luphia) 第三期後半：申報季感知排程、第一～三季財報、MOPS 彙總報表回補。
 * 時間一律以 UTC 寫出台灣時間（UTC+8）的那一刻，與主機時區無關。
 */

const FIXTURES = path.join(__dirname, "fixtures", "company_observatory");
const fixture = (name: string) => fs.readFileSync(path.join(FIXTURES, name));
// Info: (20261023 - Luphia) 台灣時間 yyyy-mm-dd 中午
const twNoon = (iso: string) => new Date(`${iso}T04:00:00Z`);
const DAY = 24 * 60 * 60 * 1000;

describe("nextRecheckAt (filing season)", () => {
  const q3 = OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q3;

  it("waits until the period has ended", () => {
    // Info: (20261023 - Luphia) 第三季 9/30 結束 → 台灣時間 10/1 00:00
    expect(nextRecheckAt(twNoon("2026-05-01"), q3, 2026).toISOString()).toBe(
      "2026-09-30T16:00:00.000Z",
    );
  });

  it("rechecks daily from period end until 14 days after the deadline", () => {
    const now = twNoon("2026-10-23");
    expect(nextRecheckAt(now, q3, 2026).getTime() - now.getTime()).toBe(DAY);
    // Info: (20261023 - Luphia) 期限 11/29（取各業別最晚）＋ 14 天 = 12/13 仍在申報季
    const late = twNoon("2026-12-13");
    expect(nextRecheckAt(late, q3, 2026).getTime() - late.getTime()).toBe(DAY);
  });

  it("drops to monthly after the filing season", () => {
    const now = twNoon("2026-12-20");
    expect(nextRecheckAt(now, q3, 2026).getTime() - now.getTime()).toBe(
      30 * DAY,
    );
  });

  it("uses next year's deadline for annual and sustainability reports", () => {
    const annual = twNoon("2026-04-10");
    expect(
      nextRecheckAt(
        annual,
        OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
        2025,
      ).getTime() - annual.getTime(),
    ).toBe(DAY);
    const esg = twNoon("2026-10-23");
    expect(
      nextRecheckAt(esg, OBSERVATORY_SOURCE.ESG_REPORT, 2025).getTime() -
        esg.getTime(),
    ).toBe(30 * DAY);
  });

  it("keeps the fixed 7-day recheck for registration snapshots", () => {
    const now = twNoon("2026-10-23");
    expect(
      nextRecheckAt(now, OBSERVATORY_SOURCE.GCIS_REGISTRATION, 2026).getTime() -
        now.getTime(),
    ).toBe(7 * DAY);
  });
});

describe("planning quarterly reports", () => {
  it("tracks Q1-Q3 for the current year only", () => {
    const now = twNoon("2026-10-23");
    expect(
      targetYearsFor(OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q1, now),
    ).toEqual([2026]);
    expect(
      targetYearsFor(OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT, now),
    ).toEqual([2025, 2024]);
  });

  it("schedules a not-yet-ended quarter for after its end", () => {
    const january = twNoon("2026-01-05");
    expect(
      firstCheckAt(
        january,
        OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q3,
        2026,
      ).toISOString(),
    ).toBe("2026-09-30T16:00:00.000Z");
    expect(
      firstCheckAt(january, OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT, 2025),
    ).toBe(january);
  });
});

describe("quarterly MOPS financial reports", () => {
  const listHtml = decodeBig5(fixture("mops_list_2330_114.big5.html"));

  it("picks the requested quarter's consolidated report", () => {
    const names = parseMopsFileNames(listHtml);
    expect(selectAnnualFinancialFile(names, "2330", 2025, "01")).toBe(
      "202501_2330_AI1.pdf",
    );
    expect(selectAnnualFinancialFile(names, "2330", 2025, "03")).toBe(
      "202503_2330_AI1.pdf",
    );
  });

  it("fills a year-to-date period for calendar-year companies", () => {
    expect(parseMopsAnnualPeriod(listHtml, 2025, "02")).toBe(
      "2025/01/01~2025/06/30",
    );
  });

  it("registers a downloader for each quarter", async () => {
    expect(OBSERVATORY_DOWNLOADERS.MOPS_FINANCIAL_REPORT_Q2.source).toBe(
      OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
    );
    const fileUrl = buildMopsFileUrl("2330", "202502_2330_AI1.pdf");
    const http: IObservatoryHttpClient = {
      async request(url) {
        if (url === fileUrl) {
          return { status: 200, body: Buffer.from("%PDF-1.7 q2") };
        }
        if (url.startsWith(MOPS_DOC_QUERY_URL)) {
          return { status: 200, body: fixture("mops_list_2330_114.big5.html") };
        }
        throw new Error(`unexpected request: ${url}`);
      },
    };
    const result = await createMopsFinancialReportDownloader(
      OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
      "02",
    ).fetch(
      {
        stockId: "2330",
        companyName: "台積電",
        marketType: "sii",
        taxId: "22099131",
        year: 2025,
      },
      http,
    );
    expect(result.outcome).toBe(OBSERVATORY_FETCH_OUTCOME.FOUND);
    if (result.outcome !== OBSERVATORY_FETCH_OUTCOME.FOUND) return;
    expect(result.title).toBe(
      "台積電 2025 年第二季財務報告書（202502_2330_AI1.pdf）",
    );
    expect(result.metadata).toEqual({ period: "2025/01/01~2025/06/30" });
  });
});

describe("MOPS summary reports", () => {
  const target = {
    year: 2023,
    quarter: 1,
    statement: "BALANCE" as const,
    market: "otc" as const,
  };

  it("builds the POST body and a stable source URL with ROC year and season", () => {
    expect(mopsSummaryRequestBody(target)).toContain(
      "TYPEK=otc&year=112&season=01",
    );
    expect(mopsSummarySourceUrl(target)).toBe(
      "https://mopsov.twse.com.tw/mops/web/ajax_t163sb05#TYPEK=otc&year=112&season=01",
    );
  });

  it("parses every table, strips thousands separators and skips --", () => {
    const facts = parseMopsSummaryHtml(
      fixture("mops_summary_sb05_snippet.html").toString("utf8"),
      target,
      new Date("2026-10-23T00:00:00Z"),
    );
    const byCompany = (id: string) =>
      facts
        .filter((f) => f.stockId === id)
        .map((f) => [f.item, f.value, f.unit, f.form]);
    // Info: (20261023 - Luphia) 「每股參考淨值」的表頭結尾是 </td>，仍要讀得到
    expect(byCompany("1240")).toEqual([
      ["流動資產", "1296825", "仟元", "ci"],
      ["資產總計", "2315123", "仟元", "ci"],
      ["負債總計", "753544", "仟元", "ci"],
      ["每股參考淨值", "32.43", "元", "ci"],
    ]);
    expect(byCompany("4123")).toEqual([
      ["流動資產", "8001", "仟元", "ci"],
      ["資產總計", "-1234", "仟元", "ci"],
      ["負債總計", "0", "仟元", "ci"],
    ]);
    // Info: (20261023 - Luphia) 第二張表沒有可辨識的欄位，不猜格式
    expect(byCompany("5864")[0]).toEqual([
      "現金及約當現金",
      "4908283",
      "仟元",
      "unknown",
    ]);
    expect(facts.every((f) => f.reportedAt === "" && f.market === "otc")).toBe(
      true,
    );
  });
});

describe("planFinancialBackfill", () => {
  const now = twNoon("2026-10-23");

  it("refreshes in-season periods first and skips the OpenAPI period", () => {
    const plan = planFinancialBackfill({
      now,
      present: new Set(),
      openApiPeriods: new Set(["2026|2|sii", "2026|2|otc"]),
    });
    expect(plan.slice(0, 4).map(backfillKey)).toEqual([
      "2026|3|INCOME|sii",
      "2026|3|BALANCE|sii",
      "2026|3|INCOME|otc",
      "2026|3|BALANCE|otc",
    ]);
    expect(plan.some((t) => t.year === 2026 && t.quarter === 2)).toBe(false);
    // Info: (20261023 - Luphia) 第四季（10/1～12/31）還沒結束，不查
    expect(plan.some((t) => t.year === 2026 && t.quarter === 4)).toBe(false);
    expect(plan).toHaveLength(12);
  });

  it("only re-queries past periods that are missing", () => {
    const present = new Set(
      ["INCOME", "BALANCE"].flatMap((statement) =>
        ["sii", "otc"].map((market) => `2026|1|${statement}|${market}`),
      ),
    );
    const plan = planFinancialBackfill({
      now,
      present,
      openApiPeriods: new Set(["2026|2|sii", "2026|2|otc"]),
    });
    expect(plan.some((t) => t.year === 2026 && t.quarter === 1)).toBe(false);
    expect(plan[4]).toEqual({
      year: 2025,
      quarter: 4,
      statement: "INCOME",
      market: "sii",
    });
  });

  it("stops at the oldest tracked year", () => {
    const plan = planFinancialBackfill({
      now,
      present: new Set(),
      openApiPeriods: new Set(),
    });
    expect(plan.every((t) => t.year >= 2024)).toBe(true);
  });
});
