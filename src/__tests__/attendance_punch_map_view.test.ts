import { describe, it, expect } from "@jest/globals";
import {
  accuracyCircleFeature,
  buildPunchGeofenceFeatures,
  punchMapBounds,
} from "@/lib/utils/attendance_punch_map_view";
import { IWorkLocationSummary } from "@/interfaces/attendance";
import { calculateDistanceKm } from "@/lib/utils/geo";

/**
 * Info: (20260813 - Julian) 打卡頁地圖的純計算。
 *
 * 最值得守的是 `punchMapBounds`：**圍欄與使用者必須同時入鏡**。
 * 破掉的症狀是站在三公里外時，圖上只看得到圈、看不到自己 ——
 * 而那正好是 P2 演示最關鍵的一幕，文字說「距工區 3.2 公里」，圖卻在說別的事。
 */

const SITE: IWorkLocationSummary = {
  id: "loc-a",
  code: "LOC-A",
  name: "大漢溪橋梁工區",
  latitude: 25.0,
  longitude: 121.5,
  radiusMeters: 500,
};

const FAR: IWorkLocationSummary = {
  id: "loc-b",
  code: "LOC-B",
  name: "台北港工區",
  latitude: 25.15,
  longitude: 121.38,
  radiusMeters: 500,
};

const within =
  ([[minLng, minLat], [maxLng, maxLat]]: [
    [number, number],
    [number, number],
  ]) =>
  (lng: number, lat: number) =>
    lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;

describe("圍欄多邊形", () => {
  it("每個地點各一個多邊形，最近的那一個標記為 nearest", () => {
    const features = buildPunchGeofenceFeatures([SITE, FAR], SITE.id);

    expect(features.features).toHaveLength(2);
    expect(features.features[0].properties?.nearest).toBe(true);
    expect(features.features[1].properties?.nearest).toBe(false);
  });

  it("沒有最近地點時沒有任何一個被標記", () => {
    const features = buildPunchGeofenceFeatures([SITE, FAR], null);
    expect(
      features.features.every(
        (feature) => feature.properties?.nearest === false,
      ),
    ).toBe(true);
  });

  /**
   * Info: (20260813 - Julian) 圓要是**真的** 500 公尺。
   *
   * 這條測試擋的是「改用 maplibre 的 circle 圖層」這種看似等價的重構 ——
   * 那個圖層的半徑單位是螢幕像素，縮放時圈的實際涵蓋範圍會跟著變，
   * 而這個圓要回答的正是「我站在這裡打不打得到卡」。
   */
  it("多邊形頂點確實落在半徑上（誤差 1% 以內）", () => {
    const [feature] = buildPunchGeofenceFeatures([SITE], SITE.id).features;
    const ring = (feature.geometry as GeoJSON.Polygon).coordinates[0];

    ring.forEach(([lng, lat]) => {
      const metres =
        calculateDistanceKm(SITE.latitude, SITE.longitude, lat, lng) * 1000;
      expect(Math.abs(metres - SITE.radiusMeters)).toBeLessThan(
        SITE.radiusMeters * 0.01,
      );
    });
  });
});

describe("精度圈", () => {
  it("沒有定位時是空的集合，不是 null", () => {
    expect(accuracyCircleFeature(null).features).toHaveLength(0);
  });

  it("精度為 0 時不畫 —— 一個半徑為零的圓只會變成畫面上的一個雜點", () => {
    expect(
      accuracyCircleFeature({
        latitude: 25,
        longitude: 121.5,
        accuracyMeters: 0,
      }).features,
    ).toHaveLength(0);
  });

  it("有定位時畫在使用者座標上，半徑等於精度", () => {
    const [feature] = accuracyCircleFeature({
      latitude: 25,
      longitude: 121.5,
      accuracyMeters: 30,
    }).features;
    const ring = (feature.geometry as GeoJSON.Polygon).coordinates[0];
    const metres =
      calculateDistanceKm(25, 121.5, ring[0][1], ring[0][0]) * 1000;

    expect(Math.abs(metres - 30)).toBeLessThan(1);
  });
});

describe("地圖視野", () => {
  it("框住的是圍欄外緣，不是圓心", () => {
    const bounds = punchMapBounds(SITE, null);
    expect(bounds).not.toBeNull();

    const contains = within(bounds!);
    // Info: (20260813 - Julian) 圓心正北 500 公尺處必須入鏡
    expect(contains(SITE.longitude, SITE.latitude + 500 / 111_320)).toBe(true);
  });

  /**
   * Info: (20260813 - Julian) 這是本檔最重要的一條。
   */
  it("人在三公里外時，圍欄與人同時入鏡", () => {
    const far = { latitude: 25.027, longitude: 121.5, accuracyMeters: 25 };
    const bounds = punchMapBounds(SITE, far);
    const contains = within(bounds!);

    expect(contains(far.longitude, far.latitude)).toBe(true);
    expect(contains(SITE.longitude, SITE.latitude)).toBe(true);
  });

  it("人就站在圓心上時，視野不會退化成一個點", () => {
    const bounds = punchMapBounds(SITE, {
      latitude: SITE.latitude,
      longitude: SITE.longitude,
      accuracyMeters: 10,
    })!;

    expect(bounds[1][0] - bounds[0][0]).toBeGreaterThan(0.003);
    expect(bounds[1][1] - bounds[0][1]).toBeGreaterThan(0.003);
  });

  it("還沒定位時仍然框得出圍欄 —— 地圖不必等定位就能顯示工區在哪", () => {
    expect(punchMapBounds(SITE, null)).not.toBeNull();
  });

  it("兩者都沒有時回 null，由呼叫端決定不要渲染", () => {
    expect(punchMapBounds(null, null)).toBeNull();
  });
});
