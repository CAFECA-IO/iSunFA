import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { BUSINESS_MONITOR_DOCUMENT_STATUS } from "@/constants/business_monitor";
// Info: (20261022 - Luphia) jest.mock 會被提升到 import 之前，service 的儲存單例因此拿到替身
import { businessMonitorCompanyService } from "@/services/business_monitor_company.service";

/**
 * Info: (20261022 - Luphia) 公司搜尋與公司頁的組裝：
 * - 搜尋：統編精確比對；名稱與簡稱台／臺都查。
 * - 公司登記不進報告庫，改以「更新於」顯示最新一份。
 * - 報告庫依資料年度分組（新的在前）；已索引但還沒發布成 Report 的不能下載，算排程中。
 */

const companyFindMany = jest.fn<(args: unknown) => Promise<unknown>>();
const companyCount = jest.fn<(args: unknown) => Promise<number>>();
const companyFindUnique = jest.fn<(args: unknown) => Promise<unknown>>();
const listByStockId = jest.fn<(id: string) => Promise<unknown>>();
const countIndexed = jest.fn<(ids: string[]) => Promise<Map<string, number>>>();
const reportFindMany = jest.fn<(args: unknown) => Promise<unknown>>();
const readMock = jest.fn<(path: string) => Promise<Buffer>>();

jest.mock("@/repositories/company.repo", () => ({
  companyRepo: {
    findMany: (args: unknown) => companyFindMany(args),
    count: (args: unknown) => companyCount(args),
    findUnique: (args: unknown) => companyFindUnique(args),
    countActiveByIndustry: async () => [],
  },
}));
jest.mock("@/repositories/observatory_document.repo", () => ({
  observatoryDocumentRepo: {
    listByStockId: (id: string) => listByStockId(id),
    countIndexedByStockIds: (ids: string[]) => countIndexed(ids),
  },
}));
jest.mock("@/repositories/company_financial_fact.repo", () => ({
  companyFinancialFactRepo: { findByStockId: async () => [] },
}));
jest.mock("@/repositories/report.repo", () => ({
  reportRepo: { findMany: (args: unknown) => reportFindMany(args) },
}));
jest.mock("@/lib/company_observatory/storage", () => ({
  createFileStorage: () => ({
    read: (path: string) => readMock(path),
    save: async () => {},
  }),
}));

const COMPANY = {
  stockId: "1101",
  name: "臺灣水泥股份有限公司",
  abbreviation: "台泥",
  marketType: "sii",
  isActive: true,
  taxId: "11913502",
  industry: "01",
  incorporationDate: "19501229",
  listingDate: "19620209",
  symbol: "TCC",
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function doc(
  source: string,
  year: number,
  extra: Record<string, unknown> = {},
) {
  return {
    id: `${source}-${year}`,
    stockId: "1101",
    source,
    year,
    status: "INDEXED",
    title: null,
    sourceUrl: `https://example.test/${source}/${year}`,
    filePath: `1101/${year}/${source}.pdf`,
    contentType: "application/pdf",
    metadata: { period: `${year}/01/01~${year}/12/31` },
    downloadedAt: new Date(`${year + 1}-06-01T00:00:00Z`),
    ...extra,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  countIndexed.mockResolvedValue(new Map([["1101", 5]]));
});

describe("listCompanies", () => {
  it("matches a full tax id exactly", async () => {
    companyCount.mockResolvedValue(1);
    companyFindMany.mockResolvedValue([COMPANY]);
    const result = await businessMonitorCompanyService.listCompanies({
      q: "11913502",
      page: 1,
      pageSize: 8,
    });
    expect(companyCount).toHaveBeenCalledWith({
      where: { isActive: true, taxId: "11913502" },
    });
    expect(result.companies[0]).toMatchObject({
      stockId: "1101",
      industryName: "水泥工業",
      documentCount: 5,
    });
  });

  it("searches names and short names in both 台 and 臺", async () => {
    companyCount.mockResolvedValue(0);
    companyFindMany.mockResolvedValue([]);
    await businessMonitorCompanyService.listCompanies({
      q: "台泥",
      industry: "01",
      page: 2,
      pageSize: 20,
    });
    const args = companyFindMany.mock.calls[0][0] as {
      where: { industry: string; OR: unknown[] };
      skip: number;
    };
    expect(args.where.industry).toBe("01");
    expect(args.where.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: "台泥" } },
        { name: { contains: "臺泥" } },
        { abbreviation: { contains: "台泥" } },
        { stockId: { startsWith: "台泥" } },
      ]),
    );
    expect(args.skip).toBe(20);
  });
});

