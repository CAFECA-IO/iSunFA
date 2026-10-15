import fs from "node:fs";
import path from "node:path";
import {
  ESG_METRICS_URL,
  ESG_REPORT_LIST_URL,
  GCIS_COMPANY_BASIC_URL,
  GCIS_COMPANY_DIRECTORS_URL,
  MOPS_DOC_QUERY_URL,
  OBSERVATORY_CONTENT_TYPE,
  OBSERVATORY_FETCH_OUTCOME,
  OBSERVATORY_REASON,
} from "@/constants/company_observatory";
import {
  IObservatoryHttpClient,
  IObservatoryHttpRequest,
  IObservatoryTarget,
} from "@/interfaces/company_observatory";
import { ObservatorySourceThrottledError } from "@/lib/company_observatory/errors";
import {
  buildGcisQueryUrl,
  gcisRegistrationDownloader,
} from "@/services/company_observatory/gcis_registration.downloader";
import {
  buildMopsFileUrl,
  mopsFinancialReportDownloader,
  parseMopsFileNames,
  parseMopsTransitLink,
  selectAnnualFinancialFile,
} from "@/services/company_observatory/mops_financial_report.downloader";
import {
  buildEsgReportFileUrl,
  esgReportDownloader,
} from "@/services/company_observatory/esg_report.downloader";
import { ghgInventoryDownloader } from "@/services/company_observatory/ghg_inventory.downloader";
import { decodeBig5 } from "@/lib/company_observatory/content";

/**
 * Info: (20261015 - Luphia) 企業觀測站四支下載器的解析測試。
 * 外部回應全部來自 fixtures（20261015 實際抓取後裁切），以假的 HTTP client 回放，不連外網。
 */

const FIXTURES = path.join(__dirname, "fixtures", "company_observatory");
const fixture = (name: string) => fs.readFileSync(path.join(FIXTURES, name));
const FAKE_PDF = Buffer.from("%PDF-1.7\nfake pdf body");

interface IRecordedRequest {
  url: string;
  init?: IObservatoryHttpRequest;
}

// Info: (20261015 - Luphia) 依網址（含前綴）回放 fixture；沒有登錄的網址直接讓測試失敗
function replayHttp(routes: Array<[string, Buffer, number?]>) {
  const calls: IRecordedRequest[] = [];
  const http: IObservatoryHttpClient = {
    async request(url, init) {
      calls.push({ url, init });
      const route = routes.find(([prefix]) => url.startsWith(prefix));
      if (!route) throw new Error(`unexpected request: ${url}`);
      return { status: route[2] ?? 200, body: route[1] };
    },
  };
  return { http, calls };
}

const target = (
  overrides: Partial<IObservatoryTarget> = {},
): IObservatoryTarget => ({
  stockId: "2330",
  companyName: "台積電",
  marketType: "sii",
  taxId: "22099131",
  year: 2025,
  ...overrides,
});

describe("GCIS registration downloader", () => {
  it("renders basic data and directors verbatim", async () => {
    const { http, calls } = replayHttp([
      [GCIS_COMPANY_BASIC_URL, fixture("gcis_basic_22099131.json")],
      [GCIS_COMPANY_DIRECTORS_URL, fixture("gcis_directors_22099131.json")],
    ]);
    const result = await gcisRegistrationDownloader.fetch(
      target({ year: 2026 }),
      http,
    );

    expect(result.outcome).toBe(OBSERVATORY_FETCH_OUTCOME.FOUND);
    if (result.outcome !== OBSERVATORY_FETCH_OUTCOME.FOUND) return;
    expect(result.contentType).toBe(OBSERVATORY_CONTENT_TYPE.TEXT);
    expect(result.sourceUrl).toBe(
      buildGcisQueryUrl(GCIS_COMPANY_BASIC_URL, "22099131"),
    );
    const text = result.body.toString("utf-8");
    expect(text).toContain("公司名稱：台灣積體電路製造股份有限公司");
    // Info: (20261015 - Luphia) 金額與民國日期原樣照抄，不換算
    expect(text).toContain("實收資本額(元)：259323700670");
    expect(text).toContain("核准設立日期(民國)：0760221");
    expect(text).toContain("董事長｜魏哲家｜－｜7452349");
    expect(text).toContain(
      "董事｜葉俊顯｜行政院國家發展基金管理會｜1653709980",
    );
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain(
      "$filter=Business_Accounting_NO%20eq%2022099131",
    );
  });

  it("is NOT_AVAILABLE without calling out when the company has no tax id", async () => {
    const { http, calls } = replayHttp([]);
    const result = await gcisRegistrationDownloader.fetch(
      target({ taxId: null }),
      http,
    );
    expect(result).toEqual({
      outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
      reason: OBSERVATORY_REASON.MISSING_TAX_ID,
      sourceUrl: null,
    });
    expect(calls).toHaveLength(0);
  });

  it("treats GCIS's empty body as no record", async () => {
    const { http } = replayHttp([[GCIS_COMPANY_BASIC_URL, Buffer.from("")]]);
    const result = await gcisRegistrationDownloader.fetch(target(), http);
    expect(result.outcome).toBe(OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE);
  });

  it("throws on non-200 so the document is retried", async () => {
    const { http } = replayHttp([
      [GCIS_COMPANY_BASIC_URL, Buffer.from(""), 403],
    ]);
    await expect(
      gcisRegistrationDownloader.fetch(target(), http),
    ).rejects.toThrow("GCIS basic HTTP 403");
  });
});

