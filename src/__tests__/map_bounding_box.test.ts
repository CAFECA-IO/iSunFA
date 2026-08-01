// Info: (20260731 - Tzuhan) 地圖 bbox 的跨換日線行為(issue 08 實測回報:「路線超出邊界」)
// Info: (20260731 - Tzuhan) 這不是圖資限制而是計算錯誤:splitAtAntimeridian 把跨 ±180° 的路徑
// Info: (20260731 - Tzuhan) 切成兩段後,對經度取天真 min/max 會得到跨度 360 度的全球 bbox。

import { describe, it, expect } from "@jest/globals";
import { getMapBoundingBox } from "@/lib/utils/map_bounding_box";
import {
  buildScaleBar,
  computeRenderedMapSizeMm,
  haversineMeters,
} from "@/lib/utils/map_scale_bar";

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
//
// Info: (20260801 - Luphia) 契約已改:長度以 mm 表示,且必須同時給 metersPerPixel 與截圖寬度。
// Info: (20260801 - Luphia) 舊版只給「每像素公尺數」與「版面寬度」,兩者不同基準,算出的長度本身就是錯的。
describe("buildScaleBar", () => {
  // Info: (20260801 - Luphia) 800px 寬、每像素 30m → 全圖跨 24,000m,目標 6,000m → 取 5 km
  // Info: (20260801 - Luphia) 紙面 93.5mm 對應 24,000m,故 5,000m 應為 19.48mm
  it("取 1/2/5 × 10^n 的整數距離(比例尺要能心算)", () => {
    const bar = buildScaleBar(30, 800, 93.5);
    expect(bar?.label).toBe("5 km");
    expect(bar?.widthMm).toBeCloseTo(19.48, 2);
  });

  it("小尺度改用公尺", () => {
    // Info: (20260801 - Luphia) 800px × 0.5m = 400m 全跨 → 目標 100m → 取 100m
    expect(buildScaleBar(0.5, 800, 93.5)?.label).toBe("100 m");
  });

  it("大尺度取到百公里級", () => {
    // Info: (20260801 - Luphia) 800px × 2000m = 1,600km 全跨 → 目標 400km → 最近的好數字為 500km
    expect(buildScaleBar(2000, 800, 190)?.label).toBe("500 km");
  });

  /**
   * Info: (20260801 - Luphia) 「最近」必須以比值而非差值判定。
   * 1/2/5 是等比數列,差值會把 2 與 5 的分界放在 3.5 而非幾何平均 √10≈3.162。
   * 此案例的目標正好落在兩者之間:差值判定會選 2(較短),比值判定選 5。
   */
  it("好數字以幾何距離取最近,不以算術差值", () => {
    // Info: (20260801 - Luphia) 800px × 41.25m = 33,000m 全跨 → 目標 8,250m
    // Info: (20260801 - Luphia) 8250 距 5000 的比值為 1.65、距 10000 為 1.21 → 應取 10 km
    expect(buildScaleBar(41.25, 800, 190)?.label).toBe("10 km");
  });

  /**
   * Info: (20260801 - Luphia) 這是先前線段只剩幾公釐的回歸測試。
   * 成因是 CSS 的百分比對「最近的定位祖先」求值,而那是收縮包住文字的標籤盒,不是地圖。
   * 改以 mm 表示後,線段長度必須真的落在圖寬的四分之一附近(取好數字後會略短但同數量級),
   * 絕不會退化成個位數毫米。
   */
  it("線段長度為圖寬的可觀比例,不會退化成幾公釐", () => {
    [0.2, 1, 30, 500, 5000].forEach((mpp) => {
      const bar = buildScaleBar(mpp, 800, 190);
      expect(bar).not.toBeNull();
      const { widthMm } = bar as { widthMm: number };
      // Info: (20260801 - Luphia) 取最近好數字的結果必落在圖寬的 15.8% ~ 39.5%
      expect(widthMm).toBeGreaterThan(190 * 0.158);
      expect(widthMm).toBeLessThanOrEqual(190 * 0.395);
    });
  });

  /**
   * Info: (20260801 - Luphia) 直向的逐段小圖是實測回報「比例尺過短」的現場。
   * 紙面只有 37.15mm 寬,舊的「不超過目標的最大好數字」在此選到 500m,
   * 線段 5.08mm —— 比它自己的 "500 m" 標籤還短,讀不出刻度。
   */
  it("窄圖上的線段仍長於其標籤(過短的回歸測試)", () => {
    const bar = buildScaleBar(8.7, 420, 37.15);
    expect(bar?.label).toBe("1 km");
    expect(bar?.widthMm).toBeCloseTo(10.17, 2);
    // Info: (20260801 - Luphia) 6.5pt 的 "1 km" 約 7mm 寬,線段至少要比它長才讀得出來
    expect((bar as { widthMm: number }).widthMm).toBeGreaterThan(7);
  });

  /**
   * Info: (20260801 - Luphia) 同一張圖印在兩種版面時,線段長度必須依紙面寬度等比縮放,
   * 而不是兩者相同。先前逐段小圖與全程圖共用錯誤基準,長度差一倍卻沒被發現。
   */
  it("同一張截圖在不同紙面寬度下長度等比縮放", () => {
    const full = buildScaleBar(30, 800, 190);
    const half = buildScaleBar(30, 800, 95);
    expect(full?.label).toBe(half?.label);
    expect((full as { widthMm: number }).widthMm).toBeCloseTo(
      (half as { widthMm: number }).widthMm * 2,
      2,
    );
  });

  it("無效輸入一律不畫(錯的比例尺比沒有更糟)", () => {
    expect(buildScaleBar(undefined, 800, 190)).toBeNull();
    expect(buildScaleBar(0, 800, 190)).toBeNull();
    expect(buildScaleBar(-5, 800, 190)).toBeNull();
    expect(buildScaleBar(Number.NaN, 800, 190)).toBeNull();
    // Info: (20260801 - Luphia) 缺截圖寬度時無從得知全圖跨距,不猜
    expect(buildScaleBar(30, undefined, 190)).toBeNull();
    expect(buildScaleBar(30, 0, 190)).toBeNull();
    expect(buildScaleBar(30, 800, 0)).toBeNull();
  });
});

