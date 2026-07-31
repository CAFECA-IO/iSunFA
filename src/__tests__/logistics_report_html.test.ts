// Info: (20260731 - Tzuhan) 列印用 HTML 產生器測試。
// Info: (20260731 - Tzuhan) PDF 本身需要 Chrome(沙箱與 CI 都沒有),因此把可驗證的部分全部集中在純函數:
// Info: (20260731 - Tzuhan) 數值照抄、缺值不以 0 充數、HTML 逸出、地圖體積裁決。

import { describe, it, expect } from "@jest/globals";
import {
  buildLogisticsReportHtml,
  escapeHtml,
  resolveMapImage,
  type IReportLeg,
} from "@/lib/utils/logistics_report_html";
import { LOGISTICS_PDF_MAP_MAX_BYTES } from "@/constants/logistics_pdf";
import { LogisticsReportPdfRequestSchema } from "@/validators";

const LEGS: IReportLeg[] = [
  {
    mode: "LAND",
    fromName: "高雄港",
    toName: "台北港",
    fromLat: 22.6163,
    fromLng: 120.2818,
    distanceKm: 345.6,
    co2eKg: "41.47",
  },
  {
    mode: "SEA",
    fromName: "台北港",
    toName: "東京港",
    distanceKm: 2136.3,
    co2eKg: "22.32",
    isFallback: true,
  },
];

const baseInput = {
  planCode: "R01-SEA",
  routeLabel: "Route 1",
  planLabel: "Sea Multimodal",
  originLabel: "高雄",
  destLabel: "東京",
  weightKg: "1000",
  planTotalCo2e: "63.79",
  legs: LEGS,
  generatedAt: "2026-07-31",
};

const dataUrlOfBytes = (bytes: number): string =>
  `data:image/jpeg;base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;

describe("buildLogisticsReportHtml", () => {
  it("逐段數值照抄輸入,不重算", () => {
    const html = buildLogisticsReportHtml(baseInput);
    expect(html).toContain("345.6");
    expect(html).toContain("2,136.3");
    expect(html).toContain("41.47");
    expect(html).toContain("22.32");
  });

  it("推估距離標示 est.,不假裝是實測值", () => {
    const html = buildLogisticsReportHtml(baseInput);
    expect(html).toContain("est.");
  });

  it("缺總量時顯示 N/A 而非 0(0 會被讀成「零排放」)", () => {
    const html = buildLogisticsReportHtml({
      ...baseInput,
      planTotalCo2e: undefined,
    });
    expect(html).toContain("N/A");
    expect(html).not.toMatch(/Total 0 kg/);
  });

  it("方案代碼出現在標題與頁面,可與 CSV 交叉對照", () => {
    expect(buildLogisticsReportHtml(baseInput)).toContain("R01-SEA");
  });

  it("地點名稱經 HTML 逸出(注入面)", () => {
    const html = buildLogisticsReportHtml({
      ...baseInput,
      originLabel: '<img src=x onerror="alert(1)">',
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("係數與公式一併輸出,查核者可自行重算", () => {
    const html = buildLogisticsReportHtml(baseInput);
    expect(html).toContain("Leg CO2e = Distance");
    expect(html).toContain("DEFRA");
  });
});

describe("resolveMapImage", () => {
  it("接受合法的 JPEG data URL", () => {
    expect(resolveMapImage(dataUrlOfBytes(1024)).src).not.toBeNull();
  });

  it("超過體積上限即不嵌入(地圖決定整份能否守住預算)", () => {
    const result = resolveMapImage(
      dataUrlOfBytes(LOGISTICS_PDF_MAP_MAX_BYTES + 4096),
    );
    expect(result.src).toBeNull();
    expect(result.reason).toBe("too_large");
  });

  it("非 data URL 或非圖片協定一律拒絕", () => {
    expect(resolveMapImage("javascript:alert(1)").reason).toBe(
      "invalid_format",
    );
    expect(resolveMapImage("https://example.com/a.jpg").reason).toBe(
      "invalid_format",
    );
  });

  it("被拒時報告寫出略過原因,不靜默少一張圖", () => {
    const html = buildLogisticsReportHtml({
      ...baseInput,
      mapImageDataUrl: dataUrlOfBytes(LOGISTICS_PDF_MAP_MAX_BYTES + 4096),
    });
    expect(html).toContain("已略過");
  });
});

describe("escapeHtml", () => {
  it("處理五個必須逸出的字元", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});

describe("LogisticsReportPdfRequestSchema", () => {
  const validReport = {
    planCode: "R01-SEA",
    fileName: "R01-SEA_kaohsiung-tokyo_sea_multimodal.pdf",
    routeLabel: "Route 1",
    planLabel: "Sea Multimodal",
    originLabel: "高雄",
    destLabel: "東京",
    weightKg: "1000",
    planTotalCo2e: "63.79",
    legs: [{ mode: "SEA", fromName: "A", toName: "B", distanceKm: 10 }],
  };

  it("接受合法載荷", () => {
    const parsed = LogisticsReportPdfRequestSchema.safeParse({
      reports: [validReport],
    });
    expect(parsed.success).toBe(true);
  });

  it("拒絕空批次與超量批次(每份都要跑一次 Chrome)", () => {
    expect(
      LogisticsReportPdfRequestSchema.safeParse({ reports: [] }).success,
    ).toBe(false);
    expect(
      LogisticsReportPdfRequestSchema.safeParse({
        reports: Array.from({ length: 61 }, () => validReport),
      }).success,
    ).toBe(false);
  });

  it("拒絕非圖片協定的地圖來源", () => {
    const parsed = LogisticsReportPdfRequestSchema.safeParse({
      reports: [{ ...validReport, mapImageDataUrl: "javascript:alert(1)" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("拒絕越界座標與未知運輸模式", () => {
    expect(
      LogisticsReportPdfRequestSchema.safeParse({
        reports: [
          {
            ...validReport,
            legs: [{ mode: "SEA", fromName: "A", toName: "B", fromLat: 999 }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      LogisticsReportPdfRequestSchema.safeParse({
        reports: [
          {
            ...validReport,
            legs: [{ mode: "ROCKET", fromName: "A", toName: "B" }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
