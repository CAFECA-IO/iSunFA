import { calculateDistanceKm } from "@/lib/utils/geo";

/**
 * Info: (20260813 - Julian) 地理圍欄判定。純函數，不碰資料庫；「在不在圍欄內」一律由伺服器判斷，
 * 不採信客戶端回報的座標（護欄 G2）。取距離最近的圍欄而非第一個命中，決定歸屬。
 *
 * ToDo: (20260813 - Julian) 圓形圍欄不適用線形工程（道路、管線），需改用沿中心線的
 * 帶狀範圍（PostGIS `ST_DWithin`），見母計畫 §13.2。
 */

export interface IGeofenceCandidate {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface IGeofenceMatch {
  location: IGeofenceCandidate;
  distanceMeters: number;
  /** Info: (20260813 - Julian) 是否落在半徑內。false 代表這只是「最近的一個」 */
  inside: boolean;
}

// Info: (20260813 - Julian) 公尺是整數就夠了：GPS 誤差以十公尺計，小數位沒有意義
const toMeters = (kilometres: number): number => Math.round(kilometres * 1000);

/**
 * Info: (20260813 - Julian) 找出距離最近的地點，並標明是否落在它的半徑內。
 * 即使沒有圍欄命中也回傳最近的那一個（`inside: false`），供組出「距工區 3.2 公里」的訊息。
 * 候選清單為空時回 null（尚未設定打卡地點，是設定問題不是位置問題）。
 */
export function findNearestGeofence(
  latitude: number,
  longitude: number,
  candidates: IGeofenceCandidate[],
): IGeofenceMatch | null {
  if (candidates.length === 0) return null;

  const measured = candidates.map((location) => ({
    location,
    distanceMeters: toMeters(
      calculateDistanceKm(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      ),
    ),
  }));

  const nearest = measured.reduce((best, current) =>
    current.distanceMeters < best.distanceMeters ? current : best,
  );

  return {
    ...nearest,
    // Info: (20260813 - Julian) 邊界含在內：剛好站在半徑上的人算到了，不算沒到
    inside: nearest.distanceMeters <= nearest.location.radiusMeters,
  };
}

/**
 * Info: (20260813 - Julian) 是否**確定**在圍欄外，用來決定打卡鈕要不要 disable。
 * 判準：距離扣掉定位誤差後仍超出半徑，才算確定在外面；誤差範圍內維持可按，
 * 交由伺服器判定（護欄 G2）。直接用 `inside` 會讓定位誤差鎖住真的站在圈內的人。
 */
export function isDefinitelyOutside(
  match: IGeofenceMatch | null,
  accuracyMeters: number | null,
): boolean {
  if (!match || match.inside) return false;

  // Info: (20260813 - Julian) 沒有精度資訊時視為 0：不替使用者放寬，也不額外收緊
  const tolerance = accuracyMeters && accuracyMeters > 0 ? accuracyMeters : 0;
  return match.distanceMeters - tolerance > match.location.radiusMeters;
}
