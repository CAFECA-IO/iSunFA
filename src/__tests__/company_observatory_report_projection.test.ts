import {
  BUSINESS_MONITOR_CAPITAL_RANGE,
  BUSINESS_MONITOR_INDUSTRIES,
} from "@/constants/business_monitor";
import { OBSERVATORY_SOURCE } from "@/constants/company_observatory";
import {
  buildObservatoryReport,
  capitalRangeOf,
  industryNameOf,
  observatoryReportPath,
  paidInCapitalOf,
  parseObservatoryReportPath,
} from "@/lib/company_observatory/report_projection";
import {
  buildObservatoryFilter,
  industryNameOfFilter,
} from "@/lib/company_observatory/business_monitor_bridge";

/**
 * Info: (20261015 - Luphia) 觀測站文件 → 企業觀測站頁面（Report）的投影，以及 AI 諮詢的過濾條件。
 */

describe("observatory report path", () => {
  it("round-trips and rejects anything else", () => {
    const path = observatoryReportPath({
      stockId: "2330",
      year: 2024,
      source: OBSERVATORY_SOURCE.ESG_REPORT,
    });
    expect(path).toBe("observatory/2330/2024/ESG_REPORT");
    expect(parseObservatoryReportPath(path)).toEqual({
      stockId: "2330",
      year: 2024,
      source: OBSERVATORY_SOURCE.ESG_REPORT,
    });
    // Info: (20261015 - Luphia) 手動匯入的報告 pdfPath 是檔名
    expect(parseObservatoryReportPath("台積電_2024.pdf")).toBeNull();
    expect(
      parseObservatoryReportPath("observatory/2330/2024/UNKNOWN"),
    ).toBeNull();
    expect(
      parseObservatoryReportPath("observatory/2330/24/ESG_REPORT"),
    ).toBeNull();
  });
});

describe("observatory report fields", () => {
  it("maps TWSE industry codes and leaves unknown codes empty", () => {
    expect(industryNameOf("24")).toBe("半導體業");
    expect(industryNameOf("99")).toBe("");
    expect(industryNameOf(null)).toBe("");
  });

  it("reads paid-in capital from listed and OTC records", () => {
    expect(paidInCapitalOf({ 實收資本額: "259323700670" })).toBe(
      "259323700670",
    );
    expect(paidInCapitalOf({ "Paidin.Capital.NTDollars": "464439920" })).toBe(
      "464439920",
    );
    expect(paidInCapitalOf({ 實收資本額: "N/A" })).toBeNull();
    expect(paidInCapitalOf(null)).toBeNull();
  });

  it("buckets capital at the exact thresholds", () => {
    expect(capitalRangeOf("999999999")).toBe(
      BUSINESS_MONITOR_CAPITAL_RANGE.UNDER_1B,
    );
    expect(capitalRangeOf("1000000000")).toBe(
      BUSINESS_MONITOR_CAPITAL_RANGE.FROM_1B_TO_5B,
    );
    expect(capitalRangeOf("5000000000")).toBe(
      BUSINESS_MONITOR_CAPITAL_RANGE.FROM_5B_TO_10B,
    );
    expect(capitalRangeOf("10000000000")).toBe(
      BUSINESS_MONITOR_CAPITAL_RANGE.OVER_10B,
    );
    expect(capitalRangeOf(null)).toBe("");
  });

  it("leaves fields the source did not provide empty", () => {
    const report = buildObservatoryReport({
      stockId: "1101",
      year: 2024,
      source: OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
      companyName: "臺灣水泥股份有限公司",
      industryCode: "01",
      companyMetadata: {},
      documentMetadata: null,
    });
    expect(report).toEqual({
      companyName: "臺灣水泥股份有限公司",
      title: "2024 年度財務報告",
      reportYear: "2024",
      period: "",
      industry: "水泥工業",
      capital: "",
      verificationAgency: "",
      verificationStandards: "",
      assuranceAgency: "",
      assuranceStandards: "",
      isVerifiedByThirdParty: false,
      pdfPath: "observatory/1101/2024/MOPS_FINANCIAL_REPORT",
    });
  });

  it("keeps the AI 諮詢 report-type keywords in titles", () => {
    const title = (
      source: (typeof OBSERVATORY_SOURCE)[keyof typeof OBSERVATORY_SOURCE],
    ) =>
      buildObservatoryReport({
        stockId: "2330",
        year: 2024,
        source,
        companyName: "x",
        industryCode: null,
        companyMetadata: null,
        documentMetadata: null,
      }).title;
    expect(title(OBSERVATORY_SOURCE.ESG_REPORT)).toContain("永續報告書");
    expect(title(OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT)).toContain(
      "財務報告",
    );
  });
});

describe("business monitor bridge", () => {
  it("maps industry filter keys to the names stored on reports", () => {
    expect(
      industryNameOfFilter(BUSINESS_MONITOR_INDUSTRIES.SEMICONDUCTOR),
    ).toBe("半導體業");
    expect(industryNameOfFilter("光電業")).toBe("光電業");
  });

  it("filters observatory chunks by company when a company was named", () => {
    expect(
      buildObservatoryFilter(
        true,
        [
          {
            stockId: "2330",
            year: 2024,
            source: OBSERVATORY_SOURCE.ESG_REPORT,
          },
          {
            stockId: "2330",
            year: 2025,
            source: OBSERVATORY_SOURCE.ESG_REPORT,
          },
        ],
        ["永續報告書"],
        ["2024"],
      ),
    ).toEqual({ stockIds: ["2330"], years: [2024] });
  });

  it("drops the year filter when the company has no report for that year", () => {
    const paths = [
      { stockId: "1101", year: 2024, source: OBSERVATORY_SOURCE.ESG_REPORT },
      // Info: (20261015 - Luphia) 公司登記快照的年度不算「有那一年的報告」
      {
        stockId: "1101",
        year: 2026,
        source: OBSERVATORY_SOURCE.GCIS_REGISTRATION,
      },
    ];
    expect(buildObservatoryFilter(true, paths, [], ["2026"])).toEqual({
      stockIds: ["1101"],
      years: undefined,
    });
    expect(buildObservatoryFilter(true, paths, [], ["2024", "2019"])).toEqual({
      stockIds: ["1101"],
      years: [2024],
    });
  });

  it("otherwise filters by report type and year", () => {
    expect(buildObservatoryFilter(false, [], ["永續報告書"], ["2024"])).toEqual(
      {
        sources: [
          OBSERVATORY_SOURCE.ESG_REPORT,
          OBSERVATORY_SOURCE.GHG_INVENTORY,
        ],
        years: [2024],
      },
    );
    expect(buildObservatoryFilter(false, [], [], [])).toEqual({
      sources: undefined,
      years: undefined,
    });
  });
});
