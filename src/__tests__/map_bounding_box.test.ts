// Info: (20260731 - Tzuhan) 地圖 bbox 的跨換日線行為(issue 08 實測回報:「路線超出邊界」)
// Info: (20260731 - Tzuhan) 這不是圖資限制而是計算錯誤:splitAtAntimeridian 把跨 ±180° 的路徑
// Info: (20260731 - Tzuhan) 切成兩段後,對經度取天真 min/max 會得到跨度 360 度的全球 bbox。

import { describe, it, expect } from "@jest/globals";
import { getMapBoundingBox } from "@/lib/utils/map_bounding_box";

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
