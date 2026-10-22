import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { BILLABLE_FEATURE_CODE } from "@/constants/subscription_quota";
import { BUSINESS_MONITOR_LEGACY_PDF_DIR } from "@/constants/company_observatory";
// Info: (20261022 - Luphia) jest.mock 會被提升到 import 之前，service 的儲存單例因此拿到替身
import { businessMonitorService } from "@/services/business_monitor.service";

/**
 * Info: (20261022 - Luphia) 企業觀測站第一期：AI 諮詢的計費時機與出處、原始檔下載。
 *
 * - 檢索不到資料時不收費（沒有東西可讀還收錢，等於讓使用者為「我們沒有資料」付費）。
 * - 有資料才進計費，功能代碼與冪等鍵要對。
 * - 下載拿到的是保存的原始檔，不是假的 .txt；檔案未備妥與報告不存在分開回報。
 */

const findUniqueMock = jest.fn<(args: unknown) => Promise<unknown>>();
const findManyMock = jest.fn<(args: unknown) => Promise<unknown>>();
const findByCriteriaMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const findByKeyMock = jest.fn<(key: unknown) => Promise<unknown>>();
const vectorSearchMock = jest.fn<() => Promise<unknown>>();
const runBilledMock = jest.fn<(params: unknown) => Promise<unknown>>();
const readMock = jest.fn<(root: string, path: string) => Promise<Buffer>>();

jest.mock("@/repositories/report.repo", () => ({
  reportRepo: {
    findUnique: (args: unknown) => findUniqueMock(args),
    findMany: (args: unknown) => findManyMock(args),
    findByCriteria: (...args: unknown[]) => findByCriteriaMock(...args),
  },
}));
jest.mock("@/repositories/company.repo", () => ({
  companyRepo: {
    findMany: async () => [],
    findUnique: async (args: { where: { stockId: string } }) =>
      args.where.stockId === "1101"
        ? { stockId: "1101", name: "臺灣水泥股份有限公司" }
        : null,
  },
}));
jest.mock("@/repositories/observatory_document.repo", () => ({
  observatoryDocumentRepo: { findByKey: (key: unknown) => findByKeyMock(key) },
}));
jest.mock("@/repositories/observatory_vector.repo", () => ({
  // Info: (20261022 - Luphia) 向量與全文兩路檢索回同一批切塊，RRF 融合後仍是那一筆
  observatoryVectorRepo: {
    search: () => vectorSearchMock(),
    searchText: () => vectorSearchMock(),
  },
}));
jest.mock("@/services/lancedb.service", () => ({
  lanceDBService: {
    getTable: async () => {
      throw new Error("company_reports not initialised");
    },
  },
}));
jest.mock("@/services/carbon_billing.service", () => ({
  runBilledCarbonTask: (params: unknown) => runBilledMock(params),
}));
jest.mock("@/lib/company_observatory/storage", () => ({
  createFileStorage: (root?: string) => ({
    read: (path: string) => readMock(root ?? "OBSERVATORY", path),
    save: async () => {},
  }),
}));

const COMPANY = "臺灣水泥股份有限公司";
const OBSERVATORY_REPORT = {
  id: 42,
  companyName: COMPANY,
  title: "2024 年永續報告書",
  reportYear: "2024",
  period: "",
  industry: "水泥工業",
  capital: "",
  verificationAgency: "",
  verificationStandards: "",
  assuranceAgency: "",
  assuranceStandards: "",
  isVerifiedByThirdParty: false,
  pdfPath: "observatory/1101/2024/ESG_REPORT",
};