/**
 * Info: (20260801 - Luphia) 紙面尺寸必須由 TypeScript 算出而非交給 object-fit:
 * 交給 CSS 的話縮放結果只存在瀏覽器內部,HTML 產生端無從得知,
 * 疊在圖上的比例尺就只能用容器尺寸去猜 —— 那正是「比例尺跑到留白區」的成因。
 */
describe("computeRenderedMapSizeMm", () => {
  it("寬度受限時填滿容器寬並依長寬比決定高度", () => {
    // Info: (20260801 - Luphia) 2:1 的寬圖,190mm 寬 → 95mm 高,未觸及 70mm 上限
    const size = computeRenderedMapSizeMm(800, 400, 190, 200);
    expect(size).toEqual({ widthMm: 190, heightMm: 95 });
  });

  it("高度受限時改由高度上限反推寬度(絕不留白)", () => {
    // Info: (20260801 - Luphia) 1:2 的高圖,若填滿 190mm 寬會高達 380mm,故由 70mm 反推 35mm 寬
    const size = computeRenderedMapSizeMm(400, 800, 190, 70);
    expect(size).toEqual({ widthMm: 35, heightMm: 70 });
  });

  it("正方形圖在方形上限下不變形", () => {
    const size = computeRenderedMapSizeMm(600, 600, 190, 70);
    expect(size?.widthMm).toBe(70);
    expect(size?.heightMm).toBe(70);
  });

  it("缺截圖尺寸時回 null,呼叫端據此不畫比例尺", () => {
    expect(computeRenderedMapSizeMm(undefined, 400, 190, 70)).toBeNull();
    expect(computeRenderedMapSizeMm(800, undefined, 190, 70)).toBeNull();
    expect(computeRenderedMapSizeMm(0, 400, 190, 70)).toBeNull();
    expect(computeRenderedMapSizeMm(800, Number.NaN, 190, 70)).toBeNull();
    expect(computeRenderedMapSizeMm(800, 400, 0, 70)).toBeNull();
    expect(computeRenderedMapSizeMm(800, 400, 190, 0)).toBeNull();
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
