import { describe, it, expect } from "@jest/globals";
import {
  findNearestGeofence,
  IGeofenceCandidate,
  isDefinitelyOutside,
} from "@/lib/attendance_geofence";

/**
 * Info: (20260813 - Julian) 地理圍欄判定。
 *
 * 這是整個 demo 最核心主張的唯一實作 —— 「人不在登記的地點就打不了卡」。
 * 因此半徑的三個點（內、外、剛好）都必須明確落在准或拒的一邊：
 * 站在半徑上的人到底算不算到，不能是「看實作怎麼寫」。
 */

// Info: (20260813 - Julian) 展示資料的大漢溪橋梁工區（座標為佔位值，演示前實測）
const SITE_A: IGeofenceCandidate = {
  id: "loc-a",
  name: "大漢溪橋梁改建工程 工區",
  latitude: 25.0,
  longitude: 121.45,
  radiusMeters: 500,
};

const HQ: IGeofenceCandidate = {
  id: "loc-hq",
  name: "工程處本部",
  latitude: 25.0128,
  longitude: 121.465,
  radiusMeters: 300,
};

/**
 * Info: (20260813 - Julian) 緯度每 0.001 度約 111 公尺。
 * 用緯度位移而不是經度：經度的每度距離隨緯度收縮，換算會多一層心算。
 */
const northOf = (
  location: IGeofenceCandidate,
  metres: number,
): [number, number] => [
  location.latitude + metres / 111_320,
  location.longitude,
];

// Info: (20260813 - Julian) 往南遠離：本部在工區的東北方，往北跑會愈跑愈接近它
const southOf = (
  location: IGeofenceCandidate,
  metres: number,
): [number, number] => [
  location.latitude - metres / 111_320,
  location.longitude,
];

describe("findNearestGeofence", () => {
  it("should return null when the account book has no work location at all", () => {
    expect(findNearestGeofence(25, 121.45, [])).toBeNull();
  });

  it("should report inside when standing at the centre", () => {
    const match = findNearestGeofence(SITE_A.latitude, SITE_A.longitude, [
      SITE_A,
    ]);

    expect(match?.inside).toBe(true);
    expect(match?.distanceMeters).toBe(0);
    expect(match?.location.id).toBe("loc-a");
  });

  it("should report inside well within the radius", () => {
    const [lat, lng] = northOf(SITE_A, 200);
    const match = findNearestGeofence(lat, lng, [SITE_A]);

    expect(match?.inside).toBe(true);
    expect(match?.distanceMeters).toBeLessThan(SITE_A.radiusMeters);
  });

  it("should report outside beyond the radius", () => {
    const [lat, lng] = northOf(SITE_A, 900);
    const match = findNearestGeofence(lat, lng, [SITE_A]);

    expect(match?.inside).toBe(false);
    expect(match?.distanceMeters).toBeGreaterThan(SITE_A.radiusMeters);
  });

  /**
   * Info: (20260813 - Julian) 邊界含在內：剛好站在半徑上的人**算到了**。
   *
   * 這個方向是刻意的 —— 誤擋的成本（員工站在工地上打不了卡）遠高於
   * 誤放的成本（多一公尺）。而 GPS 本身的誤差以十公尺計，
   * 在這裡糾結一公尺的開閉區間沒有物理意義，但行為必須是確定的。
   */
  it("should treat a point exactly on the radius as inside", () => {
    const tight: IGeofenceCandidate = { ...SITE_A, radiusMeters: 0 };
    const match = findNearestGeofence(tight.latitude, tight.longitude, [tight]);

    expect(match?.distanceMeters).toBe(0);
    expect(match?.inside).toBe(true);
  });

  /**
   * Info: (20260813 - Julian) 圍欄重疊時取**距離最小者**，不是第一個命中。
   *
   * 正確歸屬決定了「這個人算在哪個工地的現場人數裡」，
   * 而那個數字在緊急疏散時是要拿來對人頭的。
   */
  it("should pick the nearest location when two fences overlap", () => {
    const near: IGeofenceCandidate = { ...HQ, radiusMeters: 5000 };
    const far: IGeofenceCandidate = { ...SITE_A, radiusMeters: 5000 };
    const match = findNearestGeofence(HQ.latitude, HQ.longitude, [far, near]);

    expect(match?.location.id).toBe("loc-hq");
  });

  // Info: (20260813 - Julian) 全部都在圍欄外時仍回傳最近的一個，供組出「距 X 公尺」的訊息
  it("should still report the nearest location when every fence is missed", () => {
    const [lat, lng] = southOf(SITE_A, 3200);
    const match = findNearestGeofence(lat, lng, [SITE_A, HQ]);

    expect(match?.inside).toBe(false);
    expect(match?.location.name).toBe("大漢溪橋梁改建工程 工區");
    expect(match?.distanceMeters).toBeGreaterThan(3000);
  });

  // Info: (20260813 - Julian) 反經線與極區：Haversine 不該在這裡回 NaN
  it("should survive antimeridian and polar coordinates", () => {
    const pacific: IGeofenceCandidate = {
      id: "loc-x",
      name: "換日線",
      latitude: 0,
      longitude: 179.999,
      radiusMeters: 1000,
    };
    const match = findNearestGeofence(0, -179.999, [pacific]);

    expect(Number.isFinite(match?.distanceMeters)).toBe(true);
    expect(match?.inside).toBe(true);
  });
});

/**
 * Info: (20260813 - Julian) 打卡鈕要不要 disable。
 *
 * 這一組守的是**兩個方向都不能錯**：
 * 確定在外面卻讓人按，是浪費一次注定失敗的點擊；
 * 誤差範圍內就 disable，是把估算值當成判決 —— 而那會把真的站在工地上的人鎖在門外。
 */
describe("isDefinitelyOutside", () => {
  const match = (distanceMeters: number, radiusMeters = 60) => ({
    location: {
      id: "loc-a",
      name: "大漢溪橋梁工區",
      latitude: 25,
      longitude: 121.5,
      radiusMeters,
    } as IGeofenceCandidate,
    distanceMeters,
    inside: distanceMeters <= radiusMeters,
  });

  it("在圈內時一律回 false", () => {
    expect(isDefinitelyOutside(match(20), 35)).toBe(false);
  });

  it("沒有定位結果時回 false —— 那時該 disable 的理由是沒座標，不是在圈外", () => {
    expect(isDefinitelyOutside(null, 35)).toBe(false);
  });

  it("距離超出，但差距在定位誤差之內 → 仍可按，交給伺服器判", () => {
    // Info: (20260813 - Julian) 半徑 60、距離 70、精度 35 → 70−35=35 < 60
    expect(isDefinitelyOutside(match(70), 35)).toBe(false);
  });

  it("距離扣掉誤差之後仍然超出 → 確定在外面，disable", () => {
    // Info: (20260813 - Julian) 半徑 60、距離 120、精度 35 → 120−35=85 > 60
    expect(isDefinitelyOutside(match(120), 35)).toBe(true);
  });

  it("精度極差時幾乎不會 disable —— 那種座標本來就不該拿來下判斷", () => {
    expect(isDefinitelyOutside(match(500), 1000)).toBe(false);
  });

  it("沒有精度資訊時不替使用者放寬，也不額外收緊", () => {
    expect(isDefinitelyOutside(match(70), null)).toBe(true);
    expect(isDefinitelyOutside(match(60), null)).toBe(false);
  });
});