describe("getCompanyProfile", () => {
  it("rejects an unknown stock id", async () => {
    companyFindUnique.mockResolvedValue(null);
    const error = await businessMonitorCompanyService
      .getCompanyProfile("9999")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(
      API_ERRORS.NF_BUSINESS_MONITOR_COMPANY.code,
    );
  });

  it("shows registration by update date and groups the library by data year", async () => {
    companyFindUnique.mockResolvedValue(COMPANY);
    listByStockId.mockResolvedValue([
      doc("GCIS_REGISTRATION", 2025, {
        filePath: "1101/2025/GCIS_REGISTRATION.txt",
        downloadedAt: new Date("2025-12-01T00:00:00Z"),
      }),
      doc("GCIS_REGISTRATION", 2026, {
        filePath: "1101/2026/GCIS_REGISTRATION.txt",
        downloadedAt: new Date("2026-10-15T12:00:00Z"),
      }),
      doc("ESG_REPORT", 2024),
      doc("ESG_REPORT", 2025, { status: "NOT_AVAILABLE", filePath: null }),
      doc("MOPS_FINANCIAL_REPORT", 2025),
    ]);
    // Info: (20261022 - Luphia) 第一次查觀測站已發布的報告，第二次查手動匯入的
    reportFindMany
      .mockResolvedValueOnce([
        { id: 4, pdfPath: "observatory/1101/2024/ESG_REPORT" },
        { id: 1, pdfPath: "observatory/1101/2026/GCIS_REGISTRATION" },
      ])
      .mockResolvedValueOnce([
        {
          id: 90,
          title: "2023 年永續報告書",
          reportYear: "2023",
          period: "",
          createdAt: new Date("2025-01-01T00:00:00Z"),
        },
      ]);
    readMock.mockResolvedValue(
      Buffer.from("公司登記基本資料（經濟部商業司）\n統一編號：11913502"),
    );

    const profile =
      await businessMonitorCompanyService.getCompanyProfile("1101");

    expect(readMock).toHaveBeenCalledWith("1101/2026/GCIS_REGISTRATION.txt");
    expect(profile.registration).toEqual({
      updatedAt: "2026-10-15T12:00:00.000Z",
      reportId: 1,
      fields: [{ label: "統一編號", value: "11913502" }],
      directors: [],
    });
    expect(profile.library.map((group) => group.year)).toEqual([
      2025, 2024, 2023,
    ]);
    const all = profile.library.flatMap((group) => group.documents);
    expect(all.some((d) => d.source === "GCIS_REGISTRATION")).toBe(false);
    expect(
      all.find((d) => d.source === "ESG_REPORT" && d.year === 2024),
    ).toMatchObject({
      status: BUSINESS_MONITOR_DOCUMENT_STATUS.AVAILABLE,
      reportId: 4,
      period: "2024/01/01~2024/12/31",
    });
    expect(
      all.find((d) => d.source === "ESG_REPORT" && d.year === 2025)?.status,
    ).toBe(BUSINESS_MONITOR_DOCUMENT_STATUS.NOT_PUBLISHED);
    // Info: (20261022 - Luphia) 已索引但沒有 Report 可下載
    expect(all.find((d) => d.source === "MOPS_FINANCIAL_REPORT")?.status).toBe(
      BUSINESS_MONITOR_DOCUMENT_STATUS.PENDING,
    );
    expect(all.find((d) => d.year === 2023)).toMatchObject({
      source: "MANUAL_IMPORT",
      reportId: 90,
    });
  });
});
