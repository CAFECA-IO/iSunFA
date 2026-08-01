// Info: (20260731 - Tzuhan) 地圖 bbox 的跨換日線行為(issue 08 實測回報:「路線超出邊界」)
// Info: (20260731 - Tzuhan) 這不是圖資限制而是計算錯誤:splitAtAntimeridian 把跨 ±180° 的路徑
// Info: (20260731 - Tzuhan) 切成兩段後,對經度取天真 min/max 會得到跨度 360 度的全球 bbox。

import { describe, it, expect } from "@jest/globals";
import { getMapBoundingBox } from "@/lib/utils/map_bounding_box";
import {
  assessMercatorScale,
  buildScaleBar,
  computeRenderedMapSizeMm,
  haversineMeters,
  MercatorScaleVerdictEnum,
  ScaleBarOmissionEnum,
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
  /**
   * Info: (20260801 - Luphia) 一律帶緯度界:Mercator 檢驗是必經關卡,
   * 缺緯度界即不畫。此處用台北都會的窄跨幅,確保檢驗判為 UNIFORM 而不干擾長度斷言。
   */
  const local = { latSouthDeg: 25.02, latNorthDeg: 25.09 };
  const bar = (
    metersPerPixel: number | undefined,
    captureWidthPx: number | undefined,
    renderedWidthMm: number,
  ) =>
    buildScaleBar({
      metersPerPixel,
      captureWidthPx,
      renderedWidthMm,
      ...local,
    });

  it("取 1/2/5 × 10^n 的整數距離(比例尺要能心算)", () => {
    const result = bar(30, 800, 93.5);
    expect(result.drawn).toBe(true);
    if (!result.drawn) return;
    expect(result.bar.label).toBe("5 km");
    expect(result.bar.widthMm).toBeCloseTo(19.48, 2);
    // Info: (20260801 - Luphia) 跨幅均勻時不標參考緯線,以免暗示額外精確度
    expect(result.bar.referenceLatitudeDeg).toBeUndefined();
  });

  it("小尺度改用公尺", () => {
    const result = bar(0.5, 800, 93.5);
    expect(result.drawn && result.bar.label).toBe("100 m");
  });

  it("大尺度取到百公里級", () => {
    const result = bar(2000, 800, 190);
    expect(result.drawn && result.bar.label).toBe("500 km");
  });

  /**
   * Info: (20260801 - Luphia) 「最近」必須以比值而非差值判定。
   * 1/2/5 是等比數列,差值會把 2 與 5 的分界放在 3.5 而非幾何平均 √10≈3.162。
   */
  it("好數字以幾何距離取最近,不以算術差值", () => {
    const result = bar(41.25, 800, 190);
    expect(result.drawn && result.bar.label).toBe("10 km");
  });

  it("線段長度落在圖寬的 15.8% ~ 39.5%", () => {
    [0.2, 1, 30, 500, 5000].forEach((mpp) => {
      const result = bar(mpp, 800, 190);
      expect(result.drawn).toBe(true);
      if (!result.drawn) return;
      expect(result.bar.widthMm).toBeGreaterThan(190 * 0.158);
      expect(result.bar.widthMm).toBeLessThanOrEqual(190 * 0.395);
    });
  });

  /**
   * Info: (20260801 - Luphia) 直向的逐段小圖是實測回報「比例尺過短」的現場。
   * 舊演算法在此選到 500m、線段 5.08mm —— 比它自己的標籤還短。
   */
  it("窄圖上的線段仍長於其標籤(過短的回歸測試)", () => {
    const result = bar(8.7, 420, 37.15);
    expect(result.drawn).toBe(true);
    if (!result.drawn) return;
    expect(result.bar.label).toBe("1 km");
    expect(result.bar.widthMm).toBeCloseTo(10.17, 2);
    expect(result.bar.widthMm).toBeGreaterThan(7);
  });

  it("同一張截圖在不同紙面寬度下長度等比縮放", () => {
    const full = bar(30, 800, 190);
    const half = bar(30, 800, 95);
    expect(full.drawn && half.drawn).toBe(true);
    if (!full.drawn || !half.drawn) return;
    expect(full.bar.label).toBe(half.bar.label);
    expect(full.bar.widthMm).toBeCloseTo(half.bar.widthMm * 2, 2);
  });

  it("輸入不足時回報 MISSING_INPUT 而非畫錯的線", () => {
    [
      bar(undefined, 800, 190),
      bar(0, 800, 190),
      bar(-5, 800, 190),
      bar(Number.NaN, 800, 190),
      bar(30, undefined, 190),
      bar(30, 0, 190),
      bar(30, 800, 0),
      // Info: (20260801 - Luphia) 缺緯度界時無從驗證單一比例尺是否成立,不猜
      buildScaleBar({
        metersPerPixel: 30,
        captureWidthPx: 800,
        renderedWidthMm: 190,
      }),
    ].forEach((result) => {
      expect(result.drawn).toBe(false);
      if (result.drawn) return;
      expect(result.reason).toBe(ScaleBarOmissionEnum.MISSING_INPUT);
    });
  });

  /**
   * Info: (20260801 - Luphia) 實測現場:R01-AIR 報告的空運段從台北(25.07°N)
   * 到曼徹斯特(53.35°N),圖面跨越約 0~65°N。一條標示 2000 km 的線段在台北端
   * 實際代表 2,148 km、在曼徹斯特端只有 1,416 km —— 相差 52%。
   * 修好長度與位置之後,那條仍然不準的線反而更容易被當成可信的量測依據。
   */
  it("跨緯度過大時不畫,並回報原因供報告揭露", () => {
    const result = buildScaleBar({
      metersPerPixel: 15000,
      captureWidthPx: 800,
      renderedWidthMm: 190,
      latSouthDeg: 0,
      latNorthDeg: 65,
    });
    expect(result.drawn).toBe(false);
    if (result.drawn) return;
    expect(result.reason).toBe(ScaleBarOmissionEnum.LATITUDE_SPAN_TOO_WIDE);
  });

  it("比例中度變化時仍畫,但標註參考緯線", () => {
    // Info: (20260801 - Luphia) 30~45°N:比值 cos30/cos45 = 1.225,落在 1.05~1.5
    const result = buildScaleBar({
      metersPerPixel: 500,
      captureWidthPx: 800,
      renderedWidthMm: 190,
      latSouthDeg: 30,
      latNorthDeg: 45,
    });
    expect(result.drawn).toBe(true);
    if (!result.drawn) return;
    expect(result.bar.referenceLatitudeDeg).toBeCloseTo(37.5, 5);
  });
});