const fetchMock = jest.fn<typeof fetch>();
const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
  findManyMock.mockResolvedValue([{ companyName: COMPANY }]);
  fetchMock.mockImplementation(async (url) =>
    String(url).endsWith("/api/embed")
      ? new Response(JSON.stringify({ embeddings: [[0.1, 0.2]] }))
      : new Response(
          JSON.stringify({
            response: "範疇一為 123 公噸 [1][9]",
            prompt_eval_count: 100,
            eval_count: 20,
          }),
        ),
  );
  runBilledMock.mockImplementation(async (params) => ({
    result: await (params as { run: () => Promise<unknown> }).run(),
    billing: {},
  }));
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("businessMonitorService.chat", () => {
  const request = {
    userId: "user-1",
    question: "臺灣水泥 2024 範疇一排放",
    clientMessageId: "msg-1",
  };

  it("answers 'not found' without billing when nothing is retrieved", async () => {
    findByCriteriaMock.mockResolvedValue([]);
    const result = await businessMonitorService.chat(request);
    expect(runBilledMock).not.toHaveBeenCalled();
    expect(result.from).toBe("service");
    expect(result.aiResponse.citations).toEqual([]);
  });

  it("bills under its own feature code and returns resolved citations", async () => {
    findByCriteriaMock.mockResolvedValue([OBSERVATORY_REPORT]);
    vectorSearchMock.mockResolvedValue([
      {
        id: "doc_0",
        text: "範疇一排放量 123 公噸",
        stock_id: "1101",
        company_name: COMPANY,
        source: "ESG_REPORT",
        year: 2024,
        source_url: "https://esggenplus.twse.com.tw/file?id=1",
        page_number: 87,
        _distance: 0.1,
      },
    ]);
    findUniqueMock.mockResolvedValue(OBSERVATORY_REPORT);

    const result = await businessMonitorService.chat(request);

    expect(runBilledMock).toHaveBeenCalledTimes(1);
    expect(runBilledMock.mock.calls[0][0]).toMatchObject({
      userId: "user-1",
      channel: undefined,
      featureCode: BILLABLE_FEATURE_CODE.BUSINESS_MONITOR_CHAT,
      idempotencyKey: "business-monitor-chat:user-1:msg-1",
    });
    // Info: (20261022 - Luphia) [9] 對不到任何證據，從回答移除
    expect(result.aiResponse.answer).toBe("範疇一為 123 公噸 [1]");
    expect(result.aiResponse.citations).toEqual([
      {
        index: 1,
        reportId: 42,
        companyName: COMPANY,
        title: "2024 年永續報告書",
        reportYear: "2024",
        pageNumber: 87,
        sourceUrl: "https://esggenplus.twse.com.tw/file?id=1",
        cited: true,
      },
    ]);
  });
});

describe("businessMonitorService.chat scope", () => {
  const base = { userId: "user-1", clientMessageId: "msg-2" };

  it("uses the company and years the page sent instead of guessing", async () => {
    findByCriteriaMock.mockResolvedValue([OBSERVATORY_REPORT]);
    vectorSearchMock.mockResolvedValue([]);
    const result = await businessMonitorService.chat({
      ...base,
      question: "主要業務是什麼？2023 年的呢",
      scope: { stockId: "1101", years: ["2024"] },
    });
    expect(findByCriteriaMock).toHaveBeenCalledWith([COMPANY], [], ["2024"]);
    expect(result.scope).toEqual({ companies: [COMPANY], years: ["2024"] });
  });

  // Info: (20261022 - Luphia) 該公司沒有那一年的報告時檢索不過濾年度，畫面要照實顯示「不限年度」
  it("reports the years actually applied, not the ones requested", async () => {
    findByCriteriaMock.mockResolvedValue([
      { ...OBSERVATORY_REPORT, pdfPath: "observatory/1101/2024/ESG_REPORT" },
    ]);
    vectorSearchMock.mockResolvedValue([]);
    const result = await businessMonitorService.chat({
      ...base,
      question: "主要業務",
      scope: { stockId: "1101", years: ["2019"] },
    });
    expect(result.scope.years).toEqual([]);
  });

  it("treats an empty year list as 'all years' rather than re-detecting", async () => {
    findByCriteriaMock.mockResolvedValue([]);
    const result = await businessMonitorService.chat({
      ...base,
      question: "臺灣水泥 2024 範疇一",
      scope: { years: [] },
    });
    expect(result.scope.years).toEqual([]);
  });

  it("rejects an unknown company scope", async () => {
    const error = await businessMonitorService
      .chat({ ...base, question: "x", scope: { stockId: "9999" } })
      .catch((e: unknown) => e);
    expect((error as ApiError).code).toBe(
      API_ERRORS.NF_BUSINESS_MONITOR_COMPANY.code,
    );
  });
});

