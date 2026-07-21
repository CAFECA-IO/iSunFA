import {
  parseCustomChart,
  detectCustomChartType,
} from "@/lib/utils/custom_chart_parser";
import {
  CustomChartType,
  CustomChartParseErrorCode,
} from "@/constants/custom_chart";
import { describe, it, expect } from "@jest/globals";

/**
 * Info: (20260717 - Julian)
 * 自訂圖表解析器測試。
 * 重點:決定論解析 + 防呆(多餘空白/換行/註解/emoji 變體不死機)+ 錯誤一律回 ok:false 不 throw。
 */

describe("detectCustomChartType", () => {
  it("should detect each custom fence language", () => {
    expect(detectCustomChartType("custom-matrix")).toBe(CustomChartType.MATRIX);
    expect(detectCustomChartType("custom-tornado")).toBe(
      CustomChartType.TORNADO,
    );
    expect(detectCustomChartType("custom-histogram")).toBe(
      CustomChartType.HISTOGRAM,
    );
    expect(detectCustomChartType("custom-boxplot")).toBe(
      CustomChartType.BOXPLOT,
    );
  });

  it("should be trim/case tolerant and reject non-custom langs", () => {
    expect(detectCustomChartType("  Custom-Boxplot ")).toBe(
      CustomChartType.BOXPLOT,
    );
    expect(detectCustomChartType("mermaid")).toBeNull();
    expect(detectCustomChartType("")).toBeNull();
  });
});

describe("parseCustomChart - matrix", () => {
  it("should parse bipolar axes, points, groups; tolerating comments/blank lines/whitespace/VS16", () => {
    const raw = [
      "%% 這是註解",
      "  title:  行動優先矩陣 ",
      "xAxis: 低難度 <-> 高難度",
      "yAxis: 短期 ↔️ 長期",
      "",
      "導入碳盤查系統 , 3 , 8 , 制度",
      "供應商稽核, 7, 4",
    ].join("\n");

    const result = parseCustomChart(CustomChartType.MATRIX, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.MATRIX) return;

    const ast = result.ast;
    expect(ast.title).toBe("行動優先矩陣");
    expect(ast.xAxis).toEqual({ min: "低難度", max: "高難度" });
    expect(ast.yAxis).toEqual({ min: "短期", max: "長期" });
    expect(ast.points).toEqual([
      { label: "導入碳盤查系統", x: 3, y: 8, group: "制度" },
      { label: "供應商稽核", x: 7, y: 4 },
    ]);
  });

  it("should map single-label axis (no separator) to the max end, and carry scale", () => {
    const raw = ["xAxis: 影響程度", "xScale: 10", "A, 1, 2"].join("\n");
    const result = parseCustomChart(CustomChartType.MATRIX, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.MATRIX) return;
    expect(result.ast.xAxis).toEqual({ max: "影響程度", scale: 10 });
  });
});