describe("MOPS financial report downloader", () => {
  const listHtml = decodeBig5(fixture("mops_list_2330_114.big5.html"));

  it("parses file names and picks the Q4 consolidated report", () => {
    const names = parseMopsFileNames(listHtml);
    expect(names).toContain("202504_2330_AI1.pdf");
    expect(names).toContain("202504_2330_AI3.pdf");
    expect(selectAnnualFinancialFile(names, "2330", 2025)).toBe(
      "202504_2330_AI1.pdf",
    );
    // Info: (20261015 - Luphia) 沒有合併財報時退回個體財報
    expect(
      selectAnnualFinancialFile(
        names.filter((name) => !name.includes("AI1")),
        "2330",
        2025,
      ),
    ).toBe("202504_2330_AI3.pdf");
    expect(selectAnnualFinancialFile(names, "2330", 2024)).toBeNull();
  });

  it("follows the transit page to the PDF and records the stable step-9 URL", async () => {
    const transit = fixture("mops_transit_2330.big5.html");
    expect(parseMopsTransitLink(decodeBig5(transit))).toBe(
      "https://doc.twse.com.tw/pdf/202504_2330_AI1_20261015_182842.pdf",
    );
    const fileUrl = buildMopsFileUrl("2330", "202504_2330_AI1.pdf");
    const { http, calls } = replayHttp([
      [fileUrl, transit],
      [MOPS_DOC_QUERY_URL, fixture("mops_list_2330_114.big5.html")],
      ["https://doc.twse.com.tw/pdf/", FAKE_PDF],
    ]);
    const result = await mopsFinancialReportDownloader.fetch(target(), http);

    expect(result.outcome).toBe(OBSERVATORY_FETCH_OUTCOME.FOUND);
    if (result.outcome !== OBSERVATORY_FETCH_OUTCOME.FOUND) return;
    expect(result.sourceUrl).toBe(fileUrl);
    expect(result.contentType).toBe(OBSERVATORY_CONTENT_TYPE.PDF);
    // Info: (20261015 - Luphia) 查詢頁標示「曆年制」，年度報告期間即該年全年
    expect(result.metadata).toEqual({ period: "2025/01/01~2025/12/31" });
    expect(result.body.equals(FAKE_PDF)).toBe(true);
    // Info: (20261015 - Luphia) 查詢以民國年送出
    expect(calls[0].init?.body).toContain("year=114");
    expect(calls).toHaveLength(3);
  });

  it("is NOT_AVAILABLE when the year has no annual report", async () => {
    const { http } = replayHttp([
      [MOPS_DOC_QUERY_URL, fixture("mops_list_2330_114.big5.html")],
    ]);
    const result = await mopsFinancialReportDownloader.fetch(
      target({ year: 2024 }),
      http,
    );
    expect(result.outcome).toBe(OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE);
  });

  it("signals throttling instead of failing the document", async () => {
    const { http } = replayHttp([
      [MOPS_DOC_QUERY_URL, fixture("mops_throttled.big5.html")],
    ]);
    await expect(
      mopsFinancialReportDownloader.fetch(target(), http),
    ).rejects.toBeInstanceOf(ObservatorySourceThrottledError);
  });

  it("rejects a non-PDF file", async () => {
    const fileUrl = buildMopsFileUrl("2330", "202504_2330_AI1.pdf");
    const { http } = replayHttp([
      [fileUrl, fixture("mops_transit_2330.big5.html")],
      [MOPS_DOC_QUERY_URL, fixture("mops_list_2330_114.big5.html")],
      ["https://doc.twse.com.tw/pdf/", Buffer.from("<html>error</html>")],
    ]);
    await expect(
      mopsFinancialReportDownloader.fetch(target(), http),
    ).rejects.toThrow("not a PDF");
  });
});