describe("businessMonitorService.getReportFile", () => {
  async function codeOf(promise: Promise<unknown>): Promise<string> {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    return (error as ApiError).code;
  }

  it("reads an observatory report from its downloaded file", async () => {
    findUniqueMock.mockResolvedValue(OBSERVATORY_REPORT);
    findByKeyMock.mockResolvedValue({
      filePath: "1101/2024/ESG_REPORT.pdf",
      contentType: "application/pdf",
    });
    readMock.mockResolvedValue(Buffer.from("%PDF-1.7"));

    const file = await businessMonitorService.getReportFile(42);

    expect(findByKeyMock).toHaveBeenCalledWith({
      stockId: "1101",
      year: 2024,
      source: "ESG_REPORT",
    });
    expect(readMock).toHaveBeenCalledWith(
      "OBSERVATORY",
      "1101/2024/ESG_REPORT.pdf",
    );
    expect(file.body.toString()).toBe("%PDF-1.7");
    expect(file.contentType).toBe("application/pdf");
    expect(file.fileName).toBe(`${COMPANY}_2024 年永續報告書.pdf`);
  });

  it("serves structured sources as plain text", async () => {
    findUniqueMock.mockResolvedValue({
      ...OBSERVATORY_REPORT,
      title: "2025 年公司登記資料",
      pdfPath: "observatory/1101/2025/GCIS_REGISTRATION",
    });
    findByKeyMock.mockResolvedValue({
      filePath: "1101/2025/GCIS_REGISTRATION.txt",
      contentType: "text/plain",
    });
    readMock.mockResolvedValue(Buffer.from("統一編號：11913502"));

    const file = await businessMonitorService.getReportFile(42);
    expect(file.contentType).toBe("text/plain; charset=utf-8");
    expect(file.fileName.endsWith(".txt")).toBe(true);
  });

  it("reads a manually imported report from the legacy pdf folder", async () => {
    findUniqueMock.mockResolvedValue({
      ...OBSERVATORY_REPORT,
      pdfPath: "1101_2023_sustainability.pdf",
    });
    readMock.mockResolvedValue(Buffer.from("%PDF"));

    await businessMonitorService.getReportFile(42);
    expect(readMock).toHaveBeenCalledWith(
      BUSINESS_MONITOR_LEGACY_PDF_DIR,
      "1101_2023_sustainability.pdf",
    );
  });

  it("tells 'no such report' apart from 'file not ready'", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await codeOf(businessMonitorService.getReportFile(1))).toBe(
      API_ERRORS.NF_BUSINESS_MONITOR_REPORT.code,
    );

    findUniqueMock.mockResolvedValue(OBSERVATORY_REPORT);
    findByKeyMock.mockResolvedValue({ filePath: null });
    expect(await codeOf(businessMonitorService.getReportFile(42))).toBe(
      API_ERRORS.NF_BUSINESS_MONITOR_REPORT_FILE.code,
    );

    findByKeyMock.mockResolvedValue({
      filePath: "1101/2024/ESG_REPORT.pdf",
      contentType: "application/pdf",
    });
    readMock.mockRejectedValue(new Error("ENOENT"));
    expect(await codeOf(businessMonitorService.getReportFile(42))).toBe(
      API_ERRORS.NF_BUSINESS_MONITOR_REPORT_FILE.code,
    );
  });
});
