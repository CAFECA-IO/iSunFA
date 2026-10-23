import { describe, it, expect } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync } from "fs";
import { join } from "path";
import {
  FINANCIAL_OPENAPI_ENDPOINTS,
  IFinancialOpenApiEndpoint,
} from "@/constants/company_observatory";
import {
  FINANCIAL_STATEMENT,
  FINANCIAL_UNIT,
} from "@/constants/company_financial";
import {
  financialUnitOf,
  parseFinancialRows,
} from "@/lib/company_observatory/financial_facts";
import { buildFinancialPeriods } from "@/lib/business_monitor/financial_summary";
import { syncFinancialFacts } from "@/services/company_observatory/financial_facts.sync.service";
import {
  renderGhgInventoryText,
  selectGhgItems,
} from "@/services/company_observatory/ghg_inventory.downloader";
import { esgMetricsResponseSchema } from "@/validators/company_observatory";
import { parseGhgInventoryText } from "@/lib/company_observatory/ghg_inventory_text";
import { withEmissionChanges } from "@/lib/business_monitor/emission_summary";
import { IEmissionScope } from "@/interfaces/business_monitor";
import { IFinancialFactInput } from "@/interfaces/company_observatory";

/**
 * Info: (20261023 - Luphia) 企業觀測站第三期：財務數字（OpenAPI）與溫室氣體範疇。
 * 欄位格式取自 20261023 實際回應（上市中文鍵、上櫃混用英文鍵、金控業科目名不同）。
 */

const TWSE_INCOME: IFinancialOpenApiEndpoint = {
  url: "https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci",
  statement: FINANCIAL_STATEMENT.INCOME,
  form: "ci",
};
const TPEX_BALANCE: IFinancialOpenApiEndpoint = {
  url: "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_ci",
  statement: FINANCIAL_STATEMENT.BALANCE,
  form: "ci",
};
const NOW = new Date("2026-10-23T00:00:00Z");

describe("parseFinancialRows", () => {
  it("reads listed rows: ROC year, quarter, numeric items only", () => {
    const facts = parseFinancialRows(
      [
        {
          出表日期: "1151023",
          年度: "115",
          季別: "2",
          公司代號: "1101",
          公司名稱: "台泥",
          營業收入: "71289957.00",
          停業單位損益: "",
          "基本每股盈餘（元）": "0.38",
        },
      ],
      TWSE_INCOME,
      NOW,
    );
    expect(facts).toEqual([
      expect.objectContaining({
        stockId: "1101",
        year: 2026,
        quarter: 2,
        statement: "INCOME",
        item: "營業收入",
        value: "71289957.00",
        unit: FINANCIAL_UNIT.THOUSAND_NTD,
        reportedAt: "1151023",
        sourceUrl: TWSE_INCOME.url,
      }),
      expect.objectContaining({
        item: "基本每股盈餘（元）",
        value: "0.38",
        unit: FINANCIAL_UNIT.NTD,
      }),
    ]);
  });

  it("reads OTC rows whose meta keys are in English or mixed", () => {
    const facts = parseFinancialRows(
      [
        {
          Date: "1151022",
          年度: "115",
          季別: "2",
          SecuritiesCompanyCode: "1240",
          CompanyName: "茂生農經",
          資產總計: "2315123.00",
          庫藏股票: "-979439.00",
          "母公司暨子公司所持有之母公司庫藏股股數（單位：股）": "30000000.00",
          每股參考淨值: "30.86",
        },
      ],
      TPEX_BALANCE,
      NOW,
    );
    expect(facts.map((f) => [f.stockId, f.item, f.value, f.unit])).toEqual([
      ["1240", "資產總計", "2315123.00", "仟元"],
      ["1240", "庫藏股票", "-979439.00", "仟元"],
      [
        "1240",
        "母公司暨子公司所持有之母公司庫藏股股數（單位：股）",
        "30000000.00",
        "股",
      ],
      ["1240", "每股參考淨值", "30.86", "元"],
    ]);
    expect(facts[0].reportedAt).toBe("1151022");
  });

  it("skips rows it cannot place and values that are not numbers", () => {
    const facts = parseFinancialRows(
      [
        { 年度: "115", 季別: "2", 營業收入: "1" },
        { 公司代號: "1101", 年度: "x", 季別: "2", 營業收入: "1" },
        { 公司代號: "1101", 年度: "115", 季別: "5", 營業收入: "1" },
        { 公司代號: "1101", 年度: "115", 季別: "2", 營業收入: "N/A" },
      ],
      TWSE_INCOME,
      NOW,
    );
    expect(facts).toEqual([]);
  });

  it("labels units from the item name", () => {
    expect(financialUnitOf("股本")).toBe("仟元");
    expect(financialUnitOf("待註銷股本股數")).toBe("股");
  });
});

