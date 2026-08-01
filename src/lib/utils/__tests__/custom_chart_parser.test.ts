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

  it("should fail when only a legacy header row is present (no data rows)", () => {
    // Info: (20260731 - Julian) legacy 三欄格式：全非數字→視為 header，無資料列
    const result = parseCustomChart(
      CustomChartType.TORNADO,
      "項目, 售價, 成本",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(CustomChartParseErrorCode.NO_DATA_ROWS);
    }
  });

  /**
   * Info: (20260731 - Julian)
   * 新式標題列 `左數列 <-> 右數列`：單一 CSV 欄位，與 3 欄資料列結構互斥。
   * 判定只看結構不看內容，因此數列名為純數字時不再有歧義——這正是 legacy
   * 三欄格式無法解決的問題（見下方最後一則相容性測試）。
   */
  describe("parseCustomChart - tornado 新式標題列（配對分隔符）", () => {
    it("should treat a bare-year pair header as a header, not a data row", () => {
      const raw = ["2019 <-> 2020", "F, 9000, 8800", "D, 6800, 6500"].join(
        "\n",
      );
      const result = parseCustomChart(CustomChartType.TORNADO, raw);
      expect(result.ok).toBe(true);
      if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
      expect(result.ast.leftSeries).toBe("2019");
      expect(result.ast.rightSeries).toBe("2020");
      // Info: (20260731 - Julian) 關鍵：不得出現 category 為「2019」的幽靈長條
      expect(result.ast.bars).toHaveLength(2);
      expect(result.ast.bars.map((b) => b.category)).toEqual(["F", "D"]);
    });

    it.each([
      ["ASCII", "悲觀 <-> 樂觀"],
      ["全形箭號", "悲觀 ↔ 樂觀"],
      ["含 VS16 的箭號", "悲觀 ↔️ 樂觀"],
    ])("should accept the %s separator", (_label, header) => {
      const result = parseCustomChart(
        CustomChartType.TORNADO,
        [header, "A, 1, 2"].join("\n"),
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
      expect(result.ast.leftSeries).toBe("悲觀");
      expect(result.ast.rightSeries).toBe("樂觀");
    });

    it("should leave an empty side undefined", () => {
      const result = parseCustomChart(
        CustomChartType.TORNADO,
        ["<-> 樂觀", "A, 1, 2"].join("\n"),
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
      expect(result.ast.leftSeries).toBeUndefined();
      expect(result.ast.rightSeries).toBe("樂觀");
    });

    it("should reject a header with more than two segments", () => {
      const result = parseCustomChart(
        CustomChartType.TORNADO,
        ["A <-> B <-> C", "X, 1, 2"].join("\n"),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(CustomChartParseErrorCode.MALFORMED_ROW);
      }
    });

    it("should treat a 3-column row as data even if the category contains a separator", () => {
      // Info: (20260731 - Julian) 判定以「欄數 === 1」為前提，故此列仍是資料列
      const result = parseCustomChart(
        CustomChartType.TORNADO,
        '"A<->B", 100, 200',
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
      expect(result.ast.leftSeries).toBeUndefined();
      expect(result.ast.bars).toEqual([
        { category: "A<->B", left: 100, right: 200 },
      ]);
    });

    it("should fail when only a pair header is present (no data rows)", () => {
      const result = parseCustomChart(CustomChartType.TORNADO, "悲觀 <-> 樂觀");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(CustomChartParseErrorCode.NO_DATA_ROWS);
      }
    });

    it("should keep legacy 3-column behaviour unchanged (including its known ambiguity)", () => {
      // Info: (20260731 - Julian) 向後相容回歸：legacy 格式下純數字數列名仍被當成資料列，
      // Info: (20260731 - Julian) 這是既有內容的既定行為，使用者可改用新式文法消除歧義
      const result = parseCustomChart(
        CustomChartType.TORNADO,
        ["項目, 2019, 2020", "F, 9000, 8800"].join("\n"),
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.ast.type !== CustomChartType.TORNADO) return;
      expect(result.ast.leftSeries).toBeUndefined();
      expect(result.ast.bars).toHaveLength(2);
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
