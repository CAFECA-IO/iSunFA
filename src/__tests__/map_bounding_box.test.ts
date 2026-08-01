// Info: (20260731 - Tzuhan) 地圖 bbox 的跨換日線行為(issue 08 實測回報:「路線超出邊界」)
// Info: (20260731 - Tzuhan) 這不是圖資限制而是計算錯誤:splitAtAntimeridian 把跨 ±180° 的路徑
// Info: (20260731 - Tzuhan) 切成兩段後,對經度取天真 min/max 會得到跨度 360 度的全球 bbox。

import { describe, it, expect } from "@jest/globals";
import { getMapBoundingBox } from "@/lib/utils/map_bounding_box";
import { buildScaleBar, haversineMeters } from "@/lib/utils/map_scale_bar";

describe("getMapBoundingBox", () => {
  it("一般路線取實際範圍", () => {
    const bbox = getMapBoundingBox({
      type: "LineString",
      coordinates: [
        [121.5, 25.0],
        [120.3, 22.6],
      ],
    });
    expect(bbox).not.toBeNull();
    expect(bbox?.[0][0]).toBeCloseTo(120.3, 5);
    expect(bbox?.[1][0]).toBeCloseTo(121.5, 5);
  });

  it("跨換日線的路徑不再產生全球 bbox(檀香山 → 東京)", () => {
    // Info: (20260731 - Tzuhan) splitAtAntimeridian 後的實際形狀:兩段各自貼齊 ±180
    const bbox = getMapBoundingBox({
      type: "MultiLineString",
      coordinates: [
        [
          [-157.8, 21.3],
          [-180, 25.0],
        ],
        [
          [180, 25.0],
          [139.7, 35.6],
        ],
      ],
    });
    expect(bbox).not.toBeNull();
    const span = (bbox as number[][])[1][0] - (bbox as number[][])[0][0];
    // Info: (20260731 - Tzuhan) 該航程實際經度跨度為 62.5 度;修正前會得到 360 度
    expect(span).toBeLessThan(90);
    expect(span).toBeGreaterThan(40);
  });

  it("真正的東西向長程不被誤判位移(倫敦 → 東京,不跨換日線)", () => {
    const bbox = getMapBoundingBox({
      type: "LineString",
      coordinates: [
        [-0.1, 51.5],
        [139.7, 35.6],
      ],
    });
    const span = (bbox as number[][])[1][0] - (bbox as number[][])[0][0];
    // Info: (20260731 - Tzuhan) 位移後跨度會更大(220 > 139.8),故應維持原 bbox
    expect(span).toBeCloseTo(139.8, 1);
  });

  it("起終點極近時給出可縮放的最小 bbox(避免 fitBounds 失敗)", () => {
    const bbox = getMapBoundingBox({
      type: "LineString",
      coordinates: [
        [121.5, 25.0],
        [121.5, 25.0],
      ],
    });
    expect((bbox as number[][])[1][0]).toBeGreaterThan(
      (bbox as number[][])[0][0],
    );
    expect((bbox as number[][])[1][1]).toBeGreaterThan(
      (bbox as number[][])[0][1],
    );
  });

  it("空幾何回 null(呼叫端據此不做 fitBounds)", () => {
    expect(getMapBoundingBox(null)).toBeNull();
    expect(
      getMapBoundingBox({ type: "FeatureCollection", features: [] }),
    ).toBeNull();
  });
});

// Info: (20260731 - Tzuhan) 比例尺:報告需要它才能作為證據 —— 沒有比例尺,讀者無法判斷
// Info: (20260731 - Tzuhan) 圖上那條線是 5 公里還是 500 公里,也就無法回頭驗證距離欄的數字。
describe("buildScaleBar", () => {
  it("取 1/2/5 × 10^n 的整數距離(比例尺要能心算)", () => {
    // Info: (20260731 - Tzuhan) 348px 寬、每像素 30m → 目標約 2,610m → 應取 2 km
    const bar = buildScaleBar(30, 348);
    expect(bar?.label).toBe("2 km");
    // Info: (20260731 - Tzuhan) 2000m / 30 = 66.7px
    expect(bar?.widthPx).toBe(67);
  });

  it("小尺度改用公尺", () => {
    // Info: (20260731 - Tzuhan) 348px × 0.25 × 0.5m = 43.5m 目標 → 取不超過的最大好數字 20m
    expect(buildScaleBar(0.5, 348)?.label).toBe("20 m");
  });

  it("大尺度取到百公里級", () => {
    expect(buildScaleBar(2000, 718)?.label).toBe("200 km");
  });

  it("比例尺長度不超過圖寬(否則會蓋住路線)", () => {
    [0.2, 1, 30, 500, 5000].forEach((mpp) => {
      const bar = buildScaleBar(mpp, 718);
      expect(bar).not.toBeNull();
      expect((bar as { widthPx: number }).widthPx).toBeLessThanOrEqual(718);
    });
  });

  it("無效的每像素公尺數一律不畫(錯的比例尺比沒有更糟)", () => {
    expect(buildScaleBar(undefined, 718)).toBeNull();
    expect(buildScaleBar(0, 718)).toBeNull();
    expect(buildScaleBar(-5, 718)).toBeNull();
    expect(buildScaleBar(Number.NaN, 718)).toBeNull();
    expect(buildScaleBar(30, 0)).toBeNull();
  });
});

describe("haversineMeters", () => {
  it("赤道上一度約 111 公里", () => {
    expect(haversineMeters(0, 0, 0, 1) / 1000).toBeCloseTo(111.2, 0);
  });

  it("同一點為零", () => {
    expect(haversineMeters(25.03, 121.56, 25.03, 121.56)).toBe(0);
  });
});