describe("ESG report downloader", () => {
  it("downloads the first-upload file when there is no revision", async () => {
    const fileUrl = buildEsgReportFileUrl(
      "8c57f1eb-a0b8-48c8-9e36-51bc54b70651",
    );
    const { http, calls } = replayHttp([
      [fileUrl, FAKE_PDF],
      [ESG_REPORT_LIST_URL, fixture("esg_report_list_2330_2024.json")],
    ]);
    const result = await esgReportDownloader.fetch(
      target({ year: 2024 }),
      http,
    );

    expect(result.outcome).toBe(OBSERVATORY_FETCH_OUTCOME.FOUND);
    if (result.outcome !== OBSERVATORY_FETCH_OUTCOME.FOUND) return;
    expect(result.sourceUrl).toBe(fileUrl);
    expect(result.metadata.period).toBe("2024/01/01~2024/12/31");
    expect(result.metadata.assuranceAgency).toContain("DNV");
    expect(result.metadata.assuranceStandards).toContain("VeriSustain");
    expect(JSON.parse(calls[0].init?.body ?? "{}")).toMatchObject({
      marketType: 0,
      year: 2024,
      companyCode: "2330",
    });
  });

  it("is NOT_AVAILABLE when only an empty file id is registered", async () => {
    const { http } = replayHttp([
      [ESG_REPORT_LIST_URL, fixture("esg_report_list_no_file.json")],
    ]);
    const result = await esgReportDownloader.fetch(
      target({ year: 2024 }),
      http,
    );
    expect(result).toMatchObject({
      outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
      reason: OBSERVATORY_REASON.NO_FILE,
    });
  });

  it("uses the OTC market code for OTC companies", async () => {
    const { http, calls } = replayHttp([
      [
        ESG_REPORT_LIST_URL,
        Buffer.from(JSON.stringify({ success: true, data: [] })),
      ],
    ]);
    await esgReportDownloader.fetch(target({ marketType: "otc" }), http);
    expect(JSON.parse(calls[0].init?.body ?? "{}").marketType).toBe(1);
  });
});

describe("GHG inventory downloader", () => {
  it("keeps only greenhouse-gas items and copies values verbatim", async () => {
    const { http } = replayHttp([
      [ESG_METRICS_URL, fixture("esg_metrics_2330_2024.json")],
    ]);
    const result = await ghgInventoryDownloader.fetch(
      target({ year: 2024 }),
      http,
    );

    expect(result.outcome).toBe(OBSERVATORY_FETCH_OUTCOME.FOUND);
    if (result.outcome !== OBSERVATORY_FETCH_OUTCOME.FOUND) return;
    const text = result.body.toString("utf-8");
    expect(text).toContain("【溫室氣體排放】");
    expect(text).toContain(
      "直接(範疇一)溫室氣體排放量(公噸CO₂e)｜數據：1,819,396.2945",
    );
    expect(text).toContain("確信標準：ISO14064-3");
    expect(text).not.toContain("【氣候相關議題管理】");
    expect(result.sourceUrl).toBe(
      `${ESG_METRICS_URL}#companyCode=2330&year=2024`,
    );
    expect(result.metadata).toEqual({
      verificationAgency: "DNV,TSMC Washington, LLC確信機構為AWM",
      verificationStandards: "ISO14064-3",
    });
  });

  it("is NOT_AVAILABLE when nothing was declared", async () => {
    const { http } = replayHttp([
      [
        ESG_METRICS_URL,
        Buffer.from(JSON.stringify({ success: true, data: [] })),
      ],
    ]);
    const result = await ghgInventoryDownloader.fetch(target(), http);
    expect(result).toMatchObject({
      outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
      reason: OBSERVATORY_REASON.NO_GHG_ITEMS,
    });
  });
});