describe("FINANCIAL_OPENAPI_ENDPOINTS", () => {
  it("covers both markets, both statements and six forms", () => {
    expect(FINANCIAL_OPENAPI_ENDPOINTS).toHaveLength(24);
    expect(FINANCIAL_OPENAPI_ENDPOINTS).toContainEqual({
      url: "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_fh",
      statement: "INCOME",
      form: "fh",
    });
  });
});

function row(item: string, value: string, statement = "INCOME") {
  return {
    year: 2026,
    quarter: 2,
    statement,
    item,
    value,
    unit: item.includes("每股") ? "元" : "仟元",
    reportedAt: "1151023",
  };
}

describe("buildFinancialPeriods", () => {
  it("picks key items by the source's own labels and computes ratios with Decimal", () => {
    const [period] = buildFinancialPeriods([
      row("營業收入", "71289957.00"),
      row("本期淨利（淨損）", "4569799.00"),
      row("資產總計", "596016531.00", "BALANCE"),
      row("負債總計", "296694465.00", "BALANCE"),
    ]);
    expect(period.items.map((i) => [i.key, i.label, i.value])).toEqual([
      ["REVENUE", "營業收入", "71289957"],
      ["NET_INCOME", "本期淨利（淨損）", "4569799"],
      ["TOTAL_ASSETS", "資產總計", "596016531"],
      ["TOTAL_LIABILITIES", "負債總計", "296694465"],
    ]);
    expect(period.ratios).toEqual([
      { key: "DEBT_RATIO", value: "49.78" },
      { key: "NET_MARGIN", value: "6.41" },
    ]);
  });

  // Info: (20261023 - Luphia) 金控業的「淨收益」20261023 實測疑似欄位錯位，不能當營收；也不算淨利率
  it("does not treat a financial holding's 淨收益 as revenue", () => {
    const [period] = buildFinancialPeriods([
      row("淨收益", "5446990.00"),
      row("本期稅後淨利（淨損）", "97780594.00"),
      row("資產總額", "13765402889.00", "BALANCE"),
      row("負債總額", "12481299141.00", "BALANCE"),
    ]);
    expect(period.items.some((i) => i.key === "REVENUE")).toBe(false);
    expect(period.ratios).toEqual([{ key: "DEBT_RATIO", value: "90.67" }]);
  });

  it("only computes net margin for 營業收入 and skips zero denominators", () => {
    const [securities] = buildFinancialPeriods([
      row("收益", "100"),
      row("本期淨利（淨損）", "10"),
    ]);
    expect(securities.ratios).toEqual([]);
    const [zero] = buildFinancialPeriods([
      row("資產總計", "0", "BALANCE"),
      row("負債總計", "5", "BALANCE"),
    ]);
    expect(zero.ratios).toEqual([]);
  });

  it("orders periods newest first", () => {
    const periods = buildFinancialPeriods([
      { ...row("營業收入", "1"), year: 2025, quarter: 4 },
      row("營業收入", "2"),
      { ...row("營業收入", "3"), quarter: 1 },
    ]);
    expect(periods.map((p) => `${p.year}Q${p.quarter}`)).toEqual([
      "2026Q2",
      "2026Q1",
      "2025Q4",
    ]);
  });
});

