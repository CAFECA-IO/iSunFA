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
    expect(detectCustomChartType("custom-box")).toBe(CustomChartType.BOX);
  });

  it("should be trim/case tolerant and reject non-custom langs", () => {
    expect(detectCustomChartType("  Custom-Box ")).toBe(CustomChartType.BOX);
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

describe("parseCustomChart - tornado", () => {
  it("should parse baseline (incl. negative) and absolute low/high bars", () => {
    const raw = [
      "title: NPV 敏感度",
      "baseline: -50",
      "unit: 萬元",
      "折現率, 1250, 780",
      "匯率, 1050, 940",
    ].join("\n");
    const result = parseCustomChart(CustomChartType.TORNADO, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
    expect(result.ast.baseline).toBe(-50);
    expect(result.ast.unit).toBe("萬元");
    expect(result.ast.bars).toHaveLength(2);
    expect(result.ast.bars[0]).toEqual({
      variable: "折現率",
      low: 1250,
      high: 780,
    });
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

describe("parseCustomChart - box", () => {
  it("should parse five-number summary, decimals, and optional quoted outliers", () => {
    const raw = [
      "title: 差旅費分布",
      "yAxis: 金額",
      "研發部, 1200, 3500, 5000, 7800, 12000",
      '業務部, 900, 2800.5, 4200, 9500, 21000, "25000;28000"',
    ].join("\n");
    const result = parseCustomChart(CustomChartType.BOX, raw);
    expect(result.ok).toBe(true);
    if (!result.ok || result.ast.type !== CustomChartType.BOX) return;
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
    const r = parseCustomChart(CustomChartType.BOX, "A, 1, 2, 3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(CustomChartParseErrorCode.MALFORMED_ROW);
  });

  it("should fail when tornado baseline is missing", () => {
    const r = parseCustomChart(CustomChartType.TORNADO, "折現率, 1, 2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(CustomChartParseErrorCode.INVALID_NUMBER);
  });
});