describe("parseCustomChart - tornado (paired two-series)", () => {
  it("should auto-detect series names from the header row and parse left/right bars", () => {
    const raw = [
      "title: 各項目價格比較",
      "unit: 元",
      "項目, Prices (2019), Prices (2020)",
      "F, 9000, 8800",
      "D, 6800, 6500",
    ].join("\n");
    const result = parseCustomChart(CustomChartType.TORNADO, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
    expect(result.ast.leftSeries).toBe("Prices (2019)");
    expect(result.ast.rightSeries).toBe("Prices (2020)");
    expect(result.ast.unit).toBe("元");
    expect(result.ast.bars).toHaveLength(2);
    expect(result.ast.bars[0]).toEqual({
      category: "F",
      left: 9000,
      right: 8800,
    });
  });

  it("should leave series names undefined when no header row is present", () => {
    const raw = ["折現率, 1250, 780", "匯率, 1050, 940"].join("\n");
    const result = parseCustomChart(CustomChartType.TORNADO, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
    expect(result.ast.leftSeries).toBeUndefined();
    expect(result.ast.rightSeries).toBeUndefined();
    expect(result.ast.bars).toHaveLength(2);
    expect(result.ast.bars[0]).toEqual({
      category: "折現率",
      left: 1250,
      right: 780,
    });
  });

  it("should require the category label (reject 2-col rows)", () => {
    const raw = ["項目, 售價, 成本", "100, 80"].join("\n");
    const result = parseCustomChart(CustomChartType.TORNADO, raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(CustomChartParseErrorCode.MALFORMED_ROW);
    }
  });

  it("should fail when only a header row is present (no data rows)", () => {
    const raw = "項目, 2019, 2020"; // Info: (20260720 - Julian) header 判定為 2019/2020 皆數字→非 header，視為單筆資料
    const result = parseCustomChart(CustomChartType.TORNADO, raw);
    // Info: (20260721 - Julian) 這其實是一筆有效資料列（category=項目）
    expect(result.ok).toBe(true);
    // Info: (20260721 - Julian) 全非數字→視為 header，無資料列
    const raw2 = "項目, 售價, 成本";
    const r2 = parseCustomChart(CustomChartType.TORNADO, raw2);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.code).toBe(CustomChartParseErrorCode.NO_DATA_ROWS);
  });
});

describe("parseCustomChart - histogram", () => {
  it("should parse pre-binned bins (no auto-binning)", () => {
    const raw = [
      "title: 分布",
      "xAxis: 金額",
      "yAxis: 筆數",
      "0-10, 12",
      "10-20, 34",
    ].join("\n");
    const result = parseCustomChart(CustomChartType.HISTOGRAM, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.HISTOGRAM) return;
    expect(result.ast.bins).toEqual([
      { label: "0-10", count: 12 },
      { label: "10-20", count: 34 },
    ]);
  });
});

describe("parseCustomChart - histogram trend", () => {
  it("should parse the optional trend: normal config", () => {
    const raw = ["title: 分布", "trend: normal", "0-10, 12", "10-20, 34"].join(
      "\n",
    );
    const result = parseCustomChart(CustomChartType.HISTOGRAM, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.HISTOGRAM) return;
    expect(result.ast.trend).toBe("normal");
  });

  it("should reject an unsupported trend value", () => {
    const raw = ["trend: gaussian", "0-10, 12"].join("\n");
    const result = parseCustomChart(CustomChartType.HISTOGRAM, raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(CustomChartParseErrorCode.MALFORMED_ROW);
    }
  });
});

describe("parseCustomChart - box", () => {
  it("should parse five-number summary, decimals, and optional quoted outliers", () => {
    const raw = [
      "title: 差旅費分布",
      "yAxis: 金額",
      "研發部, 1200, 3500, 5000, 7800, 12000",
      '業務部, 900, 2800.5, 4200, 9500, 21000, "25000;28000"',
    ].join("\n");
    const result = parseCustomChart(CustomChartType.BOXPLOT, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.BOXPLOT) return;
    expect(result.ast.boxes[0]).toEqual({
      label: "研發部",
      min: 1200,
      q1: 3500,
      median: 5000,
      q3: 7800,
      max: 12000,
    });
    expect(result.ast.boxes[1].q1).toBe(2800.5);
    expect(result.ast.boxes[1].outliers).toEqual([25000, 28000]);
  });
});

describe("parseCustomChart - fault tolerance (never throws, returns ok:false)", () => {
  it("should fail on empty content", () => {
    const r = parseCustomChart(CustomChartType.MATRIX, "   \n  ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(CustomChartParseErrorCode.EMPTY_CONTENT);
  });

  it("should fail when there are no data rows", () => {
    const r = parseCustomChart(CustomChartType.MATRIX, "title: x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(CustomChartParseErrorCode.NO_DATA_ROWS);
  });

  it("should fail on non-numeric coordinates", () => {
    const r = parseCustomChart(CustomChartType.MATRIX, "A, 3, abc");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(CustomChartParseErrorCode.INVALID_NUMBER);
  });

  it("should fail on malformed row (wrong column count)", () => {
    const r = parseCustomChart(CustomChartType.BOXPLOT, "A, 1, 2, 3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(CustomChartParseErrorCode.MALFORMED_ROW);
  });

  it("should fail on malformed tornado row (wrong column count)", () => {
    const r = parseCustomChart(
      CustomChartType.TORNADO,
      ["項目, 售價, 成本", "A, 1"].join("\n"),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(CustomChartParseErrorCode.MALFORMED_ROW);
  });
});
