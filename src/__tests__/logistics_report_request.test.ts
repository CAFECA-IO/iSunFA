// Info: (20260731 - Tzuhan) 匯出請求建構器測試(issue 08 步驟一)
// Info: (20260731 - Tzuhan) 前端匯出流程有 WebGL 截圖與 DOM 操作,沙箱與 CI 都跑不了;
// Info: (20260731 - Tzuhan) 因此把「送出去的數字對不對」全部收斂到這一層純函數並在此驗證:
// Info: (20260731 - Tzuhan) 數值照抄不重算、不適用方案不產生檔案、與 CSV 同源、載荷通過 validator。

import { describe, it, expect } from "@jest/globals";
import { ROUTE_MODE } from "@/constants/analysis";
import type { ILogisticsPlan, ITransportSegment } from "@/interfaces/logistics";
import type { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";
import {
  buildMapImageKey,
  buildReportPdfItem,
  buildReportPdfItems,
  chunkReportItems,
} from "@/lib/utils/logistics_report_request";
import { LogisticsReportPdfRequestSchema } from "@/validators";
import { buildBatchSummaryCsv } from "@/lib/utils/logistics_report";

const leg = (
  distanceKm: number,
  co2eKg: string,
  isFallback = false,
): ITransportSegment => ({
  success: true,
  distanceKm,
  co2eKg,
  isFallback,
  geometry: {
    type: "LineString",
    coordinates: [
      [121, 25],
      [122, 26],
    ],
  },
});

// Info: (20260731 - Tzuhan) 跨海路線:陸運不適用,海運/空運適用(沿用 logistics_report 測試的同型資料)
const crossSeaItem: IMileageBatchResult = {
  origin: { lat: 25.03, lng: 121.56, name: "台北市, 信義區" },
  dest: { lat: 31.23, lng: 121.47, name: "Shanghai" },
  mode: ROUTE_MODE.SEA_LAND,
  plan: {
    exportPort: { name: "Keelung", lat: 25.13, lng: 121.74 },
    importPort: { name: "Shanghai Port", lat: 31.23, lng: 121.49 },
    exportAirport: { name: "TPE", lat: 25.08, lng: 121.23 },
    importAirport: { name: "PVG", lat: 31.14, lng: 121.8 },
    comparisonData: {
      success: true,
      plans: {
        landOnly: { success: false, distanceKm: 0, geometry: null },
        sea_multimodal: {
          land_origin_to_port: leg(30, "16.93"),
          sea_port_to_port: leg(800, "41.80", true),
          land_port_to_dest: leg(40, "22.58"),
          total_co2eKg: "81.31",
        },
        air_multimodal: {
          land_origin_to_airport: leg(25, "14.11"),
          air_airport_to_airport: leg(690, "2077.94"),
          land_airport_to_dest: leg(30, "16.93"),
          total_co2eKg: "2108.98",
        },
      },
    },
  } as unknown as ILogisticsPlan,
};

describe("buildReportPdfItem", () => {
  const base = {
    item: crossSeaItem,
    routeIndex: 0,
    fallbackWeightKg: 1000,
  } as const;

  it("逐段數值照抄,不重算也不四捨五入", () => {
    const built = buildReportPdfItem({ ...base, planKey: "sea" });
    expect(built).not.toBeNull();
    expect(built?.legs.map((l) => l.distanceKm)).toEqual([30, 800, 40]);
    expect(built?.legs.map((l) => l.co2eKg)).toEqual([
      "16.93",
      "41.80",
      "22.58",
    ]);
    expect(built?.planTotalCo2e).toBe("81.31");
  });

  it("端點座標帶出港口節點(可回溯,不只有名稱)", () => {
    const built = buildReportPdfItem({ ...base, planKey: "sea" });
    expect(built?.legs[0].toName).toBe("Keelung");
    expect(built?.legs[0].toLat).toBe(25.13);
  });

  it("fallback 旗標保留,估算值不偽裝為實測", () => {
    const built = buildReportPdfItem({ ...base, planKey: "sea" });
    expect(built?.legs[1].isFallback).toBe(true);
    expect(built?.legs[0].isFallback).toBeFalsy();
  });

  it("方案代碼與檔名一致,且與 CSV 的 Code 欄相同", () => {
    const built = buildReportPdfItem({ ...base, planKey: "sea" });
    expect(built?.planCode).toBe("R01-SEA");
    expect(built?.fileName.startsWith("R01-SEA_")).toBe(true);

    const csv = buildBatchSummaryCsv(
      [crossSeaItem],
      [0],
      new Map(),
      1000,
      "20260731-1200",
    );
    expect(csv).toContain("R01-SEA");
  });

  it("該筆自帶重量時優先,缺漏才用批次參數", () => {
    const withWeight: IMileageBatchResult = {
      ...crossSeaItem,
      weightKg: 3000,
    };
    expect(
      buildReportPdfItem({ ...base, item: withWeight, planKey: "sea" })
        ?.weightKg,
    ).toBe("3000");
    expect(buildReportPdfItem({ ...base, planKey: "sea" })?.weightKg).toBe(
      "1000",
    );
  });

  it("無逐段資料的方案回 null(不產生一份空報告)", () => {
    const empty: IMileageBatchResult = {
      ...crossSeaItem,
      plan: undefined,
    } as IMileageBatchResult;
    expect(
      buildReportPdfItem({ ...base, item: empty, planKey: "sea" }),
    ).toBeNull();
  });
});

describe("buildReportPdfItems", () => {
  it("只納入「使用者勾選 ∩ 該路線適用」的方案", () => {
    // Info: (20260731 - Tzuhan) 跨海路線的陸運不適用:即使被勾選也不該產生檔案
    const items = buildReportPdfItems({
      results: [crossSeaItem],
      indices: [0],
      selectedPlans: new Set(["land", "sea", "air"]),
      fallbackWeightKg: 1000,
    });
    const codes = items.map((i) => i.planCode);
    expect(codes).toContain("R01-SEA");
    expect(codes).toContain("R01-AIR");
    expect(codes).not.toContain("R01-LAND");
  });

  it("未勾選的方案不產生檔案", () => {
    const items = buildReportPdfItems({
      results: [crossSeaItem],
      indices: [0],
      selectedPlans: new Set(["sea"]),
      fallbackWeightKg: 1000,
    });
    expect(items.map((i) => i.planCode)).toEqual(["R01-SEA"]);
  });

  it("地圖素材按 (路線, 方案) 對應,不同方案不共用同一張圖", () => {
    const captures = new Map([
      [
        buildMapImageKey(0, "sea"),
        {
          overview: {
            dataUrl: "data:image/jpeg;base64,AAAA",
            metersPerPixel: 120,
          },
          legs: [
            { dataUrl: "data:image/jpeg;base64,BBBB", metersPerPixel: 30 },
            null,
            { dataUrl: "data:image/jpeg;base64,CCCC", metersPerPixel: 45 },
          ],
        },
      ],
    ]);
    const items = buildReportPdfItems({
      results: [crossSeaItem],
      indices: [0],
      selectedPlans: new Set(["sea", "air"]),
      fallbackWeightKg: 1000,
      mapCaptures: captures,
    });
    const sea = items.find((i) => i.planCode === "R01-SEA");
    const air = items.find((i) => i.planCode === "R01-AIR");
    expect(sea?.mapImageDataUrl).toBe("data:image/jpeg;base64,AAAA");
    expect(sea?.metersPerPixel).toBe(120);
    expect(air?.mapImageDataUrl).toBeUndefined();
  });

  it("逐段地圖依索引對應該段,缺圖的段留空而非位移", () => {
    const captures = new Map([
      [
        buildMapImageKey(0, "sea"),
        {
          overview: null,
          legs: [
            { dataUrl: "data:image/jpeg;base64,BBBB", metersPerPixel: 30 },
            null,
            { dataUrl: "data:image/jpeg;base64,CCCC", metersPerPixel: 45 },
          ],
        },
      ],
    ]);
    const items = buildReportPdfItems({
      results: [crossSeaItem],
      indices: [0],
      selectedPlans: new Set(["sea"]),
      fallbackWeightKg: 1000,
      mapCaptures: captures,
    });
    const legs = items[0].legs;
    // Info: (20260731 - Tzuhan) 中間那段缺圖時,第三段的圖不可被誤填到第二段
    expect(legs[0].mapImageDataUrl).toBe("data:image/jpeg;base64,BBBB");
    expect(legs[1].mapImageDataUrl).toBeUndefined();
    expect(legs[2].mapImageDataUrl).toBe("data:image/jpeg;base64,CCCC");
    expect(legs[2].metersPerPixel).toBe(45);
  });

  it("產出的載荷通過 API validator(前後端契約一致)", () => {
    const items = buildReportPdfItems({
      results: [crossSeaItem],
      indices: [0],
      selectedPlans: new Set(["sea", "air"]),
      fallbackWeightKg: 1000,
    });
    const parsed = LogisticsReportPdfRequestSchema.safeParse({
      reports: items,
      exportId: "20260731-1200",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("chunkReportItems", () => {
  it("依批量切割,最後一批可不足量", () => {
    expect(chunkReportItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("批量非正數時退回單一批次(不無限迴圈)", () => {
    expect(chunkReportItems([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
  });
});

// Info: (20260731 - Tzuhan) 實測踩過的坑:為了滿足型別而填 metersPerPixel: 0,
// Info: (20260731 - Tzuhan) 而 API validator 要求正數 → 整批匯出被 400 擋掉。
// Info: (20260731 - Tzuhan) 「沒有比例尺」只是少一個刻度,「送出 0」卻讓整批報告拿不到。
describe("比例尺數值的收斂", () => {
  const captureWith = (metersPerPixel: number) =>
    new Map([
      [
        buildMapImageKey(0, "sea"),
        {
          overview: { dataUrl: "data:image/jpeg;base64,AAAA", metersPerPixel },
          legs: [{ dataUrl: "data:image/jpeg;base64,BBBB", metersPerPixel }],
        },
      ],
    ]);

  const build = (metersPerPixel: number) =>
    buildReportPdfItems({
      results: [crossSeaItem],
      indices: [0],
      selectedPlans: new Set(["sea"]),
      fallbackWeightKg: 1000,
      mapCaptures: captureWith(metersPerPixel),
    });

  it("0 或負數轉為 undefined,不送出無效值", () => {
    expect(build(0)[0].metersPerPixel).toBeUndefined();
    expect(build(0)[0].legs[0].metersPerPixel).toBeUndefined();
    expect(build(-3)[0].metersPerPixel).toBeUndefined();
  });

  it("非有限值一律丟棄", () => {
    expect(build(Number.NaN)[0].metersPerPixel).toBeUndefined();
    expect(build(Number.POSITIVE_INFINITY)[0].metersPerPixel).toBeUndefined();
  });

  it("正常值保留", () => {
    expect(build(42.5)[0].metersPerPixel).toBe(42.5);
  });

  it("即使比例尺無效,載荷仍通過 API validator(整批不會被 400 擋掉)", () => {
    const parsed = LogisticsReportPdfRequestSchema.safeParse({
      reports: build(0),
    });
    expect(parsed.success).toBe(true);
  });
});
