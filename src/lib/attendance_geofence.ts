import { calculateDistanceKm } from "@/lib/utils/geo";

/**
 * Info: (20260813 - Julian) 地理圍欄判定。純函數，不碰資料庫。
 *
 * ## 為什麼在伺服器算（護欄 G2）
 *
 * 瀏覽器回報的座標可以被竄改 —— DevTools 的 Sensors 面板可以直接覆寫
 * `geolocation`，那是官方功能，不需要任何攻擊技巧。因此 client 只負責回報座標，
 * 「在不在圍欄內」一律由這裡判斷。這與 CLAUDE.md §7 對 LLM 的立場同構：
 * 永遠不直接採信客戶端數值。
 *
 * ## 取距離最小者而不是第一個命中
 *
 * 圍欄可能重疊（同一棟樓的兩間辦公室、相鄰的兩個工區）。取最近的才是正確歸屬，
 * 而正確歸屬決定了「這個人算在哪個工地的現場人數裡」。
 * Demo 的 seed 會斷言圍欄不重疊，但這一行不依賴那個前提。
 *
 * ## 已知限制：圓形圍欄對線形工程不合用
 *
 * ToDo: (20260813 - Julian) 道路、管線這類沿線分布的工程，用一個圓涵蓋
 * 3 公里的路段需要 1.5 公里以上的半徑，而那個圓會把沿線兩側大片與工程無關的
 * 區域都算成工地。正解是沿中心線的帶狀範圍（PostGIS `ST_DWithin`），
 * 那是母計畫 §13.2 的升級路徑之一。
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
 *
 * **即使沒有任何圍欄命中也回傳最近的那一個**（`inside: false`）——
 * 呼叫端需要它來組出「距台北港工區 3.2 公里」這種訊息。
 * 一個只回 null 的介面會逼呼叫端自己再算一次距離，而那份重算會走樣。
 *
 * 候選清單為空時回 null：那代表帳本還沒設定任何打卡地點，是設定問題不是位置問題。
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
 * Info: (20260813 - Julian) 是否**確定**在圍欄外 —— 用來決定打卡鈕要不要 disable。
 *
 * ## 為什麼不是直接看 `inside`
 *
 * `inside` 比較的是「回報的座標」與圓心的距離，而那個座標帶著誤差。
 * 定位精度 35 公尺、圍欄半徑 60 公尺時，一個**真的站在圈內**的人可能被回報成
 * 距中心 70 公尺 —— 若照 `inside` 直接 disable，他會被鎖在門外，
 * 而且畫面上沒有任何辦法可以讓伺服器來裁決。**那是把估算值當成判決。**
 *
 * 因此只有「距離扣掉誤差之後仍然超出半徑」才算確定在外面。
 * 誤差範圍內的曖昧地帶維持可按 —— 按下去由伺服器判定（護欄 G2），
 * 而伺服器拒絕時回的是「距工區 340 公尺」這種看得懂的話。
 *
 * ## 這條規則的兩端各自服務誰
 *
 * - **確定在外面 → disable**：省下一次注定失敗的點擊，這是使用者要的
 * - **不確定 → 可按**：不讓前端的估算誤差變成一道打不開的門，這是出勤紀錄要的
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