describe("syncFinancialFacts", () => {
  it("keeps going when one endpoint fails and writes the rest", async () => {
    const written: IFinancialFactInput[][] = [];
    const summary = await syncFinancialFacts({
      http: {
        request: async (url: string) =>
          url === FINANCIAL_OPENAPI_ENDPOINTS[0].url
            ? { status: 500, body: Buffer.from("") }
            : {
                status: 200,
                body: Buffer.from(
                  JSON.stringify([
                    { 公司代號: "1101", 年度: "115", 季別: "2", 營業收入: "1" },
                  ]),
                ),
              },
      },
      writeFacts: async (facts) => {
        written.push(facts);
        return facts.length;
      },
      now: () => NOW,
      shouldStop: () => false,
    });
    expect(summary).toEqual({
      endpoints: 24,
      failedEndpoints: 1,
      companies: 1,
      facts: 23,
    });
    expect(written).toHaveLength(23);
  });

  it("stops between endpoints when the worker is shutting down", async () => {
    const request = jest.fn(async () => ({
      status: 200,
      body: Buffer.from("[]"),
    }));
    let calls = 0;
    const summary = await syncFinancialFacts({
      http: { request },
      writeFacts: async () => 0,
      now: () => NOW,
      shouldStop: () => ++calls > 2,
    });
    expect(summary.endpoints).toBe(2);
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("greenhouse gas scopes", () => {
  // Info: (20261023 - Luphia) 與渲染器來回：渲染格式改了而解析器沒跟上，這裡要紅
  it("reads back scope 1-3 from what renderGhgInventoryText wrote", () => {
    const response = esgMetricsResponseSchema.parse(
      JSON.parse(
        readFileSync(
          join(
            process.cwd(),
            "src/__tests__/fixtures/company_observatory/esg_metrics_2330_2024.json",
          ),
          "utf8",
        ),
      ),
    );
    const text = renderGhgInventoryText(
      selectGhgItems(response, "2330"),
      "header",
    );
    const scopes = parseGhgInventoryText(text);
    expect(scopes.map((s) => s.scope)).toEqual(
      expect.arrayContaining(["SCOPE_1", "SCOPE_2"]),
    );
    expect(
      scopes.every((s) => s.value !== "" && s.label.includes("排放量")),
    ).toBe(true);
  });

  it("parses fields by title and ignores non-emission items", () => {
    const scopes = parseGhgInventoryText(
      [
        "【溫室氣體排放】",
        "直接(範疇一)溫室氣體排放量(公噸CO₂e)｜數據：41,020,073.6100",
        "直接(範疇一)溫室氣體排放量(公噸CO₂e)｜資料邊界：合併財務報表之母子公司",
        "直接(範疇一)溫室氣體排放量(公噸CO₂e)｜確信意見：有限保證等級",
        "範疇三-活動類別｜活動類別：購買之商品及勞務",
      ].join("\n"),
    );
    expect(scopes).toEqual([
      expect.objectContaining({
        scope: "SCOPE_1",
        value: "41,020,073.6100",
        boundary: "合併財務報表之母子公司",
        opinion: "有限保證等級",
      }),
    ]);
  });

  function scope(
    value: string,
    boundary: string,
    kind: IEmissionScope["scope"] = "SCOPE_1",
  ): IEmissionScope {
    return {
      label: kind,
      scope: kind,
      value,
      boundary,
      assurer: "",
      standard: "",
      opinion: "",
      changePercent: null,
      boundaryChanged: false,
    };
  }

  it("compares adjacent years only when the boundary is identical", () => {
    const [latest, earlier] = withEmissionChanges([
      {
        year: 2024,
        reportId: 6,
        scopes: [
          scope("39,544,430.9992", "合併財務報表之母子公司"),
          scope("19,338,064.3996", "母公司", "SCOPE_3"),
        ],
      },
      {
        year: 2025,
        reportId: 7,
        scopes: [
          scope("41,020,073.6100", "合併財務報表之母子公司"),
          scope("2,457,225.9000", "母公司,子公司", "SCOPE_3"),
        ],
      },
    ]);
    expect(latest.year).toBe(2025);
    expect(latest.scopes[0]).toMatchObject({
      changePercent: "3.73",
      boundaryChanged: false,
    });
    expect(latest.scopes[1]).toMatchObject({
      changePercent: null,
      boundaryChanged: true,
    });
    expect(earlier.scopes[0].changePercent).toBeNull();
  });
});