/**
 * Info: (20260801 - Luphia) Mercator 比例評估。這是先前所有比例尺修正都漏掉的一層:
 * 線段長度與位置都對了,但比例本身隨緯度變化,單一比例尺在跨緯度圖上不成立。
 */
describe("assessMercatorScale", () => {
  it("同都會範圍判為均勻", () => {
    const result = assessMercatorScale(25.02, 25.09);
    expect(result?.verdict).toBe(MercatorScaleVerdictEnum.UNIFORM);
    expect(result?.ratio).toBeLessThan(1.01);
  });

  it("台北到曼徹斯特的航段判為不成立", () => {
    // Info: (20260801 - Luphia) 兩端 25.07 / 53.35,比值 cos25.07/cos53.35 = 1.517
    const result = assessMercatorScale(25.0672, 53.3494);
    expect(result?.verdict).toBe(MercatorScaleVerdictEnum.INVALID);
    expect(result?.ratio).toBeCloseTo(1.517, 2);
  });

  it("中度跨幅判為近似並取視野中心為參考緯線", () => {
    const result = assessMercatorScale(30, 45);
    expect(result?.verdict).toBe(MercatorScaleVerdictEnum.APPROXIMATE);
    expect(result?.referenceLatitudeDeg).toBeCloseTo(37.5, 5);
  });

  /**
   * Info: (20260801 - Luphia) 跨越赤道時圖內含 |φ|=0,最小比例固定為 1。
   * 若誤取兩界絕對值的較小者,-10~40 會算成 cos10/cos40 = 1.285(近似),
   * 實際應為 cos0/cos40 = 1.305 —— 判定會因此偏鬆。
   */
  it("跨越赤道時以赤道為最小比例", () => {
    const result = assessMercatorScale(-10, 40);
    expect(result?.ratio).toBeCloseTo(1 / Math.cos((40 * Math.PI) / 180), 4);
  });

  it("南半球與北半球對稱", () => {
    const north = assessMercatorScale(20, 35);
    const south = assessMercatorScale(-35, -20);
    expect(south?.ratio).toBeCloseTo(north?.ratio as number, 6);
    expect(south?.verdict).toBe(north?.verdict);
  });

  it.each([
    ["緯度界缺漏", undefined, 40],
    ["南界缺漏", 10, undefined],
    ["非有限數", Number.NaN, 40],
    ["超出 Mercator 上界", 10, 88],
    ["南北顛倒", 50, 10],
  ])("%s 時回 null", (_label, south, north) => {
    expect(assessMercatorScale(south, north)).toBeNull();
  });
});

/**
 * Info: (20260801 - Luphia) 紙面尺寸必須由 TypeScript 算出而非交給 object-fit:
 * 交給 CSS 的話縮放結果只存在瀏覽器內部,HTML 產生端無從得知,
 * 疊在圖上的比例尺就只能用容器尺寸去猜 —— 那正是「比例尺跑到留白區」的成因。
 */
describe("computeRenderedMapSizeMm", () => {
  it("寬度受限時填滿容器寬並依長寬比決定高度", () => {
    // Info: (20260801 - Luphia) 2:1 的寬圖,190mm 寬 → 95mm 高,未觸及上限
    expect(computeRenderedMapSizeMm(800, 400, 190, 200)).toEqual({
      widthMm: 190,
      heightMm: 95,
    });
  });

  it("高度受限時改由高度上限反推寬度(絕不留白)", () => {
    // Info: (20260801 - Luphia) 1:2 的高圖,填滿 190mm 寬會高達 380mm,故由 70mm 反推 35mm
    expect(computeRenderedMapSizeMm(400, 800, 190, 70)).toEqual({
      widthMm: 35,
      heightMm: 70,
    });
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
